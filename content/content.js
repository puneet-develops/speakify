// Content script to interact with the page
console.log('Speakify content script loaded');

// Inject widget into the page
function injectWidget() {
  // Check if widget already exists
  if (document.getElementById('speakify-widget')) {
    console.log('Widget already exists');
    return;
  }

  // Inject widget script
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('widget/widget.js');
  script.onload = function() {
    console.log('Widget script loaded');
    this.remove();
  };
  script.onerror = function() {
    console.error('Failed to load widget script');
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// Inject widget when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(injectWidget, 100); // Small delay to ensure page is ready
  });
} else {
  setTimeout(injectWidget, 100);
}

// Speech Recognition (runs in page context where mic permission is granted)
let recognition = null;
let isRecording = false;

// Initialize Speech Recognition
function initializeSpeechRecognition() {
  console.log('Initializing speech recognition...');
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.warn('Speech recognition not supported in this browser');
    return false;
  }

  console.log('Speech recognition API available');
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    console.log('Speech recognition started');
    isRecording = true;
    // Notify widget that recording started
    window.postMessage({ 
      action: 'recordingStarted',
      source: 'speakify-content'
    }, '*');
    // Try to notify background, but ignore errors
    try {
      chrome.runtime.sendMessage({ 
        action: 'recordingStarted' 
      }, (response) => {
        if (chrome.runtime.lastError) {
          // Ignore - widget is handling it via postMessage
        }
      });
    } catch (err) {
      // Ignore errors
    }
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }

    const fullTranscript = finalTranscript + interimTranscript;
    console.log('Transcription update:', fullTranscript.trim(), 'isFinal:', finalTranscript.length > 0);
    
    // Send transcribed text to widget
    window.postMessage({
      action: 'transcriptionUpdate',
      text: fullTranscript.trim(),
      isFinal: finalTranscript.length > 0,
      source: 'speakify-content'
    }, '*');
    // Try to notify background, but ignore errors
    try {
      chrome.runtime.sendMessage({ 
        action: 'transcriptionUpdate',
        text: fullTranscript.trim(),
        isFinal: finalTranscript.length > 0
      }, (response) => {
        if (chrome.runtime.lastError) {
          // Ignore - widget is handling it via postMessage
        }
      });
    } catch (err) {
      // Ignore errors
    }
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    isRecording = false;
    
    let errorMessage = 'Speech recognition error: ';
    switch (event.error) {
      case 'no-speech':
        errorMessage = 'No speech detected. Please try again.';
        break;
      case 'audio-capture':
        errorMessage = 'Microphone not found. Please check your microphone.';
        break;
      case 'not-allowed':
        errorMessage = 'Microphone permission denied. Please allow microphone access for this website.';
        break;
      case 'aborted':
        // User stopped recording, don't send error
        console.log('Recording aborted');
        return;
      default:
        errorMessage = `Error: ${event.error}`;
    }
    
    console.log('Sending error to widget:', errorMessage);
    // Send error to widget
    window.postMessage({
      action: 'recordingError',
      error: errorMessage,
      source: 'speakify-content'
    }, '*');
    // Try to notify background, but ignore errors
    try {
      chrome.runtime.sendMessage({ 
        action: 'recordingError',
        error: errorMessage
      }, (response) => {
        if (chrome.runtime.lastError) {
          // Ignore - widget is handling it via postMessage
        }
      });
    } catch (err) {
      // Ignore errors
    }
  };

  recognition.onend = () => {
    console.log('Speech recognition ended');
    isRecording = false;
    // Notify widget that recording stopped
    window.postMessage({
      action: 'recordingStopped',
      source: 'speakify-content'
    }, '*');
    // Try to notify background, but ignore errors
    try {
      chrome.runtime.sendMessage({ 
        action: 'recordingStopped' 
      }, (response) => {
        if (chrome.runtime.lastError) {
          // Ignore - widget is handling it via postMessage
        }
      });
    } catch (err) {
      // Ignore errors
    }
  };

  recognition.onabort = () => {
    console.log('Speech recognition aborted');
    isRecording = false;
    // Notify widget that recording stopped
    window.postMessage({
      action: 'recordingStopped',
      source: 'speakify-content'
    }, '*');
  };

  return true;
}

