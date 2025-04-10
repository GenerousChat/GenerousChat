const visualizationPrompt = `# Conversation-Driven UI Generation

## Last generated Canvas  
Only use this if the person seemingly wants to update the last canvas 
\${lastGenerationHtml ? lastGenerationHtml : ""}

## PRIORITY: Focus on BUILD/CREATE/GENERATE Requests
Analyze the conversation for the most recent message that explicitly asks for something to be built, created, generated, visualized, or updated. Ignore casual conversation or messages that don't request creation of something. Look for imperative commands and phrases like "build", "create", "generate", "make", "show me", "visualize", etc. For requests requiring update look at the most recent canvas code and only change the parts the user asks to change.

## Context Analysis Guidelines:
- Find the most recent message containing an EXPLICIT request to build/create something
- Look for clear directives like "build X", "create Y", "generate Z", "make a...", "show me...", "update...",
- Skip over casual messages, questions, or discussions that don't request creation or updates
- Once found, implement exactly what that message requested
- Use conversation history only as supporting context for implementing the request

## Technology Selection - Match the right tool to the request and check for dependencies:
- Data/statistics → Use D3.js or Chart.js (but only if actual data is present)
- Timelines/processes → Use TimelineJS
- 3D objects/spaces → Use Three.js (only when truly beneficial)
- Creative explanations → Use SVG/Canvas/p5.js for illustrations
- Interactive tools → Use appropriate JS framework for the specific tool
- Math concepts → use MathJax or KaTeX for math, or custom SVG
- Games/simulations → Use Phaser or p5.js
- Maps/locations → Use Leaflet.js or Mapbox GL JS
- Physics simulations → Use Matter.js
- Simple animations → Use CSS animations or GSAP
- Scientific visualizations → Use Plotly.js or Vega-Lite
- Youtube videos → Use lite YouTube embed
- Simple text/concepts → Use elegant typography 

## Your Creation Requirements:
1. Ensure responsive design that works well in the sidebar panel
2. Create a visualization that directly fulfills the most recent build/create/update request
3. DO NOT INCLUDE markdown code comment blocks in the output as it will be rendered directly
4. Optimize performance (lazy load libraries, efficient code) 
5. Balance aesthetics with functionality - beautiful but purposeful
6. Use libraries and technologies that fit the conversation needs
7. Add thoughtful interactivity that improves understanding
8. Provide clear visual cues for how to interact with your creation
9. Include helpful annotations where appropriate
10. Handle edge cases gracefully with fallbacks

## Implementation Details:
- You may use external libraries from trusted CDNs (cdnjs, unpkg, jsdelivr)
- The visualization must work immediately without setup steps
- Use appropriate semantic HTML and accessibility features
- Include fallback content if libraries fail to load
- Create smooth loading experience with transitions
- Make appropriate use of viewport dimensions`;

const agentConfidencePrompt = `
Analyze this message and determine the confidence of each agent in providing a meaningful response.

Agents:
\${aiAgents
  .map(
    (agent) => \`
  Agent Name:
  \${agent.name}: 
  Agent Id: 
  \${agent.id}
  Agent Personality:
  \${agent.personality_prompt}
\`
  )
  .join("\n\n\n")}

Last Generation HTML:
\${lastGenerationHtml}

Message History:
\${messageHistory}

Last Message: 
\${lastUserMessage.content}

All things considered, should an agent chime in on the conversation given it's personality and the context of the conversation?

Return an array of objects containing agent IDs and their confidence scores for a meaningful response.
`;

const chatResponsePrompt = `
The following is a chat conversation:
\${messageHistory}

Last Generation HTML:
\${lastGenerationHtml}

Expert Prompt:
\${agentPrompt}

Focus on responding directly to the last message in the conversation. Your response should reflect the topic and tone of the conversation, especially addressing what "\${lastUserMessage.content}" is about.
`;

module.exports = {
    visualizationPrompt,
    agentConfidencePrompt,
    chatResponsePrompt
};
