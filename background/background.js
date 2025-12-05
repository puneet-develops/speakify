// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle refine text request
  if (request.action === 'refineText') {
    handleRefineText(request.text, request.apiKey, request.systemPrompt)
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
 * @param {string} customSystemPrompt - Custom system prompt (optional)
 * @returns {Promise<string>} - Refined text
 */
async function handleRefineText(text, apiKey, customSystemPrompt = null) {
  try {
    // Since we can't use ES6 imports in service workers with importScripts,
    // we'll implement the API call directly here
    const refinedText = await refineTextWithPerplexity(text, apiKey, customSystemPrompt);
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
 * @param {string} customSystemPrompt - Custom system prompt (optional)
 * @returns {Promise<string>} - The refined text
 */
async function refineTextWithPerplexity(text, apiKey, customSystemPrompt = null) {
  if (!text || !text.trim()) {
    throw new Error('Text is required');
  }

  if (!apiKey || !apiKey.trim()) {
    throw new Error('API key is required');
  }

  const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
  const DEFAULT_SYSTEM_PROMPT = "You are a timesheet assistant for a backend developer. Your task is to refine and format voice-transcribed text into professional, concise timesheet entries. The output should be: 1) Clear and professional, 2) Concise (typically 10-30 words), 3) Focused on technical work, tasks, and accomplishments, 4) Suitable for daily timesheet logging. Remove filler words, fix grammar, and make it sound professional. Return ONLY the refined text without any additional commentary, explanations, or formatting marks.";
  const SYSTEM_PROMPT = customSystemPrompt || DEFAULT_SYSTEM_PROMPT;

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
        max_tokens: 150
      })
    });

    if (!response.ok) {
      // Handle 401 (Unauthorized) - Invalid API key
      if (response.status === 401) {
        throw new Error('Shit bro, your API key isn\'t working. Please check your API key in Settings.');
      }
      
      const errorData = await response.json().catch(() => ({}));
      let errorMessage = errorData.error?.message || `API error: ${response.status} ${response.statusText}`;
      
      // Provide user-friendly messages for other common errors
      if (response.status === 403) {
        errorMessage = 'Access forbidden. Please check your API key permissions.';
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (response.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
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

