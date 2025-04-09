// Export these types and functions for the Canvas component
export type CanvasMessage = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
};

// Create loading visualization HTML
export const createLoadingVisualization = (prompt: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: system-ui, sans-serif;
          margin: 0;
          padding: 20px;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 4px 30px rgba(0,0,0,0.2);
          text-align: center;
          max-width: 90%;
          font-size: 120%;
        }
        h2 {
          margin-top: 0;
          color: #3b82f6;
          font-size: 2rem;
        }
        .prompt {
          background: #f1f5f9;
          padding: 12px;
          border-radius: 8px;
          margin: 20px 0;
          font-family: monospace;
          word-break: break-word;
        }
        p {
          margin-bottom: 0;
          font-size: 1.2rem;
        }
        .pulse {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        .loader {
          margin: 20px auto;
          width: 50px;
          height: 50px;
          border: 5px solid #f3f3f3;
          border-top: 5px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .steps {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 20px;
          text-align: left;
        }
        .step {
          display: flex;
          align-items: center;
          opacity: 0.7;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Creating Visualization</h2>
        <div class="prompt">${prompt}</div>
        <div class="loader"></div>
        <p class="pulse">Generating your interactive visualization...</p>
        <div class="steps">
          <div class="step">1. Analyzing your request...</div>
          <div class="step">2. Selecting visualization type...</div>
          <div class="step">3. Generating HTML and JavaScript...</div>
          <div class="step">4. Finalizing interactive elements...</div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Create error visualization HTML
export const createErrorVisualization = (errorMessage: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: system-ui, sans-serif;
          margin: 0;
          padding: 20px;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 4px 30px rgba(0,0,0,0.2);
          text-align: center;
          max-width: 90%;
        }
        h2 {
          margin-top: 0;
          color: #ef4444;
          font-size: 1.5rem;
        }
        .error-message {
          background: #fee2e2;
          color: #b91c1c;
          padding: 12px;
          border-radius: 8px;
          margin: 20px 0;
          font-family: monospace;
          word-break: break-word;
        }
        .button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
        }
        .button:hover {
          background: #2563eb;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Error Creating Visualization</h2>
        <div class="error-message">${errorMessage}</div>
        <button class="button" onclick="window.parent.postMessage('close-visualization', '*')">
          Close
        </button>
      </div>
    </body>
    </html>
  `;
};