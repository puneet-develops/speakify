// Floating widget for Speakify extension - FlowLog-inspired design
// This runs in the page context

(function() {
  'use strict';

  // Check if widget already exists
  if (document.getElementById('speakify-widget')) {
    console.log('Speakify widget already exists');
    return;
  }

  // Create widget container with FlowLog-inspired design
  const widget = document.createElement('div');
  widget.id = 'speakify-widget';
  widget.className = 'flowlog-widget';
  
  // Widget state
  let currentTab = 'capture';
  let currentView = 'main'; // 'main' or 'settings'
  let isRecording = false;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  let isResizing = false;
  let resizeStartSize = { width: 0, height: 0 };
  let resizeStartPos = { x: 0, y: 0 };
  let isCollapsed = false;
  let isSavingSettings = false; // Flag to prevent re-render when saving
  let settings = {
    role: 'backend',
    tone: 'casual-professional',
    customBehavior: '',
    apiKey: '',
    model: 'sonar',
    tags: [],
    widgetWidth: 480,
    widgetHeight: 'auto',
    lastRefineTone: null // Last selected tone button in refine tab (null = first one default)
  };
  let history = [];

  // Load settings and history
  function loadSettings() {
    window.postMessage({ action: 'getSettings', source: 'speakify-widget' }, '*');
    window.postMessage({ action: 'getHistory', source: 'speakify-widget' }, '*');
  }

  // Render widget HTML
  function renderWidget() {
    if (currentView === 'settings') {
      widget.innerHTML = renderSettingsView();
    } else {
      widget.innerHTML = renderMainView();
    }
    
    // Re-apply collapsed state after rendering
    if (isCollapsed) {
      widget.classList.add('collapsed');
    } else {
      widget.classList.remove('collapsed');
    }
    
    attachEventListeners();
    
    // Update toggle button text after rendering
    const toggleBtn = document.getElementById('flowlog-toggle-btn');
    if (toggleBtn) {
      toggleBtn.textContent = isCollapsed ? '+' : '−';
    }
  }

  function renderMainView() {
    return `
      <div class="flowlog-header">
        <div class="flowlog-logo">
          <span class="flowlog-icon">🎤</span>
          <span class="flowlog-title">Speakify</span>
        </div>
        <div class="flowlog-header-controls">
          <button class="flowlog-icon-btn" id="flowlog-settings-btn" title="Settings">⚙️</button>
          <button class="flowlog-icon-btn" id="flowlog-history-btn" title="History">🕐</button>
          <button class="flowlog-icon-btn" id="flowlog-toggle-btn" title="Minimize">−</button>
        </div>
      </div>
      <div class="flowlog-tabs">
        <button class="flowlog-tab ${currentTab === 'capture' ? 'active' : ''}" data-tab="capture">
          <span class="flowlog-tab-icon">🎤</span> Capture
        </button>
        <button class="flowlog-tab ${currentTab === 'refine' ? 'active' : ''}" data-tab="refine">
          <span class="flowlog-tab-icon">✨</span> Refine
        </button>
        <button class="flowlog-tab ${currentTab === 'history' ? 'active' : ''}" data-tab="history">
          <span class="flowlog-tab-icon">🕐</span> History
        </button>
      </div>
      <div class="flowlog-content">
        ${currentTab === 'capture' ? renderCaptureTab() : ''}
        ${currentTab === 'refine' ? renderRefineTab() : ''}
        ${currentTab === 'history' ? renderHistoryTab() : ''}
      </div>
      <div class="flowlog-resize-handle" id="flowlog-resize-handle" title="Resize"></div>
    `;
  }

  function renderCaptureTab() {
    return `
      <div class="flowlog-capture">
        <div class="flowlog-mic-container">
          <button id="flowlog-mic-button" class="flowlog-mic-button ${isRecording ? 'recording' : ''}" ${!settings.apiKey || currentTab !== 'capture' ? 'disabled' : ''}>
            <span class="flowlog-mic-icon">🎤</span>
          </button>
          <p class="flowlog-mic-hint">${!settings.apiKey ? 'Please set API key in Settings' : currentTab !== 'capture' ? 'Switch to Capture tab to record' : isRecording ? 'Click to stop recording' : 'Click to start talking'}</p>
        </div>
        <div class="flowlog-transcript-section" id="flowlog-transcript-section" style="display: none;">
          <div class="flowlog-section-header">
            <span class="flowlog-section-title">RAW TRANSCRIPT</span>
            <div class="flowlog-section-actions">
              <span class="flowlog-word-count" id="flowlog-word-count">0 words</span>
              <button class="flowlog-icon-btn-small" id="flowlog-clear-transcript" title="Clear">🗑️</button>
            </div>
          </div>
          <textarea id="flowlog-transcript" class="flowlog-textarea"></textarea>
        </div>
        <div class="flowlog-actions">
          <button id="flowlog-refine-btn" class="flowlog-btn flowlog-btn-primary" disabled>
            <span class="flowlog-btn-icon">✨</span> Refine with AI
          </button>
          <button id="flowlog-add-to-log-btn" class="flowlog-btn flowlog-btn-secondary" disabled>
            <span class="flowlog-btn-icon">➕</span> Add to Day Log
          </button>
        </div>
        <p class="flowlog-hint">Record multiple times and generate one final summary</p>
      </div>
    `;
  }

  function renderRefineTab() {
    return `
      <div class="flowlog-refine">
        <div class="flowlog-section-header">
          <span class="flowlog-section-title">SOURCE NOTES</span>
          <button class="flowlog-icon-btn-small" id="flowlog-clear-source">🗑️</button>
        </div>
        <textarea id="flowlog-source-notes" class="flowlog-textarea" placeholder="Paste or type your notes here..."></textarea>
        <div class="flowlog-tone-section">
          <div class="flowlog-section-header">
            <span class="flowlog-section-title">ADJUST TONE & STYLE</span>
          </div>
          <div class="flowlog-tone-buttons">
            <button class="flowlog-tone-btn ${settings.lastRefineTone === 'concise' || (!settings.lastRefineTone) ? 'active' : ''}" data-tone="concise">More concise</button>
            <button class="flowlog-tone-btn ${settings.lastRefineTone === 'detailed' ? 'active' : ''}" data-tone="detailed">More detailed</button>
            <button class="flowlog-tone-btn ${settings.lastRefineTone === 'technical' ? 'active' : ''}" data-tone="technical">More technical</button>
            <button class="flowlog-tone-btn ${settings.lastRefineTone === 'less-technical' ? 'active' : ''}" data-tone="less-technical">Less technical</button>
            <button class="flowlog-tone-btn ${settings.lastRefineTone === 'bullets' ? 'active' : ''}" data-tone="bullets">Bullet points</button>
            <button class="flowlog-tone-btn ${settings.lastRefineTone === 'summary' ? 'active' : ''}" data-tone="summary">Short summary</button>
          </div>
        </div>
        <div class="flowlog-magic-section">
          <button id="flowlog-do-magic-btn" class="flowlog-magic-btn">
            <span class="flowlog-magic-icon">✨</span>
            Do the Magic
          </button>
        </div>
        <div class="flowlog-refined-section">
          <div class="flowlog-section-header">
            <span class="flowlog-section-title">REFINED OUTPUT</span>
            <div class="flowlog-section-actions">
              <button class="flowlog-icon-btn-small" id="flowlog-copy-refined" title="Copy">📋</button>
              <button class="flowlog-icon-btn-small" id="flowlog-edit-refined" title="Edit">✏️</button>
            </div>
          </div>
          <textarea id="flowlog-refined-output" class="flowlog-textarea" readonly></textarea>
        </div>
        <p class="flowlog-hint">Generated with your current role, tone, and template</p>
        <div class="flowlog-refine-actions">
          <button id="flowlog-use-today-btn" class="flowlog-btn flowlog-btn-primary">Use for Today</button>
          <button id="flowlog-save-refined-btn" class="flowlog-btn flowlog-btn-secondary">Save</button>
        </div>
      </div>
    `;
  }

  function renderHistoryTab() {
    if (history.length === 0) {
      return `
        <div class="flowlog-history-empty">
          <p>No history yet. Start recording to see your entries here.</p>
        </div>
      `;
    }
    return `
      <div class="flowlog-history">
        ${history.map((entry, index) => `
          <div class="flowlog-history-entry">
            <div class="flowlog-entry-header">
              <div class="flowlog-entry-date">
                <span class="flowlog-date-icon">📅</span>
                <span>${formatDate(entry.date)}</span>
              </div>
              <div class="flowlog-entry-actions">
                <button class="flowlog-icon-btn-small flowlog-copy-entry" data-index="${index}" title="Copy">📋</button>
                <button class="flowlog-icon-btn-small flowlog-view-entry" data-index="${index}" title="View">👁️</button>
              </div>
            </div>
            <p class="flowlog-entry-text">${entry.text}</p>
            ${entry.tags && entry.tags.length > 0 ? `
              <div class="flowlog-entry-tags">
                <span class="flowlog-tag-icon">🏷️</span>
                ${entry.tags.map(tag => `<span class="flowlog-tag">${tag}</span>`).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderSettingsView() {
    return `
      <div class="flowlog-header">
        <div class="flowlog-header-nav">
          <button class="flowlog-back-btn" id="flowlog-back-btn">←</button>
          <span class="flowlog-title">Settings</span>
        </div>
        <div class="flowlog-header-controls">
          <button class="flowlog-icon-btn" id="flowlog-toggle-btn" title="Minimize">−</button>
        </div>
      </div>
      <div class="flowlog-content">
        <div class="flowlog-settings-content">
          <div class="flowlog-settings-section">
          <h3 class="flowlog-settings-title">WHO ARE YOU?</h3>
          <div class="flowlog-role-grid">
            <button class="flowlog-role-card ${settings.role === 'backend' ? 'active' : ''}" data-role="backend">
              <span class="flowlog-role-icon">🗄️</span>
              <div class="flowlog-role-info">
                <div class="flowlog-role-name">Backend</div>
                <div class="flowlog-role-desc">APIs, infra, debugging</div>
              </div>
            </button>
            <button class="flowlog-role-card ${settings.role === 'frontend' ? 'active' : ''}" data-role="frontend">
              <span class="flowlog-role-icon"><></span>
              <div class="flowlog-role-info">
                <div class="flowlog-role-name">Frontend</div>
                <div class="flowlog-role-desc">UI, components, UX</div>
              </div>
            </button>
            <button class="flowlog-role-card ${settings.role === 'pm' ? 'active' : ''}" data-role="pm">
              <span class="flowlog-role-icon">👥</span>
              <div class="flowlog-role-info">
                <div class="flowlog-role-name">PM</div>
                <div class="flowlog-role-desc">Planning, coordination</div>
              </div>
            </button>
            <button class="flowlog-role-card ${settings.role === 'custom' ? 'active' : ''}" data-role="custom">
              <span class="flowlog-role-icon">🧠</span>
              <div class="flowlog-role-info">
                <div class="flowlog-role-name">Custom</div>
                <div class="flowlog-role-desc">Define your own</div>
              </div>
            </button>
          </div>
        </div>
        <div class="flowlog-settings-section">
          <h3 class="flowlog-settings-title">Tone</h3>
          <select id="flowlog-tone-select" class="flowlog-select">
            <option value="casual-professional" ${settings.tone === 'casual-professional' ? 'selected' : ''}>Casual but professional</option>
            <option value="very-formal" ${settings.tone === 'very-formal' ? 'selected' : ''}>Very formal</option>
            <option value="bullet-heavy" ${settings.tone === 'bullet-heavy' ? 'selected' : ''}>Bullet-heavy</option>
            <option value="brief-summary" ${settings.tone === 'brief-summary' ? 'selected' : ''}>Brief summary</option>
          </select>
        </div>
        <div class="flowlog-settings-section">
          <h3 class="flowlog-settings-title">CUSTOM BEHAVIOR</h3>
          <textarea id="flowlog-custom-behavior" class="flowlog-textarea-large" placeholder="Describe how you want your daily logs to sound. Example: Focus on impact, mention Jira ticket IDs, and keep entries under 3 lines." maxlength="500">${settings.customBehavior}</textarea>
          <div class="flowlog-char-count"><span id="flowlog-char-count">${settings.customBehavior.length}</span> / 500</div>
        </div>
        <div class="flowlog-settings-section">
          <h3 class="flowlog-settings-title">AI PROVIDER & MODEL</h3>
          <select id="flowlog-provider-select" class="flowlog-select">
            <option value="perplexity" selected>Perplexity</option>
          </select>
          <div class="flowlog-api-key-container">
            <input type="password" id="flowlog-api-key" class="flowlog-input" placeholder="API Key" value="${settings.apiKey}">
            <button class="flowlog-icon-btn-small" id="flowlog-toggle-api-key" title="Show/Hide">👁️</button>
          </div>
          <select id="flowlog-model-select" class="flowlog-select">
            <option value="sonar" ${settings.model === 'sonar' ? 'selected' : ''}>Sonar</option>
          </select>
          <p class="flowlog-hint-small">Logic will be connected later.</p>
        </div>
        <div class="flowlog-settings-section">
          <h3 class="flowlog-settings-title">PROJECTS & TAGS</h3>
          <div class="flowlog-tags-container">
            <input type="text" id="flowlog-tag-input" class="flowlog-input" placeholder="Add a tag...">
            <button class="flowlog-btn flowlog-btn-icon" id="flowlog-add-tag-btn">➕</button>
          </div>
          <div class="flowlog-tags-list" id="flowlog-tags-list">
            ${settings.tags.map(tag => `<span class="flowlog-tag-item">${tag} <button class="flowlog-tag-remove" data-tag="${tag}">×</button></span>`).join('')}
          </div>
        </div>
        </div>
      </div>
    `;
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function attachEventListeners() {
    // Tab switching
    document.querySelectorAll('.flowlog-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const newTab = e.currentTarget.dataset.tab;
        
        // If switching away from capture tab and recording is active, stop recording
        if (currentTab === 'capture' && newTab !== 'capture' && isRecording) {
          window.postMessage({
            action: 'stopRecording',
            source: 'speakify-widget'
          }, '*');
        }
        
        currentTab = newTab;
        renderWidget();
      });
    });

    // Settings button
    const settingsBtn = document.getElementById('flowlog-settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        currentView = 'settings';
        renderWidget();
      });
    }

    // Back button
    const backBtn = document.getElementById('flowlog-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        currentView = 'main';
        renderWidget();
      });
    }

    // Toggle button
    const toggleBtn = document.getElementById('flowlog-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        isCollapsed = !isCollapsed;
        widget.classList.toggle('collapsed', isCollapsed);
        toggleBtn.textContent = isCollapsed ? '+' : '−';
      });
    }

    // Mic button
    const micButton = document.getElementById('flowlog-mic-button');
    if (micButton) {
      micButton.addEventListener('click', toggleRecording);
    }

    // Refine button
    const refineBtn = document.getElementById('flowlog-refine-btn');
    if (refineBtn) {
      refineBtn.addEventListener('click', refineWithAI);
    }

    // Add to log button
    const addToLogBtn = document.getElementById('flowlog-add-to-log-btn');
    if (addToLogBtn) {
      addToLogBtn.addEventListener('click', addToHistory);
    }

    // Clear transcript
    const clearTranscript = document.getElementById('flowlog-clear-transcript');
    if (clearTranscript) {
      clearTranscript.addEventListener('click', () => {
        const transcriptEl = document.getElementById('flowlog-transcript');
        if (transcriptEl) {
          transcriptEl.value = '';
          transcriptEl.dataset.userEdited = 'false';
          transcriptEl.dataset.lastUpdate = '';
        }
        document.getElementById('flowlog-transcript-section').style.display = 'none';
        document.getElementById('flowlog-refine-btn').disabled = true;
        document.getElementById('flowlog-add-to-log-btn').disabled = true;
      });
    }

    // Allow manual editing of transcript
    const transcriptEl = document.getElementById('flowlog-transcript');
    if (transcriptEl) {
      // Mark as user-edited when user starts typing
      transcriptEl.addEventListener('focus', () => {
        transcriptEl.dataset.userEdited = 'true';
      });
      
      transcriptEl.addEventListener('input', () => {
        transcriptEl.dataset.userEdited = 'true';
        const wordCount = transcriptEl.value.trim().split(/\s+/).filter(w => w.length > 0).length;
        const wordCountEl = document.getElementById('flowlog-word-count');
        if (wordCountEl) wordCountEl.textContent = `${wordCount} words`;
        
        const refineBtn = document.getElementById('flowlog-refine-btn');
        const addBtn = document.getElementById('flowlog-add-to-log-btn');
        if (refineBtn) refineBtn.disabled = !transcriptEl.value.trim();
        if (addBtn) addBtn.disabled = !transcriptEl.value.trim();
      });
    }

    // Role selection
    document.querySelectorAll('.flowlog-role-card').forEach(card => {
      card.addEventListener('click', (e) => {
        settings.role = e.currentTarget.dataset.role;
        saveSettings(false);
        renderWidget();
      });
    });

    // Tone select
    const toneSelect = document.getElementById('flowlog-tone-select');
    if (toneSelect) {
      toneSelect.addEventListener('change', (e) => {
        settings.tone = e.target.value;
        // Save settings without re-rendering to preserve focus
        saveSettings(false);
      });
    }

    // Custom behavior
    const customBehavior = document.getElementById('flowlog-custom-behavior');
    if (customBehavior) {
      customBehavior.addEventListener('input', (e) => {
        settings.customBehavior = e.target.value;
        const charCountEl = document.getElementById('flowlog-char-count');
        if (charCountEl) {
          charCountEl.textContent = e.target.value.length;
        }
        // Save settings without re-rendering to preserve focus
        saveSettings(false);
      });
    }

    // API key
    const apiKeyInput = document.getElementById('flowlog-api-key');
    if (apiKeyInput) {
      apiKeyInput.addEventListener('input', (e) => {
        settings.apiKey = e.target.value;
        // Save settings without re-rendering to preserve focus
        saveSettings(false);
      });
    }

    // Toggle API key visibility
    const toggleApiKey = document.getElementById('flowlog-toggle-api-key');
    if (toggleApiKey) {
      toggleApiKey.addEventListener('click', () => {
        const type = apiKeyInput.type === 'password' ? 'text' : 'password';
        apiKeyInput.type = type;
      });
    }

    // Add tag
    const addTagBtn = document.getElementById('flowlog-add-tag-btn');
    if (addTagBtn) {
      addTagBtn.addEventListener('click', addTag);
    }

    const tagInput = document.getElementById('flowlog-tag-input');
    if (tagInput) {
      tagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          addTag();
        }
      });
    }

    // Model select
    const modelSelect = document.getElementById('flowlog-model-select');
    if (modelSelect) {
      modelSelect.addEventListener('change', (e) => {
        settings.model = e.target.value;
        saveSettings(false);
      });
    }

    // Remove tag
    document.querySelectorAll('.flowlog-tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tag = e.target.dataset.tag;
        settings.tags = settings.tags.filter(t => t !== tag);
        saveSettings();
        renderWidget();
      });
    });

    // Tone buttons in Refine tab - just select, don't call API
    document.querySelectorAll('.flowlog-tone-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tone = e.currentTarget.dataset.tone;
        // Remove active class from all buttons
        document.querySelectorAll('.flowlog-tone-btn').forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        e.currentTarget.classList.add('active');
        // Save the selected tone
        settings.lastRefineTone = tone;
        saveSettings(false);
      });
    });

    // Do the Magic button
    const doMagicBtn = document.getElementById('flowlog-do-magic-btn');
    if (doMagicBtn) {
      doMagicBtn.addEventListener('click', () => {
        doTheMagic();
      });
    }

    // Use for today
    const useTodayBtn = document.getElementById('flowlog-use-today-btn');
    if (useTodayBtn) {
      useTodayBtn.addEventListener('click', () => {
        const refinedText = document.getElementById('flowlog-refined-output').value;
        if (refinedText) {
          fillInputBox(refinedText);
        }
      });
    }

    // Save refined
    const saveRefinedBtn = document.getElementById('flowlog-save-refined-btn');
    if (saveRefinedBtn) {
      saveRefinedBtn.addEventListener('click', () => {
        const refinedText = document.getElementById('flowlog-refined-output').value;
        if (refinedText) {
          addToHistory(refinedText);
        }
      });
    }

    // Copy refined
    const copyRefined = document.getElementById('flowlog-copy-refined');
    if (copyRefined) {
      copyRefined.addEventListener('click', () => {
        const refinedText = document.getElementById('flowlog-refined-output').value;
        navigator.clipboard.writeText(refinedText);
        showStatus('Copied to clipboard', 'success');
      });
    }

    // Copy entry from history
    document.querySelectorAll('.flowlog-copy-entry').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(e.currentTarget.dataset.index);
        if (history[index]) {
          navigator.clipboard.writeText(history[index].text);
          showStatus('Copied to clipboard', 'success');
        }
      });
    });

    // View entry from history
    document.querySelectorAll('.flowlog-view-entry').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(e.currentTarget.dataset.index);
        if (history[index]) {
          // Switch to refine tab and load the entry
          currentTab = 'refine';
          renderWidget();
          setTimeout(() => {
            const sourceNotes = document.getElementById('flowlog-source-notes');
            if (sourceNotes) {
              sourceNotes.value = history[index].text;
            }
          }, 100);
        }
      });
    });

    // Dragging
    const header = widget.querySelector('.flowlog-header');
    if (header) {
      header.addEventListener('mousedown', startDrag);
    }

    // Resizing
    const resizeHandle = document.getElementById('flowlog-resize-handle');
    if (resizeHandle) {
      resizeHandle.addEventListener('mousedown', startResize);
    }
  }

  function toggleRecording() {
    if (!settings.apiKey) {
      showStatus('Please set your API key in Settings', 'error');
      return;
    }

    // Only allow recording in capture tab
    if (currentTab !== 'capture') {
      showStatus('Switch to Capture tab to record', 'error');
      return;
    }

    // If starting a new recording, reset the transcript user-edited flag
    if (!isRecording) {
      const transcriptEl = document.getElementById('flowlog-transcript');
      if (transcriptEl) {
        transcriptEl.dataset.userEdited = 'false';
        transcriptEl.dataset.lastUpdate = '';
      }
    }

    window.postMessage({
      action: isRecording ? 'stopRecording' : 'startRecording',
      source: 'speakify-widget'
    }, '*');
  }

  function refineWithAI() {
    const transcript = document.getElementById('flowlog-transcript').value.trim();
    if (!transcript) {
      showStatus('No transcript to refine', 'error');
      return;
    }

    if (!settings.apiKey) {
      showStatus('Please set your API key in Settings', 'error');
      return;
    }

    // Stop recording if it's active before switching tabs
    if (isRecording) {
      window.postMessage({
        action: 'stopRecording',
        source: 'speakify-widget'
      }, '*');
    }

    // Switch to refine tab and set source notes
    currentTab = 'refine';
    renderWidget();
    
    // Wait for DOM to update before setting value
    setTimeout(() => {
      const sourceNotesEl = document.getElementById('flowlog-source-notes');
      if (sourceNotesEl) {
        sourceNotesEl.value = transcript;
      }
      // Don't auto-refine - user will click "Do the Magic" button
    }, 100);
  }

  function doTheMagic() {
    const sourceNotes = document.getElementById('flowlog-source-notes').value.trim();
    if (!sourceNotes) {
      showStatus('No source notes to refine', 'error');
      return;
    }

    if (!settings.apiKey) {
      showStatus('Please set your API key in Settings', 'error');
      return;
    }

    // Use lastRefineTone if set, otherwise use first tone button (concise) or settings.tone
    const selectedTone = settings.lastRefineTone || 'concise';
    refineWithTone(selectedTone);
  }

  function refineWithTone(toneOverride = null) {
    const sourceNotes = document.getElementById('flowlog-source-notes').value.trim();
    if (!sourceNotes) {
      showStatus('No source notes to refine', 'error');
      return;
    }

    // Use toneOverride if provided, otherwise use lastRefineTone, otherwise default to 'concise'
    const tone = toneOverride || settings.lastRefineTone || 'concise';
    const refineBtn = document.getElementById('flowlog-refine-btn');
    if (refineBtn) {
      refineBtn.disabled = true;
      refineBtn.textContent = 'Refining...';
    }

    // Build system prompt based on settings
    let systemPrompt = buildSystemPrompt(tone);

    window.postMessage({
      action: 'refineText',
      text: sourceNotes,
      apiKey: settings.apiKey,
      systemPrompt: systemPrompt,
      source: 'speakify-widget'
    }, '*');
  }

  function buildSystemPrompt(tone = null) {
    const role = settings.role;
    const selectedTone = tone || settings.tone;
    const customBehavior = settings.customBehavior;

    let prompt = "You are a timesheet assistant for a ";
    
    if (role === 'backend') {
      prompt += "backend developer. Focus on APIs, infrastructure, debugging, and technical implementations. ";
    } else if (role === 'frontend') {
      prompt += "frontend developer. Focus on UI, components, UX, and user-facing features. ";
    } else if (role === 'pm') {
      prompt += "project manager. Focus on planning, coordination, and project management tasks. ";
    } else if (role === 'custom') {
      // For custom role, use customBehavior if available, otherwise generic
      if (customBehavior && customBehavior.trim()) {
        prompt += "developer. " + customBehavior.trim() + " ";
      } else {
        prompt += "developer. ";
      }
    } else {
      prompt += "developer. ";
    }

    if (selectedTone === 'very-formal') {
      prompt += "Use very formal language. ";
    } else if (selectedTone === 'bullet-heavy') {
      prompt += "Format as bullet points. ";
    } else if (selectedTone === 'brief-summary') {
      prompt += "Keep it very brief and concise (10-20 words). ";
    } else {
      prompt += "Use casual but professional language. ";
    }

    if (selectedTone === 'concise') {
      prompt += "Be more concise. ";
    } else if (selectedTone === 'detailed') {
      prompt += "Be more detailed. ";
    } else if (selectedTone === 'technical') {
      prompt += "Use more technical terminology. ";
    } else if (selectedTone === 'less-technical') {
      prompt += "Use less technical language, more accessible. ";
    } else if (selectedTone === 'bullets') {
      prompt += "Format as bullet points. ";
    } else if (selectedTone === 'summary') {
      prompt += "Create a short summary. ";
    }

    prompt += "The output should be: 1) Clear and professional, 2) Concise (typically 10-30 words), 3) Suitable for daily timesheet logging. Remove filler words, fix grammar, and make it sound professional. ";

    // Add customBehavior only if role is not 'custom' (already added above for custom role)
    if (customBehavior && customBehavior.trim() && role !== 'custom') {
      prompt += customBehavior.trim() + " ";
    }

    prompt += "Return ONLY the refined text without any additional commentary, explanations, or formatting marks.";

    return prompt;
  }

  function addToHistory(text = null) {
    const textToAdd = text || document.getElementById('flowlog-transcript').value.trim();
    if (!textToAdd) {
      showStatus('No text to add', 'error');
      return;
    }

    // Stop recording if it's active
    if (isRecording) {
      window.postMessage({
        action: 'stopRecording',
        source: 'speakify-widget'
      }, '*');
    }

    const entry = {
      date: new Date().toISOString(),
      text: textToAdd,
      tags: [...settings.tags]
    };

    history.unshift(entry);
    if (history.length > 50) history.pop(); // Keep last 50 entries

    saveHistory();
    showStatus('Added to history', 'success');

    // Clear transcript
    const transcriptEl = document.getElementById('flowlog-transcript');
    if (transcriptEl) {
      transcriptEl.value = '';
    }
    const transcriptSection = document.getElementById('flowlog-transcript-section');
    if (transcriptSection) {
      transcriptSection.style.display = 'none';
    }
    const refineBtn = document.getElementById('flowlog-refine-btn');
    if (refineBtn) {
      refineBtn.disabled = true;
    }
    const addBtn = document.getElementById('flowlog-add-to-log-btn');
    if (addBtn) {
      addBtn.disabled = true;
    }
  }

  function fillInputBox(text) {
    window.postMessage({
      action: 'fillInput',
      text: text,
      source: 'speakify-widget'
    }, '*');
  }

  function addTag() {
    const tagInput = document.getElementById('flowlog-tag-input');
    const tag = tagInput.value.trim();
    if (tag && !settings.tags.includes(tag)) {
      settings.tags.push(tag);
      saveSettings(false); // Save settings
      renderWidget(); // Re-render to show new tag
      tagInput.value = '';
    }
  }

  function saveSettings(shouldRender = false) {
    // Save the complete settings object to local storage
    // This replaces the entire settings object, so all properties are saved together
    // No conflicts because we're using a single storage key and replacing it entirely
    const settingsToSave = {
      role: settings.role,
      tone: settings.tone,
      customBehavior: settings.customBehavior,
      apiKey: settings.apiKey,
      model: settings.model,
      tags: [...settings.tags], // Create a copy of the array to avoid reference issues
      widgetWidth: settings.widgetWidth,
      widgetHeight: settings.widgetHeight,
      lastRefineTone: settings.lastRefineTone
    };
    
    // Set flag to prevent re-render when response comes back
    isSavingSettings = true;
    
    window.postMessage({
      action: 'saveSettings',
      settings: settingsToSave,
      source: 'speakify-widget'
    }, '*');
    
    // Only re-render if explicitly requested (e.g., when changing role)
    if (shouldRender && currentView === 'settings') {
      renderWidget();
    }
  }

  function saveHistory() {
    window.postMessage({
      action: 'saveHistory',
      history: history,
      source: 'speakify-widget'
    }, '*');
  }

  function showStatus(message, type = 'info') {
    // Create temporary status message
    const statusEl = document.createElement('div');
    statusEl.className = `flowlog-status-message ${type} show`;
    statusEl.textContent = message;
    widget.appendChild(statusEl);
    setTimeout(() => {
      statusEl.remove();
    }, 3000);
  }

  function startDrag(e) {
    if (e.target.closest('.flowlog-header-controls')) return;
    if (e.target.closest('.flowlog-resize-handle')) return;
    isDragging = true;
    const rect = widget.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    // Disable transitions during drag for smooth movement
    widget.style.transition = 'none';
    widget.style.willChange = 'transform';
    
    e.preventDefault();
  }

  function startResize(e) {
    if (isCollapsed) return; // Don't allow resize when collapsed
    isResizing = true;
    const rect = widget.getBoundingClientRect();
    resizeStartSize.width = rect.width;
    resizeStartSize.height = rect.height;
    resizeStartPos.x = e.clientX;
    resizeStartPos.y = e.clientY;
    e.preventDefault();
    e.stopPropagation();
  }

  // Use requestAnimationFrame for smooth dragging
  let rafId = null;
  
  document.addEventListener('mousemove', (e) => {
    if (isResizing) {
      // Cancel any pending animation frame
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      
      const deltaX = e.clientX - resizeStartPos.x;
      const deltaY = e.clientY - resizeStartPos.y;
      
      let newWidth = resizeStartSize.width + deltaX;
      let newHeight = resizeStartSize.height + deltaY;
      
      // Minimum size constraints
      const minWidth = 300;
      const maxWidth = window.innerWidth - 40;
      const minHeight = 200;
      const maxHeight = window.innerHeight - 40;
      
      newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
      newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
      
      // Disable transitions during resize
      widget.style.transition = 'none';
      
      widget.style.width = newWidth + 'px';
      widget.style.height = newHeight + 'px';
      widget.style.maxWidth = 'none';
      widget.style.maxHeight = 'none';
      
      // Save size to settings (throttled)
      settings.widgetWidth = newWidth;
      settings.widgetHeight = newHeight;
      saveSettings(false);
    } else if (isDragging) {
      // Cancel any pending animation frame
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      
      // Use requestAnimationFrame for smooth updates
      rafId = requestAnimationFrame(() => {
        const x = e.clientX - dragOffset.x;
        const y = e.clientY - dragOffset.y;
        
        // Constrain to viewport
        const maxX = window.innerWidth - widget.offsetWidth;
        const maxY = window.innerHeight - widget.offsetHeight;
        
        const constrainedX = Math.max(0, Math.min(x, maxX));
        const constrainedY = Math.max(0, Math.min(y, maxY));
        
        widget.style.left = constrainedX + 'px';
        widget.style.top = constrainedY + 'px';
        widget.style.right = 'auto';
      });
    }
  });

  document.addEventListener('mouseup', () => {
    if (isDragging || isResizing) {
      // Cancel any pending animation frame
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      
      // Re-enable transitions after drag/resize ends
      widget.style.transition = '';
      widget.style.willChange = '';
      widget.style.transform = ''; // Clear transform
    }
    
    isDragging = false;
    isResizing = false;
  });

  // Listen for messages from content script
  window.addEventListener('message', (event) => {
    if (event.data && event.data.source === 'speakify-content') {
      const message = event.data;
      
      if (message.action === 'recordingStarted') {
        isRecording = true;
        const micButton = document.getElementById('flowlog-mic-button');
        if (micButton) {
          micButton.classList.add('recording');
          micButton.querySelector('.flowlog-mic-icon').textContent = '⏹️';
        }
        const hint = document.querySelector('.flowlog-mic-hint');
        if (hint) hint.textContent = 'Click to stop recording';
      } else if (message.action === 'recordingStopped') {
        isRecording = false;
        const micButton = document.getElementById('flowlog-mic-button');
        if (micButton) {
          micButton.classList.remove('recording');
          micButton.querySelector('.flowlog-mic-icon').textContent = '🎤';
        }
        const hint = document.querySelector('.flowlog-mic-hint');
        if (hint) hint.textContent = 'Click to start talking';
      } else if (message.action === 'transcriptionUpdate') {
        const transcript = document.getElementById('flowlog-transcript');
        if (transcript) {
          // Check if user is currently editing (has focus)
          const isFocused = document.activeElement === transcript;
          const userEdited = transcript.dataset.userEdited === 'true';
          
          // Only update automatically if transcript doesn't have focus and wasn't manually edited
          // Or if the new text is clearly an extension of the current text (for continuous transcription)
          if (!isFocused && !userEdited) {
            transcript.value = message.text;
            transcript.dataset.lastUpdate = message.text;
            transcript.dataset.userEdited = 'false';
          } else if (!isFocused && userEdited) {
            // If user edited but lost focus, check if new text extends the current text
            const currentText = transcript.value;
            const newText = message.text;
            // If new text contains current text as a prefix, it's a continuation
            if (newText.startsWith(currentText.trim())) {
              transcript.value = newText;
              transcript.dataset.lastUpdate = newText;
            }
          }
          
          const section = document.getElementById('flowlog-transcript-section');
          if (section) section.style.display = 'block';
          
          const displayText = transcript.value;
          const wordCount = displayText.trim().split(/\s+/).filter(w => w.length > 0).length;
          const wordCountEl = document.getElementById('flowlog-word-count');
          if (wordCountEl) wordCountEl.textContent = `${wordCount} words`;
          
          const refineBtn = document.getElementById('flowlog-refine-btn');
          const addBtn = document.getElementById('flowlog-add-to-log-btn');
          if (refineBtn) refineBtn.disabled = !displayText.trim();
          if (addBtn) addBtn.disabled = !displayText.trim();
        }
      } else if (message.action === 'recordingError') {
        isRecording = false;
        showStatus(message.error, 'error');
      } else if (message.action === 'refineTextResponse') {
        const refinedOutput = document.getElementById('flowlog-refined-output');
        if (refinedOutput) {
          if (message.success && message.refinedText) {
            refinedOutput.value = message.refinedText;
          } else if (message.error) {
            refinedOutput.value = message.error;
            // Show error status if there's an error
            showStatus(message.error, 'error');
          } else {
            refinedOutput.value = 'Error refining text';
            showStatus('Error refining text', 'error');
          }
        }
        const refineBtn = document.getElementById('flowlog-refine-btn');
        if (refineBtn) {
          refineBtn.disabled = false;
          refineBtn.innerHTML = '<span class="flowlog-btn-icon">✨</span> Refine with AI';
        }
      } else if (message.action === 'fillInputResponse') {
        if (message.success) {
          showStatus('Text filled successfully', 'success');
        } else {
          showStatus('Error: ' + (message.error || 'Failed to fill input'), 'error');
        }
      } else if (message.action === 'settingsResponse') {
        if (message.settings) {
          // Merge loaded settings with defaults to ensure all properties exist
          settings = {
            role: 'backend',
            tone: 'casual-professional',
            customBehavior: '',
            apiKey: '',
            model: 'sonar',
            tags: [],
            widgetWidth: 480,
            widgetHeight: 'auto',
            ...message.settings
          };
          // Apply saved widget size
          if (settings.widgetWidth) {
            widget.style.width = settings.widgetWidth + 'px';
            widget.style.maxWidth = 'none';
          }
          if (settings.widgetHeight && settings.widgetHeight !== 'auto') {
            widget.style.height = settings.widgetHeight + 'px';
            widget.style.maxHeight = 'none';
          }
          
          // Only re-render if we're loading settings (not saving)
          // This prevents the input from losing focus when typing
          if (!isSavingSettings) {
            renderWidget();
          }
          // Reset the flag after handling the response
          isSavingSettings = false;
        } else {
          // No settings found, save defaults to storage
          isSavingSettings = false; // Reset flag
          saveSettings(false);
        }
      } else if (message.action === 'historyResponse') {
        if (message.history) {
          history = message.history || [];
          if (currentTab === 'history') {
            renderWidget();
          }
        } else {
          history = [];
        }
      }
    }
  });

  // Inject CSS
  const style = document.createElement('style');
  style.textContent = getWidgetCSS();
  document.head.appendChild(style);
  document.body.appendChild(widget);

  // Initial render
  loadSettings();
  renderWidget();

  console.log('Speakify widget initialized');
})();

// CSS will be in a separate function for better organization
function getWidgetCSS() {
  return `
    .flowlog-widget {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 480px;
      max-width: calc(100vw - 40px);
      max-height: 90vh;
      background: #1a1a1a;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      font-size: 14px;
      color: #e0e0e0;
      overflow: hidden;
      transition: all 0.3s ease;
      user-select: none;
      display: flex;
      flex-direction: column;
    }
    .flowlog-widget.collapsed {
      width: 200px;
      max-width: calc(100vw - 40px);
      height: auto;
      min-height: auto;
      max-height: none;
    }
    @media (max-width: 768px) {
      .flowlog-widget {
        width: calc(100vw - 40px);
        max-width: 100%;
        top: 10px;
        right: 10px;
        left: 10px;
        max-height: calc(100vh - 20px);
      }
      .flowlog-widget.collapsed {
        width: 180px;
        max-width: calc(100vw - 20px);
      }
    }
    @media (max-width: 480px) {
      .flowlog-widget {
        width: calc(100vw - 20px);
        top: 10px;
        right: 10px;
        left: 10px;
        border-radius: 8px;
      }
      .flowlog-widget.collapsed {
        width: 160px;
      }
    }
    .flowlog-widget.collapsed .flowlog-content {
      display: none !important;
    }
    .flowlog-widget.collapsed .flowlog-tabs {
      display: none !important;
    }
    .flowlog-widget.collapsed .flowlog-resize-handle {
      display: none !important;
    }
    .flowlog-header {
      background: #252525;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #333;
      cursor: move;
    }
    @media (max-width: 480px) {
      .flowlog-header {
        padding: 10px 12px;
      }
      .flowlog-logo {
        font-size: 14px;
      }
    }
    .flowlog-logo {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 16px;
    }
    .flowlog-icon {
      font-size: 20px;
    }
    .flowlog-header-controls {
      display: flex;
      gap: 8px;
    }
    .flowlog-icon-btn {
      background: transparent;
      border: none;
      color: #e0e0e0;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: background 0.2s;
    }
    .flowlog-icon-btn:hover {
      background: #333;
    }
    .flowlog-header-nav {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .flowlog-back-btn {
      background: transparent;
      border: none;
      color: #e0e0e0;
      font-size: 18px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: background 0.2s;
    }
    .flowlog-back-btn:hover {
      background: #333;
    }
    .flowlog-tabs {
      display: flex;
      background: #252525;
      border-bottom: 1px solid #333;
    }
    .flowlog-tab {
      flex: 1;
      background: transparent;
      border: none;
      color: #888;
      padding: 12px 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 13px;
      transition: all 0.2s;
      border-bottom: 2px solid transparent;
    }
    @media (max-width: 480px) {
      .flowlog-tab {
        padding: 10px 8px;
        font-size: 12px;
        gap: 4px;
      }
      .flowlog-tab-icon {
        font-size: 14px;
      }
    }
    .flowlog-tab:hover {
      color: #e0e0e0;
      background: #2a2a2a;
    }
    .flowlog-tab.active {
      color: #4ade80;
      border-bottom-color: #4ade80;
      background: #1a1a1a;
    }
    .flowlog-tab-icon {
      font-size: 16px;
    }
    .flowlog-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      background: #1a1a1a;
    }
    @media (max-width: 768px) {
      .flowlog-content {
        padding: 16px;
      }
    }
    @media (max-width: 480px) {
      .flowlog-content {
        padding: 12px;
      }
    }
    .flowlog-capture {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }
    .flowlog-mic-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .flowlog-mic-button {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
      color: white;
      font-size: 48px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
      box-shadow: 0 4px 20px rgba(74, 222, 128, 0.3);
    }
    @media (max-width: 480px) {
      .flowlog-mic-button {
        width: 100px;
        height: 100px;
        font-size: 40px;
      }
    }
    .flowlog-mic-button:hover:not(:disabled) {
      transform: scale(1.05);
      box-shadow: 0 6px 30px rgba(74, 222, 128, 0.4);
    }
    .flowlog-mic-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .flowlog-mic-button.recording {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      animation: flowlog-pulse 1.5s infinite;
      box-shadow: 0 4px 20px rgba(239, 68, 68, 0.3);
    }
    @keyframes flowlog-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.05); }
    }
    .flowlog-mic-hint {
      color: #888;
      font-size: 13px;
      margin: 0;
    }
    .flowlog-transcript-section {
      width: 100%;
    }
    .flowlog-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .flowlog-section-title {
      font-size: 11px;
      font-weight: 600;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .flowlog-section-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .flowlog-word-count {
      font-size: 11px;
      color: #888;
    }
    .flowlog-icon-btn-small {
      background: transparent;
      border: none;
      color: #888;
      cursor: pointer;
      font-size: 14px;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s;
    }
    .flowlog-icon-btn-small:hover {
      background: #333;
      color: #e0e0e0;
    }
    .flowlog-textarea {
      width: 100%;
      min-height: 100px;
      background: #252525;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 12px;
      color: #e0e0e0;
      font-size: 13px;
      font-family: inherit;
      resize: vertical;
      box-sizing: border-box;
    }
    @media (max-width: 480px) {
      .flowlog-textarea {
        padding: 10px;
        font-size: 14px;
        min-height: 80px;
      }
      .flowlog-textarea-large {
        min-height: 100px;
        padding: 10px;
        font-size: 14px;
      }
      .flowlog-input {
        padding: 8px 10px;
        font-size: 14px;
      }
      .flowlog-select {
        padding: 8px 10px;
        font-size: 14px;
      }
    }
    .flowlog-textarea:focus {
      outline: none;
      border-color: #4ade80;
    }
    .flowlog-textarea[readonly] {
      background: #1f1f1f;
      color: #aaa;
    }
    .flowlog-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
    }
    .flowlog-btn {
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .flowlog-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .flowlog-btn-primary {
      background: #4ade80;
      color: #1a1a1a;
    }
    .flowlog-btn-primary:hover:not(:disabled) {
      background: #22c55e;
      transform: translateY(-1px);
    }
    .flowlog-btn-secondary {
      background: #333;
      color: #e0e0e0;
    }
    .flowlog-btn-secondary:hover:not(:disabled) {
      background: #404040;
    }
    .flowlog-btn-icon {
      padding: 8px;
      width: 36px;
    }
    .flowlog-hint {
      font-size: 12px;
      color: #666;
      text-align: center;
      margin: 0;
    }
    .flowlog-refine {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .flowlog-tone-section {
      margin-top: 8px;
    }
    .flowlog-tone-buttons {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 12px;
    }
    @media (max-width: 480px) {
      .flowlog-tone-buttons {
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
      }
      .flowlog-tone-btn {
        font-size: 11px;
        padding: 6px 10px;
      }
    }
    .flowlog-tone-btn {
      padding: 8px 12px;
      background: #252525;
      border: 1px solid #333;
      border-radius: 6px;
      color: #e0e0e0;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .flowlog-tone-btn:hover {
      background: #333;
      border-color: #4ade80;
    }
    .flowlog-tone-btn.active {
      background: #1f3a1f;
      border-color: #4ade80;
      color: #4ade80;
    }
    .flowlog-magic-section {
      margin-top: 16px;
      margin-bottom: 8px;
    }
    .flowlog-magic-btn {
      width: 100%;
      padding: 14px 20px;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%);
      background-size: 200% 200%;
      color: white;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .flowlog-magic-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
      background-position: 100% 0;
      animation: flowlog-gradient-shift 3s ease infinite;
    }
    .flowlog-magic-btn:active:not(:disabled) {
      transform: translateY(0);
    }
    .flowlog-magic-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .flowlog-magic-icon {
      font-size: 18px;
    }
    @keyframes flowlog-gradient-shift {
      0%, 100% {
        background-position: 0% 50%;
      }
      50% {
        background-position: 100% 50%;
      }
    }
    .flowlog-refined-section {
      margin-top: 8px;
    }
    .flowlog-refine-actions {
      display: flex;
      gap: 12px;
      margin-top: 12px;
    }
    .flowlog-refine-actions .flowlog-btn {
      flex: 1;
    }
    @media (max-width: 480px) {
      .flowlog-refine-actions {
        flex-direction: column;
        gap: 8px;
      }
      .flowlog-actions {
        gap: 8px;
      }
      .flowlog-btn {
        padding: 10px 16px;
        font-size: 13px;
      }
    }
    .flowlog-history {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .flowlog-history-empty {
      text-align: center;
      color: #666;
      padding: 40px 20px;
    }
    .flowlog-history-entry {
      background: #252525;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 16px;
    }
    .flowlog-entry-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .flowlog-entry-date {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #888;
      font-size: 12px;
    }
    .flowlog-entry-actions {
      display: flex;
      gap: 4px;
    }
    .flowlog-entry-text {
      color: #e0e0e0;
      font-size: 13px;
      line-height: 1.6;
      margin: 0 0 12px 0;
    }
    .flowlog-entry-tags {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .flowlog-tag {
      background: #333;
      color: #4ade80;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
    }
    .flowlog-settings-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    @media (max-width: 768px) {
      .flowlog-settings-content {
        gap: 20px;
      }
    }
    @media (max-width: 480px) {
      .flowlog-settings-content {
        gap: 16px;
      }
      .flowlog-settings-section {
        gap: 10px;
      }
      .flowlog-settings-title {
        font-size: 11px;
      }
    }
    .flowlog-settings-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .flowlog-settings-title {
      font-size: 12px;
      font-weight: 600;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0;
    }
    .flowlog-role-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    @media (max-width: 480px) {
      .flowlog-role-grid {
        grid-template-columns: 1fr;
        gap: 10px;
      }
      .flowlog-role-card {
        padding: 12px;
      }
      .flowlog-role-icon {
        font-size: 20px;
      }
    }
    .flowlog-role-card {
      background: #252525;
      border: 2px solid #333;
      border-radius: 8px;
      padding: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: all 0.2s;
    }
    .flowlog-role-card:hover {
      border-color: #4ade80;
      background: #2a2a2a;
    }
    .flowlog-role-card.active {
      border-color: #4ade80;
      background: #1f3a1f;
    }
    .flowlog-role-icon {
      font-size: 24px;
    }
    .flowlog-role-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .flowlog-role-name {
      font-weight: 600;
      color: #e0e0e0;
    }
    .flowlog-role-desc {
      font-size: 12px;
      color: #888;
    }
    .flowlog-select {
      width: 100%;
      padding: 10px 12px;
      background: #252525;
      border: 1px solid #333;
      border-radius: 8px;
      color: #e0e0e0;
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
    }
    .flowlog-select:focus {
      outline: none;
      border-color: #4ade80;
    }
    .flowlog-textarea-large {
      width: 100%;
      min-height: 120px;
      background: #252525;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 12px;
      color: #e0e0e0;
      font-size: 13px;
      font-family: inherit;
      resize: vertical;
      box-sizing: border-box;
    }
    .flowlog-textarea-large:focus {
      outline: none;
      border-color: #4ade80;
    }
    .flowlog-char-count {
      text-align: right;
      font-size: 11px;
      color: #666;
      margin-top: 4px;
    }
    .flowlog-api-key-container {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .flowlog-input {
      flex: 1;
      padding: 10px 12px;
      background: #252525;
      border: 1px solid #333;
      border-radius: 8px;
      color: #e0e0e0;
      font-size: 13px;
      font-family: inherit;
      box-sizing: border-box;
    }
    .flowlog-input:focus {
      outline: none;
      border-color: #4ade80;
    }
    .flowlog-hint-small {
      font-size: 11px;
      color: #666;
      margin: 4px 0 0 0;
    }
    .flowlog-tags-container {
      display: flex;
      gap: 8px;
    }
    .flowlog-tags-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    .flowlog-tag-item {
      background: #333;
      color: #e0e0e0;
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .flowlog-tag-remove {
      background: transparent;
      border: none;
      color: #888;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      padding: 0;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .flowlog-tag-remove:hover {
      color: #e0e0e0;
    }
    .flowlog-status-message {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      opacity: 0;
      transition: all 0.3s;
      pointer-events: none;
      z-index: 1000000;
      max-width: calc(100vw - 40px);
      text-align: center;
    }
    @media (max-width: 480px) {
      .flowlog-status-message {
        bottom: 10px;
        left: 10px;
        right: 10px;
        transform: translateY(20px);
        padding: 10px 16px;
        font-size: 12px;
        max-width: calc(100vw - 20px);
      }
      .flowlog-status-message.show {
        transform: translateY(0);
      }
    }
    .flowlog-status-message.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    .flowlog-status-message.success {
      background: #1f3a1f;
      color: #4ade80;
      border: 1px solid #22c55e;
    }
    .flowlog-status-message.error {
      background: #3a1f1f;
      color: #ef4444;
      border: 1px solid #dc2626;
    }
    .flowlog-status-message.info {
      background: #1f2a3a;
      color: #60a5fa;
      border: 1px solid #3b82f6;
    }
    .flowlog-content::-webkit-scrollbar {
      width: 6px;
    }
    .flowlog-content::-webkit-scrollbar-track {
      background: #1a1a1a;
    }
    .flowlog-content::-webkit-scrollbar-thumb {
      background: #333;
      border-radius: 3px;
    }
    .flowlog-content::-webkit-scrollbar-thumb:hover {
      background: #404040;
    }
    .flowlog-resize-handle {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 20px;
      height: 20px;
      cursor: nwse-resize;
      background: linear-gradient(135deg, transparent 0%, transparent 40%, #4ade80 40%, #4ade80 45%, transparent 45%, transparent 60%, #4ade80 60%, #4ade80 65%, transparent 65%, transparent 80%, #4ade80 80%, #4ade80 85%, transparent 85%);
      border-bottom-right-radius: 12px;
      z-index: 10;
      opacity: 0.6;
      transition: opacity 0.2s;
    }
    .flowlog-resize-handle:hover {
      opacity: 1;
      background: linear-gradient(135deg, transparent 0%, transparent 40%, #22c55e 40%, #22c55e 45%, transparent 45%, transparent 60%, #22c55e 60%, #22c55e 65%, transparent 65%, transparent 80%, #22c55e 80%, #22c55e 85%, transparent 85%);
    }
    .flowlog-widget.collapsed .flowlog-resize-handle {
      display: none;
    }
    @media (max-width: 768px) {
      .flowlog-resize-handle {
        width: 24px;
        height: 24px;
      }
    }
  `;
}

