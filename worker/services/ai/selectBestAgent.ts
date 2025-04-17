
import logger from "../../utils/logger.js";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import supabaseService, { Message } from "../supabase.js";

interface Agent {
  id: string;
  name: string;
  description?: string;
  personality_prompt?: string;
  avatar_url?: string;
}

interface AgentConfidence {
  agent_id: string;
  confidence: number;
}

/**
 * Select the best AI agent for a conversation
 * @param roomId - Room ID
 * @param lastUserMessage - Last user message
 * @param messageHistory - Message history
 * @returns Selected agent or null if no agents available
 */
async function selectBestAgent(
  roomId: string, 
  lastUserMessage: Message, 
  messageHistory: string
): Promise<Agent | null> {
  try {
    const aiAgents = await supabaseService.fetchAIAgents();

    logger.info(`Selecting from ${aiAgents.length} available AI agents`);

    const prompt = `
You are controlling a group of AI agents with distinct personalities. Each agent has its own unique perspective and expertise. Your task is to analyze the last message in the conversation and determine if any of the agents should respond. Consider the context of the conversation, the personalities of the agents, and the content of the last message.
 
First, decide whether it is converationally appropriate to respond. You should engage in natural conversation within the group, adapting to the current social context and being careful not to let any one agent dominate the conversation. 

If a response is warranted, then decide which agent will respond by judging how likely each agent is to offer meaningful contributions to the conversation, based on their personality and the context of the conversation. Only respond if you are confident that it is conversationally appropriate and the agent's personality aligns with the topic of the last message.

Based on these constraints, analyze the following message and rank the confidence interval for each agent:      
      Agents:
      ${aiAgents
        .map(
          (agent) => `
        Agent Name:
        ${agent.name}: 
        Agent Id: 
        ${agent.id}
        Agent Personality:
        ${(agent as any).personality_prompt || "No personality defined"}
      `
        )
        .join("\n\n\n")}

      Message History:
      ${messageHistory}

      Last Message: 
      ${lastUserMessage.content}

      All things considered, should an agent chime in on the conversation given it's personality and the context of the conversation?
      
      Return an array of objects containing agent IDs and their confidence scores for a meaningful response.
    `;

    const result = await generateObject({
      model: openai.responses("gpt-4o-mini"),
      temperature: 0.1,
      schema: z.object({
        agents_confidence: z
          .array(
            z.object({
              agent_id: z.string(),
              confidence: z.number(),
            })
          )
          .describe(
            "An array of objects containing agent IDs and their confidence scores for a meaningful response"
          ),
      }),
      prompt,
    });

    let selectedAgents: AgentConfidence[] = [];
    
    try {
      // Use type assertion to safely access nested properties
      const responseObj = result.response as Record<string, any>;
      
      // Check if we have the expected nested structure
      if (responseObj?.body && 
          typeof responseObj.body === 'object' && 
          'output' in responseObj.body && 
          Array.isArray(responseObj.body.output) && 
          responseObj.body.output.length > 0 && 
          responseObj.body.output[0]?.content && 
          Array.isArray(responseObj.body.output[0].content) && 
          responseObj.body.output[0].content.length > 0 && 
          responseObj.body.output[0].content[0]?.text) {
        
        // Parse the JSON text from the first content item
        const parsedData = JSON.parse(
          responseObj.body.output[0].content[0].text
        );
        if (parsedData.agents_confidence) {
          selectedAgents = parsedData.agents_confidence;
          logger.debug(
            "Successfully parsed agent confidences:",
            selectedAgents
          );
        }
      }
    } catch (error) {
      logger.error("Error parsing agent selection result:", error instanceof Error ? error.message : String(error));
    }

    if (selectedAgents.length === 0) {
      return null;
    }

    // Map agent IDs to names and confidences for logging
    const agentConfidenceMap = selectedAgents.reduce<Record<string, number>>(
      (acc, item) => {
        acc[item.agent_id] = item.confidence;
        return acc;
      },
      {}
    );

    logger.info(
      "Agent selection confidence scores:",
      JSON.stringify(agentConfidenceMap)
    );

    // Sort agents by confidence (descending)
    selectedAgents.sort((a, b) => b.confidence - a.confidence);

    // Find the agent with the highest confidence
    const bestAgentId = selectedAgents[0].agent_id;
    const bestAgent = aiAgents.find((agent) => agent.id === bestAgentId);

    if (!bestAgent) {
      logger.warn(
        `Selected agent ID ${bestAgentId} not found in available agents`
      );
      return null;
    }

    logger.info(
      `Selected agent: ${bestAgent.name} (ID: ${bestAgent.id}) with confidence ${selectedAgents[0].confidence}`
    );
    return bestAgent as Agent;
  } catch (error) {
    logger.error("Error selecting best agent:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

export default selectBestAgent;