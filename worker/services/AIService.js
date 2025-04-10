const { generateText, generateObject } = require('ai');
const { openai } = require('@ai-sdk/openai');
const { z } = require('zod');
const PusherService = require('./PusherService');
const {
  visualizationPrompt,
  agentConfidencePrompt,
  chatResponsePrompt,
} = require('./prompts/chat-prompts');

class AIService {
  constructor(supabase) {
    this.supabase = supabase;
    this.aiResponseInProgress = false;
    this.aiAgents = [];
    this.aiAgentIds = new Set();
  }

  async handleAIResponse(roomId, messageHistory, lastUserMessage, agentPrompt = null) {
    try {
      // Check if the message is from an AI agent - if so, don't respond
      if (this.aiAgentIds.has(lastUserMessage.user_id)) {
        console.log("Last message was from an AI agent, skipping response");
        return;
      }
      
      // 1. Check if the message indicates a visualization intent
      const visualizationConfidence = await this.analyzeMessageForVisualizationIntent(lastUserMessage);
      console.log(`Visualization confidence: ${visualizationConfidence * 100}%`);
      
      // 2. Select the most appropriate agent for this message
      const selectedAgent = await this.selectAgent(roomId, messageHistory, lastUserMessage);
      console.log(`Selected agent: ${selectedAgent ? selectedAgent.name : 'Default'}`);
      
      // Use the selected agent's prompt or fallback to provided agentPrompt
      const effectivePrompt = selectedAgent ? selectedAgent.personality_prompt : agentPrompt;
      
      // 3. Generate the text response
      const textResponse = await this.generateResponse(
        roomId,
        messageHistory,
        lastUserMessage,
        effectivePrompt
      );
      console.log(`AI Response: ${textResponse}`);
      
      // 4. Determine if we need to generate visualization
      let generationHtml = null;
      if (visualizationConfidence > 0.7) { // Threshold for visualization generation
        console.log("Visualization intent detected, generating visualization");
        generationHtml = await this.generateVisualization(
          roomId, 
          messageHistory, 
          lastUserMessage, 
          textResponse
        );
        
        // Store the new generation in the database
        const { data: generation, error: insertError } = await this.supabase
          .from('chat_room_generations')
          .insert({
            room_id: roomId,
            html: generationHtml,
            summary: "Generated visualization based on conversation",
            created_by: selectedAgent ? selectedAgent.id : null,
            type: "visualization",
            metadata: {
              model: "o3-mini",
              messageCount: typeof messageHistory === 'string' ? messageHistory.split('\n').length : 
                Array.isArray(messageHistory) ? messageHistory.length : 0
            }
          })
          .select()
          .single();
          
        if (insertError) {
          console.error('Error storing generation:', insertError);
        } else {
          console.log("Generation stored in database with ID:", generation.id);
        }
      }
      
      // 5. Store the AI response in the database
      const aiAssistantId = selectedAgent ? selectedAgent.id : null;
      const { data: messageData, error: messageError } = await this.supabase.from("messages").insert({
        room_id: roomId,
        user_id: aiAssistantId,
        content: textResponse,
      }).select().single();

      if (messageError) {
        console.error('Error saving AI response to database:', messageError);
      } else {
        console.log("AI response saved to database with ID:", messageData.id);
        
        // Send the AI response to the appropriate Pusher channel
        await PusherService.sendEvent(`room-${roomId}`, 'new-message', {
          id: messageData.id,
          content: textResponse,
          created_at: messageData.created_at,
          user_id: aiAssistantId
        });
      }
      
      // 6. If there's a new generation, notify clients to update
      if (generationHtml) {
        // Send HTML visualization as a special event type (matching old code)
        await PusherService.sendEvent(`room-${roomId}`, 'html-visualization', {
          id: generation.id,
          html: generationHtml,
          summary: "Generated a visual summary of this conversation",
          created_at: generation.created_at,
          user_id: selectedAgent ? selectedAgent.id : null
        });
        
        console.log("HTML visualization sent to clients via Pusher");
      }
      
    } catch (error) {
      console.error('Error handling AI response:', error);
    }
  }

  async init() {
    await this.fetchAIAgents();
  }

