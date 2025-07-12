const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const thinkingIndicator = document.getElementById('thinking-indicator');
let isTyping = false;
let currentTypingTimeouts = []; // Store active timeouts to cancel later
let currentTypingMessage = null; // Store current typing message element

// Load API keys from apikey.json
let openAIApiKey = '';
let xAIApiKey = '';
let geminiApiKey = '';

async function loadApiKeys() {
  try {
    const response = await fetch('apikey.json');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    openAIApiKey = data.openAIApiKey || '';
    xAIApiKey = data.xAIApiKey || '';
    geminiApiKey = data.geminiApiKey || '';
    console.log('Loaded API keys:', {
      openAIApiKey: openAIApiKey ? 'present' : 'missing',
      xAIApiKey: xAIApiKey ? 'present' : 'missing',
      geminiApiKey: geminiApiKey ? 'present' : 'missing'
    });
  } catch (error) {
    console.error('Failed to load API keys:', error.message, error.stack);
    appendMessage('bot', 'No AI available', false, true);
    console.log('Error displayed: No API keys loaded');
  }
}

// Check AI availability with priority: Grok > Gemini > OpenAI
async function checkAIAvailability() {
  const testPrompt = 'test';
  const availableAIs = [];

  // Test xAI (Grok) first
  if (xAIApiKey) {
    try {
      const response = await fetchGrok(testPrompt);
      if (response) {
        availableAIs.push({ name: 'Grok', fetch: fetchGrok, model: 'grok-beta' });
      }
    } catch (error) {
      console.log('Grok unavailable:', error.message, error.stack);
    }
  }

  // Test Gemini second
  if (geminiApiKey) {
    try {
      const response = await fetchGemini(testPrompt);
      if (response) {
        availableAIs.push({ name: 'Gemini', fetch: fetchGemini, model: 'gemini-2.0-flash' });
      }
    } catch (error) {
      console.log('Gemini unavailable:', error.message, error.stack);
    }
  }

  // Test OpenAI last
  if (openAIApiKey) {
    try {
      const response = await fetchChatGPT(testPrompt, 'gpt-4o');
      if (response) {
        availableAIs.push({ name: 'OpenAI', fetch: fetchChatGPT, model: 'gpt-4o' });
      }
    } catch (error) {
      console.log('OpenAI unavailable:', error.message, error.stack);
    }
  }

  console.log('Available AIs:', availableAIs.map(ai => ai.name));
  return availableAIs.length > 0 ? availableAIs[0] : null;
}

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    setTimeout(() => {
      chatContainer.scrollTop = chatContainer.scrollHeight;
      console.log('Scrolled to bottom');
    }, 0);
  });
}

function updateActionButton() {
  const button = document.getElementById('action-button');
  const currentIcon = document.getElementById('button-icon');
  currentIcon.remove(); // Remove current icon

  if (isTyping) {
    const svgIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgIcon.id = 'button-icon';
    svgIcon.setAttribute('viewBox', '0 0 24 24');
    svgIcon.setAttribute('width', '24');
    svgIcon.setAttribute('height', '24');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '4');
    rect.setAttribute('y', '4');
    rect.setAttribute('width', '16');
    rect.setAttribute('height', '16');
    rect.setAttribute('fill', 'var(--button-text)');
    svgIcon.appendChild(rect);
    button.appendChild(svgIcon);
  } else {
    const svgIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgIcon.id = 'button-icon';
    svgIcon.setAttribute('viewBox', '0 0 24 24');
    svgIcon.setAttribute('width', '24');
    svgIcon.setAttribute('height', '24');
    svgIcon.setAttribute('fill', 'none');
    svgIcon.setAttribute('stroke', 'var(--button-text)');
    svgIcon.setAttribute('stroke-width', '2');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 19L12 5M5 12L12 5L19 12');
    svgIcon.appendChild(path);
    button.appendChild(svgIcon);
  }
}

function stopTyping() {
  if (isTyping) {
    console.log('Stopping typing, clearing timeouts:', currentTypingTimeouts.length);
    isTyping = false;
    currentTypingTimeouts.forEach(clearTimeout);
    currentTypingTimeouts = [];
    if (currentTypingMessage) {
      const bubble = currentTypingMessage.querySelector('.bubble');
      if (bubble && bubble.textContent) {
        bubble.textContent += '...'; // Append "..." to partial message
      }
    }
    updateActionButton(); // Restore up arrow SVG
    scrollToBottom();
  }
}

function handleAction() {
  if (isTyping) {
    stopTyping(); // Stop Luna mid-thought
  } else {
    sendMessage(); // Send user input
  }
}

function showThinking() {
  if (thinkingIndicator) {
    thinkingIndicator.style.display = 'block';
    console.log('Showing thinking indicator');
  }
}

function hideThinking() {
  if (thinkingIndicator) {
    thinkingIndicator.style.display = 'none';
    console.log('Hiding thinking indicator');
  }
}

