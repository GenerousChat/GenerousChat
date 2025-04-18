// @ts-nocheck - Ignore TypeScript errors in this file
import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }
) {
  try {
    const generationId = params.id;
    
    if (!generationId) {
      return NextResponse.json({ error: 'Generation ID is required' }, { status: 400 });
    }
    
    // Initialize Supabase client - must be awaited
    const supabase = await createClient();
    
    // Query the generation from Supabase
    const { data, error } = await supabase
      .from('canvas_generations')
      .select('*')
      .eq('id', generationId)
      .single();
    
    if (error) {
      console.error('Error fetching generation:', error);
      return NextResponse.json({ error: 'Failed to fetch generation' }, { status: 500 });
    }
    
    if (!data) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }
    
    // Return the HTML wrapped in a syntax-highlighted page
    const htmlContent = data.html;
    const escapedHtml = htmlContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    const syntaxHighlightedPage = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>HTML Code - Generation ${generationId}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        pre {
          background-color: #f6f8fa;
          border-radius: 6px;
          padding: 16px;
          overflow: auto;
          font-size: 14px;
          line-height: 1.45;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid #eaecef;
        }
        .btn {
          background-color: #0070f3;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        .btn:hover {
          background-color: #0051a8;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>HTML Code - Generation ${generationId.substring(0, 8)}...</h1>
        <div>
          <button id="copyBtn" class="btn" style="margin-right: 10px;">Copy Code</button>
          <button class="btn" onclick="window.location.href='/api/generation/${generationId}'">View Rendered HTML</button>
        </div>
      </div>
      <pre><code class="language-html" id="htmlCode">${escapedHtml}</code></pre>
      
      <script>
        document.addEventListener('DOMContentLoaded', (event) => {
          // Apply syntax highlighting
          document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
          });
          
          // Set up copy button functionality
          const copyBtn = document.getElementById('copyBtn');
          const htmlCode = document.getElementById('htmlCode');
          
          copyBtn.addEventListener('click', () => {
            // Get the original unescaped HTML (stored in a data attribute)
            const textToCopy = htmlCode.textContent;
            
            // Use the Clipboard API to copy the text
            navigator.clipboard.writeText(textToCopy).then(() => {
              // Visual feedback that copy was successful
              const originalText = copyBtn.textContent;
              copyBtn.textContent = 'Copied!';
              copyBtn.style.backgroundColor = '#10B981'; // Green color
              
              // Reset button after 2 seconds
              setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.backgroundColor = '#0070f3';
              }, 2000);
            }).catch(err => {
              console.error('Failed to copy text: ', err);
              alert('Failed to copy code to clipboard');
            });
          });
        });
      </script>
    </body>
    </html>
    `;
    
    return new NextResponse(syntaxHighlightedPage, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error getting generation code:', error);
    return NextResponse.json({ error: 'Failed to get generation code' }, { status: 500 });
  }
}