  async fetchAIAgents() {
    try {
      const { data, error } = await this.supabase
        .from('agents')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching AI agents:', error);
        return;
      }

      if (data && data.length > 0) {
        this.aiAgents = data;
        this.aiAgentIds = new Set(data.map((agent) => agent.id));
        console.log(`Fetched ${this.aiAgents.length} AI agents`);
      } else {
        console.log('No AI agents found in the database');
      }
    } catch (error) {
      console.error('Error in fetchAIAgents:', error);
    }
  }

  async analyzeMessageForVisualizationIntent(message) {
    const visualizationKeywords = [
      'build',
      'create',
      'generate',
      'make',
      'show',
      'visualize',
      'display',
      'draw',
      'chart',
      'graph',
      'diagram',
      'map',
      'plot',
      'visualisation',
      'visualization',
      'dashboard',
      'ui',
      'interface',
      'design',
      'mockup',
      'prototype',
      'render',
      'play',
      'animate',
      'simulate',
      'illustrate',
      'depict',
      'add',
      'update',
      'change',
      'modify',
      'improve',
      'enhance',
      'optimize',
      'refine',
      'revise',
      'customize',
      'personalize',
      'tailor',
      'adjust',
      'transform',
      'evolve',
      'rework',
      'rebuild',
      'recreate',
      'remake',
      'reproduce',
      'reimagine',
      'rethink',
      'reconceptualize',
      'reengineer',
      'restructure',
      'reconfigure',
      'reorganize',
      'rearrange',
      'recompose',
      'reconstruct',
      'refactor',
      'can you',
      'could you',
      'suggest',
      'recommend',
    ];

    const messageText = message.content.toLowerCase();
    const keywordMatch = visualizationKeywords.some((keyword) =>
      messageText.includes(keyword)
    );

    let confidence = keywordMatch ? 0.5 : 0.1;

    if (keywordMatch) {
      try {
        const result = await generateObject({
          model: openai.responses('gpt-4o'),
          schema: z.object({
            score: z
              .number()
              .describe(
                'A score from 0 to 100 indicating the likelihood that the user is requesting a visualization'
              ),
            reason: z
              .string()
              .describe('A brief explanation of why this score was given'),
          }),
          prompt: `Analyze this message and determine if it's explicitly requesting something to be built, created, visualized, or generated.

Message: "${message.content}"

Return a score from 0 to 100 indicating the likelihood that the user is requesting a visualization, and a brief reason explaining why.`,
          temperature: 0.1,
        });

        if (result && typeof result === 'object') {
          let score, reason;

          if ('score' in result) {
            score = result.score;
            reason = result.reason;
          } else if (result.object && typeof result.object === 'object') {
            score = result.object.score;
            reason = result.object.reason;
          } else if (result.analysis && typeof result.analysis === 'object') {
            score = result.analysis.score;
            reason = result.analysis.reason;
          }

          if (typeof score === 'number') {
            confidence = score / 100;
            console.log(
              `AI analysis of visualization intent: ${confidence * 100}% confidence. Reason: ${reason || 'No reason provided'}`
            );
          }
        }
      } catch (aiError) {
        console.error('Error getting AI analysis of message:', aiError);
      }
    }

    return confidence;
  }

  async selectAgent(roomId, messageHistory, lastUserMessage) {
    if (this.aiAgents.length === 0) return null;

    const { data: lastGeneration } = await this.supabase
      .from('chat_room_generations')
      .select()
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastGenerationHtml = lastGeneration?.[0]?.html;

    const prompt = agentConfidencePrompt
      .replace('${aiAgents}', JSON.stringify(this.aiAgents))
      .replace('${lastGenerationHtml}', lastGenerationHtml || '')
      .replace('${messageHistory}', messageHistory)
      .replace('${lastUserMessage.content}', lastUserMessage.content);

    try {
      const result = await generateObject({
        model: openai.responses('gpt-4o'),
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

      // Safely access the agents_confidence array from the result
      // Different AI SDK versions might return different response structures
      let selectedAgents;
      
      // First check if we have the direct output object structure
      if (result && result.agents_confidence) {
        selectedAgents = result.agents_confidence;
      }
      // Then check for nested response structure in newer SDK versions
      else if (result?.response?.body?.output) {
        // Handle case where output is already an array of objects with content field
        const output = result.response.body.output[0];
        
        if (output && output.text) {
          try {
            // Safely parse JSON from text
            const parsedContent = JSON.parse(output.text);
            selectedAgents = parsedContent.agents_confidence;
          } catch (parseError) {
            console.error('Failed to parse JSON from AI response:', parseError);
            return null;
          }
        }
      }
      
      // If we couldn't extract the agents_confidence, log error and return null
      if (!selectedAgents || !Array.isArray(selectedAgents) || selectedAgents.length === 0) {
        console.error('Could not extract valid agents_confidence array from AI response:', result);
        return null;
      }

      const highestConfidenceAgent = selectedAgents.reduce((prev, current) =>
        prev.confidence > current.confidence ? prev : current
      );

      return this.aiAgents.find(
        (agent) => agent.id === highestConfidenceAgent.agent_id
      );
    } catch (error) {
      console.error('Error selecting agent:', error);
      return null;
    }
  }

  async generateVisualization(
    roomId,
    messageHistory,
    lastUserMessage,
    expertAgentText
  ) {
    const { data: lastGeneration } = await this.supabase
      .from('chat_room_generations')
      .select()
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastGenerationHtml = lastGeneration?.[0]?.html;

    const prompt = visualizationPrompt
      .replace('${lastGenerationHtml}', lastGenerationHtml || '')
      .replace('${messageHistory}', messageHistory)
      .replace('${expertAgentText}', expertAgentText);

    const { text: htmlContent } = await generateText({
      model: openai.responses('o3-mini'),
      prompt,
      maxTokens: 35500,
      temperature: 0.8,
    });

    return htmlContent;
  }

  async generateResponse(roomId, messageHistory, lastUserMessage, agentPrompt) {
    const { data: lastGeneration } = await this.supabase
      .from('chat_room_generations')
      .select()
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastGenerationHtml = lastGeneration?.[0]?.html;

    const prompt = chatResponsePrompt
      .replace('${messageHistory}', messageHistory)
      .replace('${lastGenerationHtml}', lastGenerationHtml || '')
      .replace('${agentPrompt}', agentPrompt)
      .replace('${lastUserMessage.content}', lastUserMessage.content);

    const { text } = await generateText({
      model: openai.responses('gpt-4o'),
      prompt: prompt,
      maxTokens: 2000,
      temperature: 0.8,
    });

    return text;
  }
}

module.exports = AIService;
