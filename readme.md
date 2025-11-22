# Overview

Luna AI is a browser-based chatbot interface that connects to multiple large language models (Qwen via OpenRouter, Grok, Gemini, and ChatGPT) through their HTTP APIs. I built it to deepen my experience with **JavaScript**, especially around working with asynchronous code (`fetch`, `async/await`), integrating third-party APIs, and updating the DOM in response to streaming data from different backends.

The app focuses on frontend JavaScript only (no framework yet) so I could really see what is happening under the hood: how to structure functions, manage state in plain JS, handle errors from remote APIs, and coordinate multiple model options in a single UI. The interface includes a dark/light theme toggle, simple availability indicators for each AI, and a real-time chat area with a typing effect so it feels like a live assistant.

The purpose of this software is to practice **real-world API integration** and **client-side application structure** in JavaScript. I wanted something that feels like an actual portfolio project: a small but realistic multi-model AI client where I could experiment with language features (callback vs `async/await`, object literals for configuration, event listeners, etc.) and learn how to keep the code organized as the feature set grows.

[Software Demo Video](https://www.youtube.com/watch?v=XXXXXXXXXXX)

> _(Replace the above URL with your actual Luna AI demo link.)_

---

# Development Environment

I developed Luna AI using the following tools:

- **Editor:** VS Code
- **Runtime / Hosting:** Local static server using `python3 -m http.server 8000`
- **Version Control:** Git & GitHub (repository: `jakerslam/Luna-AI`)
- **Browser:** Chrome/Chromium for testing, DevTools for debugging

**Programming language & libraries:**

- **JavaScript (vanilla, browser-based)** for all application logic  
  - DOM manipulation (`document.querySelector`, event listeners)  
  - Asynchronous operations with `fetch` and `async/await`  
  - Error handling with `try/catch`
- **HTML & CSS** for layout and styling (chat container, message bubbles, dark/light theme)
- **No front-end framework yet** (React is planned as a future refactor)
- API integrations:
  - OpenRouter (Qwen)
  - xAI (Grok)
  - Google Generative Language API (Gemini)
  - OpenAI (ChatGPT)
- API keys are loaded from a local `apikey.json` file during development.

---

# Useful Websites

These are some of the resources I used during this project:

- [MDN Web Docs – JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
- [MDN – Using Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- [MDN – Working with JSON](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/JSON)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [Google AI Studio / Gemini API Docs](https://ai.google.dev/)
- [xAI Grok API Docs](https://docs.x.ai/) _(for Grok integration)_

---

# Future Work

There are several improvements I plan to make to Luna AI:

- **Richer README & documentation**  
  - Expand setup instructions  
  - Add architecture diagrams and clearer API usage notes  

- **Refactor to a React front end**  
  - Componentize the chat window, model selector, and status indicators  
  - Improve state management and routing for future features

- **Persistent chat history**  
  - Store conversations in `localStorage` or a backend database  
  - Allow users to reload the page without losing previous messages

- **Backend service for API keys**  
  - Move API keys out of the frontend and into a simple backend proxy  
  - Improve security and support multiple users safely

- **Better error and status handling**  
  - More detailed messages when a model is down, misconfigured, or rate-limited  
  - Retry logic and clearer feedback in the UI

- **Model comparison features**  
  - Side-by-side responses from multiple models to compare outputs  
  - Per-model timers or cost/latency metrics
