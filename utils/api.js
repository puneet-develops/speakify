/**
 * Perplexity API helper functions
 */

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const SYSTEM_PROMPT = "You are a timesheet assistant for a backend developer. Your task is to refine and format voice-transcribed text into professional, concise timesheet entries. The output should be: 1) Clear and professional, 2) Concise (typically 10-30 words), 3) Focused on technical work, tasks, and accomplishments, 4) Suitable for daily timesheet logging. Remove filler words, fix grammar, and make it sound professional. Return ONLY the refined text without any additional commentary, explanations, or formatting marks.";

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

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { refineTextWithPerplexity, SYSTEM_PROMPT };
}

