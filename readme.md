Luna AI Chat
A friendly AI chatbot application that integrates multiple AI models (Qwen, Grok, Gemini, and ChatGPT) to provide interactive responses. Built for local development and testing, this project leverages browser-based JavaScript with API integrations.
Features

Multi-AI support with Qwen (default), Grok, Gemini, and ChatGPT.
Real-time chat interface with typing animation.
Dark/light mode toggle.
Status indicators for each AI's availability.
Simple server setup for local hosting.

Prerequisites

A modern web browser (Chrome, Firefox, etc.).
API keys for:
OpenRouter (Qwen)
xAI (Grok)
Google Generative Language (Gemini)
OpenAI (ChatGPT)


Python 3 for the local server.

Installation

Clone the repository:git clone <your-repo-url>
cd Luna-AI


Create an apikey.json file with your API keys:{
  "openAIApiKey": "your-openai-key",
  "xAIApiKey": "your-xai-key",
  "geminiApiKey": "your-gemini-key",
  "openrouterApiKey": "your-openrouter-key"
}


Start the local server:python3 -m http.server 8000


Open http://localhost:8000 in your browser.

Usage

Type a message and press Enter or click the send button.
Toggle dark/light mode using the switch.
Check AI status boxes for availability (green = online, red = offline).

Development

Edit index.js for core logic.
Style adjustments in the HTML/CSS (e.g., style.css).
Debug via browser DevTools (F12).

Known Issues

Gemini requires a server-side proxy due to CORS restrictions.
Grok and ChatGPT may fail if API keys are invalid or quotas are exceeded.

Contributing
Feel free to fork and submit pull requests. Report issues on the repository.
License
MIT License (or specify your preferred license).