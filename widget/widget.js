// Floating widget for Speakify extension
// This runs in the page context

(function() {
  'use strict';

  // Check if widget already exists
  if (document.getElementById('speakify-widget')) {
    console.log('Speakify widget already exists');
    return;
  }

  // Create widget container
  const widget = document.createElement('div');
  widget.id = 'speakify-widget';
  widget.innerHTML = `
    <div class="speakify-header">
      <h3>🎤 Speakify</h3>
      <button id="speakify-toggle" class="speakify-toggle">−</button>
    </div>
    <div id="speakify-content" class="speakify-content">
      <div class="speakify-section">
        <label for="speakify-apiKey">Perplexity API Key:</label>
        <input type="password" id="speakify-apiKey" placeholder="Enter your API key">
        <button id="speakify-saveApiKey" class="speakify-btn speakify-btn-primary">Save</button>
        <div id="speakify-apiKeyStatus" class="speakify-status"></div>
      </div>
      <div class="speakify-section">
        <label>Voice Recording:</label>
        <div class="speakify-recording-controls">
          <button id="speakify-micButton" class="speakify-btn speakify-btn-mic" disabled>
            <span class="speakify-mic-icon">🎤</span>
            <span id="speakify-micButtonText">Start Recording</span>
          </button>
          <div id="speakify-recordingStatus" class="speakify-status"></div>
        </div>
      </div>
      <div class="speakify-section" id="speakify-transcriptionSection" style="display: none;">
        <label>Transcribed Text:</label>
        <textarea id="speakify-transcribedText" readonly rows="3"></textarea>
        <button id="speakify-refineButton" class="speakify-btn speakify-btn-secondary" disabled>
          Refine with AI
        </button>
      </div>
      <div class="speakify-section" id="speakify-refinedSection" style="display: none;">
        <label>Refined Text:</label>
        <textarea id="speakify-refinedText" readonly rows="3"></textarea>
        <div class="speakify-action-buttons">
          <button id="speakify-fillInputButton" class="speakify-btn speakify-btn-primary">Fill Input</button>
          <button id="speakify-submitButton" class="speakify-btn speakify-btn-success">Submit</button>
        </div>
      </div>
      <div id="speakify-statusMessage" class="speakify-status-message"></div>
    </div>
  `;

  // Inject CSS
  const style = document.createElement('style');
  style.textContent = `
    #speakify-widget {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 380px;
      max-height: 90vh;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      font-size: 14px;
      color: #333;
      overflow: hidden;
      transition: all 0.3s ease;
      user-select: none;
    }
    #speakify-widget.collapsed {
      width: 200px;
    }
    #speakify-widget.collapsed .speakify-content {
      display: none;
    }
    .speakify-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: move;
    }
    .speakify-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
    .speakify-toggle {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }
    .speakify-toggle:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    .speakify-content {
      max-height: calc(90vh - 50px);
      overflow-y: auto;
      padding: 16px;
    }
    .speakify-section {
      margin-bottom: 16px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }
    .speakify-section:last-child {
      margin-bottom: 0;
    }
    .speakify-section label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #495057;
      font-size: 13px;
    }
    .speakify-section input[type="password"],
    .speakify-section input[type="text"],
    .speakify-section textarea {
      width: 100%;
      padding: 8px;
      border: 1px solid #ced4da;
      border-radius: 6px;
      font-size: 13px;
      font-family: inherit;
      margin-bottom: 8px;
      transition: border-color 0.3s;
      box-sizing: border-box;
    }
    .speakify-section input[type="password"]:focus,
    .speakify-section input[type="text"]:focus,
    .speakify-section textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    .speakify-section textarea {
      resize: vertical;
      min-height: 60px;
    }
    .speakify-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .speakify-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .speakify-btn-primary {
      background: #667eea;
      color: white;
    }
    .speakify-btn-primary:hover:not(:disabled) {
      background: #5568d3;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
    }
    .speakify-btn-secondary {
      background: #6c757d;
      color: white;
    }
    .speakify-btn-secondary:hover:not(:disabled) {
      background: #5a6268;
      transform: translateY(-1px);
    }
    .speakify-btn-success {
      background: #28a745;
      color: white;
    }
    .speakify-btn-success:hover:not(:disabled) {
      background: #218838;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
    }
    .speakify-btn-mic {
      width: 100%;
      background: #dc3545;
      color: white;
      padding: 12px;
      font-size: 14px;
    }
    .speakify-btn-mic:hover:not(:disabled) {
      background: #c82333;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3);
    }
    .speakify-btn-mic.recording {
      background: #ff6b6b;
      animation: speakify-pulse 1.5s infinite;
    }
    @keyframes speakify-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    .speakify-mic-icon { font-size: 18px; }
    .speakify-recording-controls {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .speakify-action-buttons {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
    .speakify-action-buttons .speakify-btn {
      flex: 1;
    }
    .speakify-status {
      font-size: 11px;
      margin-top: 4px;
      min-height: 14px;
    }
    .speakify-status.success { color: #28a745; }
    .speakify-status.error { color: #dc3545; }
    .speakify-status.info { color: #17a2b8; }
    .speakify-status-message {
      position: absolute;
      bottom: 16px;
      left: 16px;
      right: 16px;
      padding: 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      text-align: center;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s;
      pointer-events: none;
    }
    .speakify-status-message.show {
      opacity: 1;
      transform: translateY(0);
    }
    .speakify-status-message.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    .speakify-status-message.error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    .speakify-status-message.info {
      background: #d1ecf1;
      color: #0c5460;
      border: 1px solid #bee5eb;
    }
    .speakify-content::-webkit-scrollbar {
      width: 6px;
    }
    .speakify-content::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 3px;
    }
    .speakify-content::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 3px;
    }
    .speakify-content::-webkit-scrollbar-thumb:hover {
      background: #555;
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(widget);

  // Widget state
  let isRecording = false;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  let isCollapsed = false;

  // DOM elements
  const apiKeyInput = document.getElementById('speakify-apiKey');
  const saveApiKeyBtn = document.getElementById('speakify-saveApiKey');
  const apiKeyStatus = document.getElementById('speakify-apiKeyStatus');
  const micButton = document.getElementById('speakify-micButton');
  const micButtonText = document.getElementById('speakify-micButtonText');
  const recordingStatus = document.getElementById('speakify-recordingStatus');
  const transcriptionSection = document.getElementById('speakify-transcriptionSection');
  const transcribedText = document.getElementById('speakify-transcribedText');
  const refineButton = document.getElementById('speakify-refineButton');
  const refinedSection = document.getElementById('speakify-refinedSection');
  const refinedText = document.getElementById('speakify-refinedText');
  const fillInputButton = document.getElementById('speakify-fillInputButton');
  const submitButton = document.getElementById('speakify-submitButton');
  const statusMessage = document.getElementById('speakify-statusMessage');
  const toggleButton = document.getElementById('speakify-toggle');
  const header = widget.querySelector('.speakify-header');

  // Load API key from local storage on init (via content script)
  function loadApiKey() {
    window.postMessage({
      action: 'getApiKey',
      source: 'speakify-widget'
    }, '*');
  }

  // Save API key to local storage (via content script)
  function saveApiKey() {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    window.postMessage({
      action: 'saveApiKey',
      apiKey: apiKey,
      source: 'speakify-widget'
    }, '*');
  }

  // Load API key on init
  loadApiKey();

  function enableMicButton() {
    if (apiKeyInput.value.trim()) {
      micButton.disabled = false;
    }
  }

  // Toggle recording
  function toggleRecording() {
    // Send message to content script via window.postMessage
    window.postMessage({
      action: isRecording ? 'stopRecording' : 'startRecording',
      source: 'speakify-widget'
    }, '*');
  }

  // Refine with AI
  function refineWithAI() {
    const text = transcribedText.value.trim();
    if (!text) {
      showStatus('No text to refine', 'error');
      return;
    }

    refineButton.disabled = true;
    refineButton.textContent = 'Refining...';
    recordingStatus.textContent = 'Sending to Perplexity AI...';
    recordingStatus.className = 'speakify-status info';

    // Get API key from input field (already loaded)
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showStatus('API key not found. Please save your API key first.', 'error');
      refineButton.disabled = false;
      refineButton.textContent = 'Refine with AI';
      return;
    }

    // Send refine request via content script
    window.postMessage({
      action: 'refineText',
      text: text,
      apiKey: apiKey,
      source: 'speakify-widget'
    }, '*');
  }

  // Fill input box
  function fillInputBox() {
    const text = refinedText.value.trim();
    if (!text) {
      showStatus('No refined text to fill', 'error');
      return;
    }

    window.postMessage({
      action: 'fillInput',
      text: text,
      source: 'speakify-widget'
    }, '*');
  }

  // Submit form
  function submitForm() {
    window.postMessage({
      action: 'submitForm',
      source: 'speakify-widget'
    }, '*');
  }

  // Show status message
  function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `speakify-status-message ${type} show`;
    setTimeout(() => {
      statusMessage.classList.remove('show');
    }, 3000);
  }

  // Toggle collapse
  function toggleCollapse() {
    isCollapsed = !isCollapsed;
    if (isCollapsed) {
      widget.classList.add('collapsed');
      toggleButton.textContent = '+';
    } else {
      widget.classList.remove('collapsed');
      toggleButton.textContent = '−';
    }
  }

  // Dragging functionality
  header.addEventListener('mousedown', (e) => {
    if (e.target === toggleButton) return;
    isDragging = true;
    const rect = widget.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const x = e.clientX - dragOffset.x;
    const y = e.clientY - dragOffset.y;
    widget.style.left = x + 'px';
    widget.style.top = y + 'px';
    widget.style.right = 'auto';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Listen for messages from content script (via window.postMessage)
  window.addEventListener('message', (event) => {
    if (event.data && event.data.source === 'speakify-content') {
      const message = event.data;
      if (message.action === 'recordingStarted') {
        isRecording = true;
        micButton.classList.add('recording');
        micButtonText.textContent = 'Stop Recording';
        recordingStatus.textContent = 'Recording...';
        recordingStatus.className = 'speakify-status info';
      } else if (message.action === 'recordingStopped') {
        isRecording = false;
        micButton.classList.remove('recording');
        micButtonText.textContent = 'Start Recording';
        if (recordingStatus.textContent === 'Recording...') {
          recordingStatus.textContent = 'Recording stopped';
          recordingStatus.className = 'speakify-status info';
        }
      } else if (message.action === 'transcriptionUpdate') {
        transcribedText.value = message.text;
        transcriptionSection.style.display = 'block';
        if (message.isFinal) {
          refineButton.disabled = false;
        }
      } else if (message.action === 'recordingError') {
        isRecording = false;
        micButton.classList.remove('recording');
        micButtonText.textContent = 'Start Recording';
        recordingStatus.textContent = message.error;
        recordingStatus.className = 'speakify-status error';
        showStatus(message.error, 'error');
      } else if (message.action === 'apiKeyResponse') {
        // Handle API key response
        if (message.apiKey) {
          apiKeyInput.value = message.apiKey;
          apiKeyStatus.textContent = 'API key loaded';
          apiKeyStatus.className = 'speakify-status success';
          enableMicButton();
        }
      } else if (message.action === 'saveApiKeyResponse') {
        // Handle save API key response
        if (message.success) {
          apiKeyStatus.textContent = 'API key saved successfully';
          apiKeyStatus.className = 'speakify-status success';
          enableMicButton();
          showStatus('API key saved', 'success');
        } else {
          showStatus('Error: ' + (message.error || 'Failed to save API key'), 'error');
        }
      } else if (message.action === 'refineTextResponse') {
        // Handle refine text response
        refineButton.disabled = false;
        refineButton.textContent = 'Refine with AI';
        if (message.success) {
          refinedText.value = message.refinedText;
          refinedSection.style.display = 'block';
          recordingStatus.textContent = 'Text refined successfully';
          recordingStatus.className = 'speakify-status success';
          showStatus('Text refined successfully', 'success');
        } else {
          showStatus('Error: ' + (message.error || 'Failed to refine text'), 'error');
        }
      } else if (message.action === 'fillInputResponse') {
        // Handle fill input response
        if (message.success) {
          showStatus('Text filled successfully', 'success');
        } else {
          showStatus('Error: ' + (message.error || 'Failed to fill input'), 'error');
        }
      } else if (message.action === 'submitFormResponse') {
        // Handle submit form response
        if (message.success) {
          showStatus('Form submitted successfully', 'success');
        } else {
          showStatus('Error: ' + (message.error || 'Failed to submit form'), 'error');
        }
      } else if (message.action === 'startRecordingResponse' || message.action === 'stopRecordingResponse') {
        if (!message.success) {
          showStatus('Error: ' + (message.error || 'Failed'), 'error');
        }
      }
    }
  });

  // Event listeners
  saveApiKeyBtn.addEventListener('click', saveApiKey);
  apiKeyInput.addEventListener('input', () => {
    if (apiKeyInput.value.trim()) {
      enableMicButton();
    } else {
      micButton.disabled = true;
    }
  });
  micButton.addEventListener('click', toggleRecording);
  refineButton.addEventListener('click', refineWithAI);
  fillInputButton.addEventListener('click', fillInputBox);
  submitButton.addEventListener('click', submitForm);
  toggleButton.addEventListener('click', toggleCollapse);

  console.log('Speakify widget initialized');
})();

