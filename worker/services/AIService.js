const { generateText, generateObject } = require("ai");
const { openai } = require("@ai-sdk/openai");
const { z } = require("zod");
const { visualizationPrompt, agentConfidencePrompt, chatResponsePrompt } = require('./prompts/chat-prompts');

class AIService {
    constructor(supabase) {
        this.supabase = supabase;
        this.aiResponseInProgress = false;
        this.aiAgents = [];
        this.aiAgentIds = new Set();
    }

    async init() {
        await this.fetchAIAgents();
    }

    async fetchAIAgents() {
        try {
            const { data, error } = await this.supabase
                .from("agents")
                .select("*")
                .order("name");

            if (error) {
                console.error("Error fetching AI agents:", error);
                return;
            }

            if (data && data.length > 0) {
                this.aiAgents = data;
                this.aiAgentIds = new Set(data.map((agent) => agent.id));
                console.log(`Fetched ${this.aiAgents.length} AI agents`);
            } else {
                console.log("No AI agents found in the database");
            }
        } catch (error) {
            console.error("Error in fetchAIAgents:", error);
        }
    }

    async analyzeMessageForVisualizationIntent(message) {
        const visualizationKeywords = [
            "build", "create", "generate", "make", "show", "visualize", "display",
            "draw", "chart", "graph", "diagram", "map", "plot", "visualisation",
            "visualization", "dashboard", "ui", "interface", "design", "mockup",
            "prototype", "render", "play", "animate", "simulate", "illustrate",
            "depict", "add", "update", "change", "modify", "improve", "enhance",
            "optimize", "refine", "revise", "customize", "personalize", "tailor",
            "adjust", "transform", "evolve", "rework", "rebuild", "recreate",
            "remake", "reproduce", "reimagine", "rethink", "reconceptualize",
            "reengineer", "restructure", "reconfigure", "reorganize", "rearrange",
            "recompose", "reconstruct", "refactor", "can you", "could you",
            "suggest", "recommend"
        ];

        const messageText = message.content.toLowerCase();
        const keywordMatch = visualizationKeywords.some((keyword) =>
            messageText.includes(keyword)
        );

        let confidence = keywordMatch ? 0.5 : 0.1;

        if (keywordMatch) {
            try {
                const result = await generateObject({
                    model: openai.responses("gpt-4o"),
                    schema: z.object({
                        score: z.number()
                            .describe("A score from 0 to 100 indicating the likelihood that the user is requesting a visualization"),
                        reason: z.string()
                            .describe("A brief explanation of why this score was given"),
                    }),
                    prompt: `Analyze this message and determine if it's explicitly requesting something to be built, created, visualized, or generated.

Message: "${message.content}"

Return a score from 0 to 100 indicating the likelihood that the user is requesting a visualization, and a brief reason explaining why.`,
                    temperature: 0.1,
                });

                if (result && typeof result === "object") {
                    let score, reason;

                    if ("score" in result) {
                        score = result.score;
                        reason = result.reason;
                    } else if (result.object && typeof result.object === "object") {
                        score = result.object.score;
                        reason = result.object.reason;
                    } else if (result.analysis && typeof result.analysis === "object") {
                        score = result.analysis.score;
                        reason = result.analysis.reason;
                    }

                    if (typeof score === "number") {
                        confidence = score / 100;
                        console.log(`AI analysis of visualization intent: ${confidence * 100}% confidence. Reason: ${reason || "No reason provided"}`);
                    }
                }
            } catch (aiError) {
                console.error("Error getting AI analysis of message:", aiError);
            }
        }

        return confidence;
    }

    async selectAgent(roomId, messageHistory, lastUserMessage) {
        if (this.aiAgents.length === 0) return null;

        const { data: lastGeneration } = await this.supabase
            .from("chat_room_generations")
            .select()
            .eq("room_id", roomId)
            .order("created_at", { ascending: false })
            .limit(1);

        const lastGenerationHtml = lastGeneration?.[0]?.html;

        const prompt = agentConfidencePrompt
            .replace('${aiAgents}', JSON.stringify(this.aiAgents))
            .replace('${lastGenerationHtml}', lastGenerationHtml || '')
            .replace('${messageHistory}', messageHistory)
            .replace('${lastUserMessage.content}', lastUserMessage.content);

        const result = await generateObject({
            model: openai.responses("gpt-4o"),
            temperature: 0.1,
            schema: z.object({
                agents_confidence: z.array(
                    z.object({
                        agent_id: z.string(),
                        confidence: z.number(),
                    })
                ),
            }),
            prompt,
        });

        let selectedAgents = JSON.parse(result.response.body.output[0].text).agents_confidence;
        
        const highestConfidenceAgent = selectedAgents.reduce((prev, current) => 
            prev.confidence > current.confidence ? prev : current
        );

        return this.aiAgents.find(agent => agent.id === highestConfidenceAgent.agent_id);
    }

    async generateVisualization(roomId, messageHistory, lastUserMessage, expertAgentText) {
        const { data: lastGeneration } = await this.supabase
            .from("chat_room_generations")
            .select()
            .eq("room_id", roomId)
            .order("created_at", { ascending: false })
            .limit(1);

        const lastGenerationHtml = lastGeneration?.[0]?.html;

        const prompt = visualizationPrompt
            .replace('${lastGenerationHtml}', lastGenerationHtml || '')
            .replace('${messageHistory}', messageHistory)
            .replace('${expertAgentText}', expertAgentText);

        const { text: htmlContent } = await generateText({
            model: openai.responses("o3-mini"),
            prompt,
            maxTokens: 35500,
            temperature: 0.8,
        });

        return htmlContent;
    }

    async generateResponse(roomId, messageHistory, lastUserMessage, agentPrompt) {
        const { data: lastGeneration } = await this.supabase
            .from("chat_room_generations")
            .select()
            .eq("room_id", roomId)
            .order("created_at", { ascending: false })
            .limit(1);

        const lastGenerationHtml = lastGeneration?.[0]?.html;

        const prompt = chatResponsePrompt
            .replace('${messageHistory}', messageHistory)
            .replace('${lastGenerationHtml}', lastGenerationHtml || '')
            .replace('${agentPrompt}', agentPrompt)
            .replace('${lastUserMessage.content}', lastUserMessage.content);

        const { text } = await generateText({
            model: openai.responses("gpt-4o"),
            prompt: prompt,
            maxTokens: 2000,
            temperature: 0.8,
        });

        return text;
    }
}

module.exports = AIService;