// Initialize speech recognition when content script loads
console.log('Initializing speech recognition on load...');
initializeSpeechRecognition();

// Listen for messages from widget
window.addEventListener('message', (event) => {
  // Only accept messages from our extension
  if (event.data && event.data.source === 'speakify-widget') {
    const action = event.data.action;
    
    if (action === 'getApiKey') {
      // Get API key from storage
      chrome.storage.local.get(['perplexityApiKey'], (result) => {
        window.postMessage({
          action: 'apiKeyResponse',
          apiKey: result.perplexityApiKey || null,
          source: 'speakify-content'
        }, '*');
      });
    } else if (action === 'saveApiKey') {
      // Save API key to storage
      chrome.storage.local.set({ perplexityApiKey: event.data.apiKey }, () => {
        window.postMessage({
          action: 'saveApiKeyResponse',
          success: true,
          source: 'speakify-content'
        }, '*');
      });
    } else if (action === 'startRecording' || action === 'stopRecording') {
      // Handle recording directly in content script (no need for background)
      if (action === 'startRecording') {
        if (!recognition) {
          if (!initializeSpeechRecognition()) {
            window.postMessage({
              action: action + 'Response',
              success: false,
              error: 'Speech recognition not supported',
              source: 'speakify-content'
            }, '*');
            return;
          }
        }
        if (isRecording) {
          window.postMessage({
            action: action + 'Response',
            success: false,
            error: 'Recording already in progress',
            source: 'speakify-content'
          }, '*');
          return;
        }
        try {
          recognition.start();
          window.postMessage({
            action: action + 'Response',
            success: true,
            source: 'speakify-content'
          }, '*');
        } catch (error) {
          window.postMessage({
            action: action + 'Response',
            success: false,
            error: error.message,
            source: 'speakify-content'
          }, '*');
        }
      } else if (action === 'stopRecording') {
        if (recognition && isRecording) {
          try {
            recognition.stop();
            isRecording = false; // Immediately set flag to false
            window.postMessage({
              action: action + 'Response',
              success: true,
              source: 'speakify-content'
            }, '*');
            // Also notify that recording stopped
            window.postMessage({
              action: 'recordingStopped',
              source: 'speakify-content'
            }, '*');
          } catch (error) {
            console.error('Error stopping recognition:', error);
            isRecording = false;
            window.postMessage({
              action: action + 'Response',
              success: false,
              error: error.message || 'Failed to stop recording',
              source: 'speakify-content'
            }, '*');
          }
        } else {
          isRecording = false; // Ensure flag is false
          window.postMessage({
            action: action + 'Response',
            success: false,
            error: 'No recording in progress',
            source: 'speakify-content'
          }, '*');
        }
      }
    } else if (action === 'refineText') {
      // Handle refine text via background script with custom system prompt
      chrome.runtime.sendMessage({
        action: 'refineText',
        text: event.data.text,
        apiKey: event.data.apiKey,
        systemPrompt: event.data.systemPrompt
      }, (response) => {
        if (chrome.runtime.lastError) {
          window.postMessage({
            action: 'refineTextResponse',
            success: false,
            error: chrome.runtime.lastError.message,
            source: 'speakify-content'
          }, '*');
          return;
        }
        window.postMessage({
          action: 'refineTextResponse',
          success: response?.success || false,
          refinedText: response?.refinedText,
          error: response?.error,
          source: 'speakify-content'
        }, '*');
      });
    } else if (action === 'getSettings') {
      // Get settings from storage
      chrome.storage.local.get(['speakifySettings'], (result) => {
        window.postMessage({
          action: 'settingsResponse',
          settings: result.speakifySettings || null,
          source: 'speakify-content'
        }, '*');
      });
    } else if (action === 'saveSettings') {
      // Save settings to storage
      // This completely replaces the previous settings, so all changes are saved together
      // No conflicts because we're using a single key and replacing it entirely
      chrome.storage.local.set({ speakifySettings: event.data.settings }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error saving settings:', chrome.runtime.lastError);
          window.postMessage({
            action: 'settingsResponse',
            settings: null,
            error: chrome.runtime.lastError.message,
            source: 'speakify-content'
          }, '*');
        } else {
          console.log('Settings saved successfully:', event.data.settings);
          window.postMessage({
            action: 'settingsResponse',
            settings: event.data.settings,
            source: 'speakify-content'
          }, '*');
        }
      });
    } else if (action === 'getHistory') {
      // Get history from storage
      chrome.storage.local.get(['speakifyHistory'], (result) => {
        window.postMessage({
          action: 'historyResponse',
          history: result.speakifyHistory || [],
          source: 'speakify-content'
        }, '*');
      });
    } else if (action === 'saveHistory') {
      // Save history to storage
      chrome.storage.local.set({ speakifyHistory: event.data.history }, () => {
        window.postMessage({
          action: 'historyResponse',
          history: event.data.history,
          source: 'speakify-content'
        }, '*');
      });
    } else if (action === 'fillInput') {
      // Handle fill input
      try {
        const result = fillInputField(event.data.text);
        window.postMessage({
          action: 'fillInputResponse',
          success: true,
          message: result.message,
          source: 'speakify-content'
        }, '*');
      } catch (error) {
        window.postMessage({
          action: 'fillInputResponse',
          success: false,
          error: error.message,
          source: 'speakify-content'
        }, '*');
      }
    } else if (action === 'submitForm') {
      // Handle submit form
      try {
        const result = submitForm();
        window.postMessage({
          action: 'submitFormResponse',
          success: true,
          message: result.message,
          source: 'speakify-content'
        }, '*');
      } catch (error) {
        window.postMessage({
          action: 'submitFormResponse',
          success: false,
          error: error.message,
          source: 'speakify-content'
        }, '*');
      }
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request.action);
  
  if (request.action === 'startRecording') {
    console.log('startRecording action received');
    try {
      if (!recognition) {
        console.log('Recognition not initialized, initializing now...');
        if (!initializeSpeechRecognition()) {
          console.error('Failed to initialize speech recognition');
          sendResponse({ success: false, error: 'Speech recognition not supported' });
          return true;
        }
      }
      
      if (isRecording) {
        console.log('Recording already in progress');
        sendResponse({ success: false, error: 'Recording already in progress' });
        return true;
      }
      
      console.log('Starting recognition...');
      recognition.start();
      console.log('Recognition.start() called');
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error starting recording:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  if (request.action === 'stopRecording') {
    console.log('stopRecording action received');
    try {
      if (recognition && isRecording) {
        console.log('Stopping recognition...');
        recognition.stop();
        sendResponse({ success: true });
      } else {
        console.log('No recording in progress');
        sendResponse({ success: false, error: 'No recording in progress' });
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  if (request.action === 'fillInput') {
    try {
      const result = fillInputField(request.text);
      sendResponse({ success: true, message: result.message });
    } catch (error) {
      console.error('Error filling input:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  if (request.action === 'submitForm') {
    try {
      const result = submitForm();
      sendResponse({ success: true, message: result.message });
    } catch (error) {
      console.error('Error submitting form:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
});

/**
 * Find and fill the input field
 * @param {string} text - Text to fill
 * @returns {Object} - Result object with message
 */
function fillInputField(text) {
  if (!text || !text.trim()) {
    throw new Error('No text provided to fill');
  }

  // Try multiple strategies to find the input field
  // Prioritize specific selectors first
  const selectors = [
    // Specific input field for this website (highest priority)
    'input.input-box-todo',
    'input[placeholder="Enter your task"]',
    'input[placeholder*="Enter your task" i]',
    // Task-related inputs
    'input[placeholder*="task" i]',
    'input[placeholder*="enter" i]',
    'input[placeholder*="your" i]',
    'input[id*="task" i]',
    'input[name*="task" i]',
    'input[class*="task" i]',
    'input[class*="todo" i]',
    // Common input field patterns
    'input[type="text"]',
    'input[type="search"]',
    'textarea',
    'textarea[placeholder*="task" i]',
    'textarea[id*="task" i]',
    'textarea[name*="task" i]',
    // Contenteditable divs
    '[contenteditable="true"]',
    // Generic input without type (defaults to text)
    'input:not([type])',
  ];

  let inputField = null;
  let usedSelector = '';

  // Try each selector
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    
    // Prioritize visible elements
    for (const element of elements) {
      if (isElementVisible(element)) {
        // Check if this is the specific input-box-todo field
        if (element.classList.contains('input-box-todo') || 
            (element.placeholder && element.placeholder.toLowerCase().includes('enter your task'))) {
          inputField = element;
          usedSelector = selector;
          break; // Found the exact field, stop searching
        }
        
        // Prefer elements with task-related attributes
        if (hasTaskRelatedAttribute(element)) {
          if (!inputField) {
            inputField = element;
            usedSelector = selector;
          }
        }
        
        // If no task-related element found yet, use the first visible one
        if (!inputField) {
          inputField = element;
          usedSelector = selector;
        }
      }
    }
    
    // If we found the specific input-box-todo, stop searching
    if (inputField && (inputField.classList.contains('input-box-todo') || 
        (inputField.placeholder && inputField.placeholder.toLowerCase().includes('enter your task')))) {
      break;
    }
    
    if (inputField && hasTaskRelatedAttribute(inputField)) {
      break;
    }
  }

  if (!inputField) {
    throw new Error('Could not find an input field on this page. Please ensure there is a text input or textarea visible.');
  }

  // Fill the input field
  if (inputField.tagName === 'INPUT' || inputField.tagName === 'TEXTAREA') {
    inputField.value = text;
    inputField.dispatchEvent(new Event('input', { bubbles: true }));
    inputField.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (inputField.isContentEditable) {
    inputField.textContent = text;
    inputField.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Focus the field
  inputField.focus();

  return {
    message: `Text filled into input field (found using: ${usedSelector})`,
    element: inputField
  };
}

/**
 * Submit the form containing the input field
 * @returns {Object} - Result object with message
 */
function submitForm() {
  // Try to find the form
  const inputField = document.activeElement;
  let form = null;

  if (inputField) {
    // Try to find parent form
    form = inputField.closest('form');
  }

  // If no form found, try to find any form on the page
  if (!form) {
    const forms = document.querySelectorAll('form');
    if (forms.length > 0) {
      form = forms[0];
    }
  }

  if (form) {
    // Try to find submit button
    const submitButton = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
    
    if (submitButton) {
      submitButton.click();
      return { message: 'Form submitted using submit button' };
    } else {
      // Try to submit the form directly
      form.submit();
      return { message: 'Form submitted directly' };
    }
  } else {
    // Try to find a submit button near the input field
    const submitButtons = document.querySelectorAll('button[type="submit"], input[type="submit"]');
    
    if (submitButtons.length > 0) {
      // Find the closest submit button to the active input
      let closestButton = null;
      let minDistance = Infinity;
      
      const inputRect = inputField.getBoundingClientRect();
      
      submitButtons.forEach(button => {
        const buttonRect = button.getBoundingClientRect();
        const distance = Math.sqrt(
          Math.pow(inputRect.left - buttonRect.left, 2) +
          Math.pow(inputRect.top - buttonRect.top, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestButton = button;
        }
      });
      
      if (closestButton) {
        closestButton.click();
        return { message: 'Submit button clicked' };
      }
    }
    
    throw new Error('Could not find a form or submit button on this page');
  }
}

/**
 * Check if element is visible
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} - True if visible
 */
function isElementVisible(element) {
  if (!element) return false;
  
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Check if element has task-related attributes
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} - True if has task-related attributes
 */
function hasTaskRelatedAttribute(element) {
  const taskKeywords = ['task', 'todo', 'input', 'text', 'message', 'description', 'note'];
  
  const id = (element.id || '').toLowerCase();
  const name = (element.name || '').toLowerCase();
  const placeholder = (element.placeholder || '').toLowerCase();
  const className = (element.className || '').toLowerCase();
  
  for (const keyword of taskKeywords) {
    if (id.includes(keyword) || name.includes(keyword) || placeholder.includes(keyword) || className.includes(keyword)) {
      return true;
    }
  }
  
  return false;
}