async function sendMessage() {
  const input = userInput.value.trim();
  if (!input || isTyping) {
    console.log('SendMessage blocked: empty input or isTyping');
    return;
  }

  appendMessage('user', input);
  userInput.value = '';
  scrollToBottom();

  if (!openAIApiKey && !xAIApiKey && !geminiApiKey) {
    appendMessage('bot', 'No AI available', false, true);
    console.log('Error displayed: No API keys loaded');
    return;
  }

  try {
    const availableAI = await checkAIAvailability();
    if (!availableAI) {
      appendMessage('bot', 'No AI available', false, true);
      console.log('Error displayed: No AI services available');
      return;
    }

    showThinking();
    console.log(`Using AI: ${availableAI.name}, Model: ${availableAI.model}`);
    let reply;
    try {
      reply = await availableAI.fetch(input, availableAI.model);
    } catch (error) {
      if (availableAI.name === 'OpenAI' && error.message.includes('insufficient_quota')) {
        console.log('OpenAI quota exceeded, trying gpt-3.5-turbo');
        try {
          reply = await fetchChatGPT(input, 'gpt-3.5-turbo');
        } catch (fallbackError) {
          console.log('Fallback to gpt-3.5-turbo failed, trying gpt-4o-mini');
          try {
            reply = await fetchChatGPT(input, 'gpt-4o-mini');
          } catch (miniError) {
            throw new Error(`OpenAI fallbacks failed: ${miniError.message}`);
          }
        }
      } else {
        throw error;
      }
    }
    hideThinking();
    await typeBotMessage(reply);
  } catch (error) {
    console.error('SendMessage error:', error.message, error.stack);
    hideThinking();
    stopTyping(); // Ensure isTyping is reset
    appendMessage('bot', 'No AI available', false, true);
    console.log('Error displayed: Failed to get response', { message: error.message, stack: error.stack });
  }
}

async function fetchChatGPT(prompt, model = 'gpt-4o') {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.log('fetchChatGPT timed out');
    }, 10000); // 10s timeout

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openAIApiKey}`,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error('No valid response from ChatGPT');
    }
    return data.choices[0].message.content;
  } catch (error) {
    console.error('fetchChatGPT error:', error.message, error.stack);
    throw error;
  }
}

async function fetchGrok(prompt, model = 'grok-beta') {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.log('fetchGrok timed out');
    }, 10000); // 10s timeout

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${xAIApiKey}`,
    };

    const response = await fetch('https://api.grok.xai.com/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error('No valid response from Grok');
    }
    return data.choices[0].message.content;
  } catch (error) {
    console.error('fetchGrok error:', error.message, error.stack);
    throw error;
  }
}

async function fetchGemini(prompt, model = 'gemini-2.0-flash') {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.log('fetchGemini timed out');
    }, 10000); // 10s timeout

    const headers = {
      'Content-Type': 'application/json',
      'X-goog-api-key': geminiApiKey // Updated header to match curl
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('fetchGemini HTTP error:', { status: response.status, errorText });
      throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
    }

    const data = await response.json();
    console.log('fetchGemini response:', JSON.stringify(data, null, 2)); // Debug response
    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      throw new Error('No valid response from Gemini');
    }
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('fetchGemini error:', error.message, error.stack);
    throw error;
  }
}

function appendMessage(role, text, isThinking = false, isError = false) {
  const msg = document.createElement('div');
  msg.classList.add('message', role);
  if (isError) {
    msg.classList.add('error');
  }

  if (role === 'bot') {
    const bubble = document.createElement('div');
    bubble.classList.add('bubble');
    bubble.textContent = text;
    if (isThinking) bubble.classList.add('dots');
    msg.appendChild(bubble);
  } else {
    msg.textContent = text;
  }

  // Insert before bottom-spacer to keep it at the bottom
  const bottomSpacer = document.getElementById('bottom-spacer');
  chatContainer.insertBefore(msg, bottomSpacer);
  console.log(`Appending message: ${role} - ${text}`);
  scrollToBottom();
  // Verify DOM insertion
  if (!msg.isConnected) {
    console.error('Message not appended to DOM:', msg);
  }
}

async function typeBotMessage(text, isError = false) {
  if (isTyping) {
    console.log('Blocked overlapping typeBotMessage call, stopping current typing');
    stopTyping(); // Clear any ongoing typing
  }

  const msg = document.createElement('div');
  msg.classList.add('message', 'bot');
  if (isError) {
    msg.classList.add('error');
  }
  const bubble = document.createElement('div');
  bubble.classList.add('bubble');
  msg.appendChild(bubble);
  const bottomSpacer = document.getElementById('bottom-spacer');
  chatContainer.insertBefore(msg, bottomSpacer);
  console.log('Appending typing message: bot');

  isTyping = true;
  currentTypingMessage = msg; // Store current message
  updateActionButton(); // Show stop icon

  currentTypingTimeouts = [];

  for (let i = 0; i < text.length; i++) {
    if (!isTyping) break;

    const timeout = setTimeout(() => {
      bubble.textContent += text.charAt(i);
      scrollToBottom();
    }, i * 15);

    currentTypingTimeouts.push(timeout);
  }

  // Reset after complete
  const totalTime = text.length * 15;
  const reset = setTimeout(() => {
    isTyping = false;
    currentTypingMessage = null;
    updateActionButton(); // Restore up arrow SVG
    scrollToBottom();
  }, totalTime);

  currentTypingTimeouts.push(reset);
}

// Dark mode toggle
function initializeDarkMode() {
  const toggle = document.getElementById('dark-mode-toggle');
  // Default to dark mode unless light is explicitly saved
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  toggle.checked = savedTheme === 'dark';
  // Force theme update
  document.documentElement.classList.add('theme-transition');
  setTimeout(() => document.documentElement.classList.remove('theme-transition'), 300);

  toggle.addEventListener('change', () => {
    const theme = toggle.checked ? 'dark' : 'light';
    document.documentElement.classList.add('theme-transition');
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    setTimeout(() => document.documentElement.classList.remove('theme-transition'), 300);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  appendMessage("bot", "Hi, I'm Luna. How can I help?");
});

window.addEventListener('load', async () => {
  await loadApiKeys();
  initializeDarkMode();
  scrollToBottom();
});