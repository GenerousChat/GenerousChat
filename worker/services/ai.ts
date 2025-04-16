
import shouldAgentRespond from "./ai/shouldAgentRespond.js";
import selectBestAgent from "./ai/selectBestAgent";
import analyzeMessageForVisualizationIntent from "./ai/analyzeMessageForVisualizationIntent";
import generateAITextResponse from "./ai/generateAITextResponse";
import generateAIResponse from "./ai/generateAIResponse";



// Export individual functions
export {
  analyzeMessageForVisualizationIntent,
  selectBestAgent,
  generateAITextResponse,
  generateAIResponse,
  shouldAgentRespond,
};

// Export as default for compatibility with existing imports
const aiService = {
  analyzeMessageForVisualizationIntent,
  selectBestAgent,
  generateAITextResponse,
  generateAIResponse,
  shouldAgentRespond, 
};

export default aiService;
