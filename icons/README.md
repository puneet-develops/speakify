# Icons Directory

This directory contains icon files for the Speakify Chrome extension.

## Quick Setup

**Option 1: Use the Icon Generator (Easiest)**
1. Open `generate-icons.html` in your browser
2. Click "Generate All Icons" button
3. The PNG files will be automatically downloaded
4. Move the downloaded files to this directory

**Option 2: Convert SVG to PNG**
1. SVG files are provided (`icon16.svg`, `icon48.svg`, `icon128.svg`)
2. Use an online converter (like https://cloudconvert.com/svg-to-png) or image editor
3. Convert each SVG to PNG at the specified size
4. Save as `icon16.png`, `icon48.png`, `icon128.png`

## Required Files

- `icon16.png` - 16x16 pixels (toolbar icon)
- `icon48.png` - 48x48 pixels (extension management page)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

## GPT Prompt for Icon Generation

If you prefer to use AI image generation, use this prompt:

```
Create three PNG icon images for a Chrome browser extension called "Speakify" - a voice-to-text with AI refinement tool.

Extension Description: Speakify is a browser extension that records voice, converts it to text, refines it using Perplexity AI, and auto-fills web forms.

Icon Requirements:
1. Create icon16.png - 16x16 pixels (toolbar icon)
2. Create icon48.png - 48x48 pixels (extension management page)
3. Create icon128.png - 128x128 pixels (Chrome Web Store)

Design Specifications:
- Theme: Voice/speech recognition combined with AI/technology
- Visual Elements: Microphone, sound waves, or speech bubbles combined with AI/sparkle effects
- Color Scheme: Modern gradient (purple/blue like #667eea to #764ba2) or clean monochrome with accent colors
- Style: Clean, modern, minimalist, professional
- Background: Transparent or solid with rounded corners
- Should be recognizable at small sizes (16x16)
- Should convey: voice recording, AI enhancement, and text/input

The icons should be visually consistent across all three sizes, with details simplified for the smaller 16x16 version.

Please generate these three PNG images with transparent backgrounds.
```

## Note

The extension will work without icons, but Chrome will show a default placeholder icon. It's recommended to add the icon files for a professional appearance.

