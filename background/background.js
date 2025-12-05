// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle refine text request
  if (request.action === 'refineText') {
    handleRefineText(request.text, request.apiKey)
      .then(refinedText => {
        sendResponse({ success: true, refinedText });
      })
      .catch(error => {
        console.error('Error refining text:', error);
        sendResponse({ 
          success: false, 
          error: error.message || 'Failed to refine text' 
        });
      });
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
});

/**
 * Handle text refinement request
 * @param {string} text - Text to refine
 * @param {string} apiKey - Perplexity API key
 * @returns {Promise<string>} - Refined text
 */
async function handleRefineText(text, apiKey) {
  try {
    // Since we can't use ES6 imports in service workers with importScripts,
    // we'll implement the API call directly here
    const refinedText = await refineTextWithPerplexity(text, apiKey);
    return refinedText;
  } catch (error) {
    console.error('Error in handleRefineText:', error);
    throw error;
  }
}

/**
 * Refine text using Perplexity API
 * @param {string} text - The text to refine
 * @param {string} apiKey - Perplexity API key
 * @returns {Promise<string>} - The refined text
 */
async function refineTextWithPerplexity(text, apiKey) {
  if (!text || !text.trim()) {
    throw new Error('Text is required');
  }

  if (!apiKey || !apiKey.trim()) {
    throw new Error('API key is required');
  }

  const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
  const SYSTEM_PROMPT = "You are a helpful assistant that refines and improves user input text. Make it clear, concise, and professional while preserving the original intent. Return only the refined text without any additional commentary or explanation.";

  try {
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.2,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `API error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from Perplexity API');
    }

    const refinedText = data.choices[0].message.content.trim();
    
    if (!refinedText) {
      throw new Error('Empty response from Perplexity API');
    }

    return refinedText;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to Perplexity API');
    }
    throw error;
  }
}

