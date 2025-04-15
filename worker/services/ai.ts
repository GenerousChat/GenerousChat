
import shouldAgentRespond from "./ai/shouldAgentRespond.js";
import selectBestAgent from "./ai/selectBestAgent";
import analyzeMessageForVisualizationIntent from "./ai/analyzeMessageForVisualizationIntent";
import generateAITextResponse from "./ai/generateAITextResponse";
import generateHTMLContent from "./ai/generateHTMLContent.js";
import generateAIResponse from "./ai/generateAIResponse";



// Export individual functions
export {
  analyzeMessageForVisualizationIntent,
  selectBestAgent,
  generateAITextResponse,
  generateHTMLContent,
  generateAIResponse,
  shouldAgentRespond,
};

// Export as default for compatibility with existing imports
const aiService = {
  analyzeMessageForVisualizationIntent,
  selectBestAgent,
  generateAITextResponse,
  generateHTMLContent,
  generateAIResponse,
  shouldAgentRespond, 
};

export default aiService;
