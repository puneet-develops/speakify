# Speakify - Voice to Text with AI Refinement

A Chrome browser extension that captures voice input, transcribes it to text, refines it using Perplexity AI, and auto-fills the result into web forms.

## Features

- 🎤 **Voice Recording**: Record your voice using the browser's built-in speech recognition
- 🤖 **AI Refinement**: Refine transcribed text using Perplexity AI for clarity and professionalism
- ✍️ **Auto-Fill**: Automatically fill input fields on any website
- 📤 **Form Submission**: Submit forms with a single click

## Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd speakify
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in the top right)

4. Click "Load unpacked" and select the `speakify` directory

5. The extension icon should appear in your Chrome toolbar

## Setup

1. After installing the extension, navigate to any webpage

2. You'll see a floating widget in the top-right corner

3. Enter your Perplexity API key in the widget and click "Save"
   - Get your API key from [Perplexity AI](https://www.perplexity.ai/)

4. The API key is stored securely in local storage (persists across browser sessions)

## Usage

1. **Navigate to a webpage** with an input field (e.g., a task input box)

2. **The floating widget** will appear in the top-right corner

3. **Click "Start Recording"** to begin voice recording
   - Speak clearly into your microphone
   - Click "Stop Recording" when finished

4. **Review the transcribed text** in the widget

5. **Click "Refine with AI"** to improve the text using Perplexity AI
   - Wait for the AI to process and refine your text

6. **Click "Fill Input"** to automatically fill the input field on the current page

7. **Click "Submit"** to submit the form (if applicable)

8. **Drag the widget** by its header to move it around the page

9. **Click the `−` button** to collapse/expand the widget

## How It Works

1. **Voice-to-Text**: Uses the Web Speech API (`webkitSpeechRecognition`) to convert voice to text
2. **AI Refinement**: Sends transcribed text to Perplexity API with a system prompt to refine and improve it
3. **Input Detection**: Automatically detects input fields on the page using multiple strategies:
   - Common input selectors (text inputs, textareas)
   - Task-related attributes (id, name, placeholder containing "task")
   - Visible elements prioritization
4. **Form Submission**: Finds and clicks the submit button or submits the form directly

## File Structure

```
speakify/
├── manifest.json              # Extension manifest (Manifest V3)
├── widget/
│   ├── widget.html            # Widget HTML structure
│   ├── widget.css             # Widget styles
│   └── widget.js              # Widget logic (floating UI, API key, mic, voice recognition)
├── content/
│   └── content.js             # Content script (speech recognition, detect inputs, fill, submit)
├── background/
│   └── background.js          # Background service worker (Perplexity API)
├── utils/
│   └── api.js                 # Perplexity API helper functions
└── icons/                     # Extension icons
```

## Permissions

- `activeTab`: Access to the current active tab
- `storage`: Store API key in local storage
- `scripting`: Inject content scripts
- `https://api.perplexity.ai/*`: Make API calls to Perplexity

## Error Handling

The extension handles various error scenarios:
- Missing API key
- Microphone permission denied
- Speech recognition errors
- Network errors when calling Perplexity API
- Input field not found on page
- Form submission failures

## Browser Compatibility

- Chrome/Chromium (Manifest V3)
- Requires Web Speech API support
- Requires microphone access

## Development

The extension uses:
- Manifest V3
- Web Speech API for voice recognition
- Chrome Extension APIs for messaging and storage
- Fetch API for Perplexity API calls

## Troubleshooting

### Microphone Permission Issues

If you see "Microphone permission denied" even though your browser allows microphone access:

1. **Check Chrome Settings:**
   - Go to `chrome://settings/content/microphone`
   - Make sure microphone access is allowed
   - Check if the extension's origin is blocked

2. **Allow Microphone for Website:**
   - Click the lock icon in the address bar
   - Ensure microphone is set to "Allow"
   - Or go to Chrome Settings > Privacy and security > Site settings > Microphone

3. **Reload Extension:**
   - Go to `chrome://extensions/`
   - Find "Speakify" extension
   - Click the reload icon
   - Try recording again

4. **Browser Compatibility:**
   - Web Speech API requires Chrome/Edge (Chromium-based browsers)
   - Make sure you're using a recent version of Chrome

### Input Field Not Found

If the extension can't find the input field:
- The extension looks for inputs with class `input-box-todo` or placeholder "Enter your task" first
- Make sure the input field is visible on the page
- Try refreshing the page after loading the extension

## Notes

- Icons: Icon files are already included in the `icons/` directory
- API Key: Stored in local storage (persists across browser sessions)
- Speech Recognition: Requires microphone permissions and browser support
- Input Detection: Prioritizes `input.input-box-todo` and inputs with placeholder "Enter your task"
- Floating Widget: The widget appears automatically on every page and can be dragged around

## License

MIT
