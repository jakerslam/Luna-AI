const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const actionButton = document.getElementById('action-button');
const thinkingIndicator = document.getElementById('thinking-indicator');
let isTyping = false;
let currentTypingTimeouts = [];
let currentTypingMessage = null;

let openAIApiKey = '';
let xAIApiKey = '';
let geminiApiKey = '';

const LUNA_DIRECTIVE = "You are Luna, a super friendly helpful chatbot. You really care about this person. ";

async function loadApiKeys() {
  try {
    const response = await fetch('/apikey.json');
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    openAIApiKey = data.openAIApiKey || '';
    xAIApiKey = data.xAIApiKey || '';
    geminiApiKey = data.geminiApiKey || '';
    console.log('Loaded API keys:', {
      openAIApiKey: openAIApiKey ? 'present' : 'missing',
      xAIApiKey: xAIApiKey ? 'present' : 'missing',
      geminiApiKey: geminiApiKey ? 'present' : 'missing'
    });
    updateAIStatus();
  } catch (error) {
    console.error('Failed to load API keys:', error.message);
    appendMessage('bot', 'No AI available', false, true);
  }
}

function updateAIStatus(lastUsedAI = null, availableAIs = []) {
  const aiStatus = {
    grok: { squares: document.querySelectorAll('.ai-status:has(.grok) .status-square') },
    gemini: { squares: document.querySelectorAll('.ai-status:has(.gemini) .status-square') },
    chatgpt: { squares: document.querySelectorAll('.ai-status:has(.chatgpt) .status-square') }
  };

  ['grok', 'gemini', 'chatgpt'].forEach(ai => {
    const { squares } = aiStatus[ai];
    squares.forEach(square => {
      square.classList.remove('online', 'offline');
      square.style.background = '';
    });
    if (!openAIApiKey && ai === 'chatgpt' || !xAIApiKey && ai === 'grok' || !geminiApiKey && ai === 'gemini') {
      squares[0].classList.add('offline');
    } else if (lastUsedAI === ai) {
      squares.forEach(square => square.classList.add('online'));
    } else if (availableAIs.includes(ai)) {
      squares[0].classList.add('online');
    } else {
      squares[0].classList.add('offline');
    }
  });
}

async function checkAIAvailability() {
  const testPrompt = 'test';
  const availableAIs = [];

  if (xAIApiKey) {
    try {
      const response = await fetchGrok(testPrompt);
      if (response) availableAIs.push('grok');
    } catch (error) {
      console.log('Grok unavailable:', error.message);
    }
  }

  if (geminiApiKey) {
    try {
      const response = await fetchGemini(testPrompt);
      if (response) availableAIs.push('gemini');
    } catch (error) {
      console.log('Gemini unavailable:', error.message);
    }
  }

  if (openAIApiKey) {
    try {
      const response = await fetchChatGPT(testPrompt, 'gpt-4o');
      if (response) availableAIs.push('chatgpt');
    } catch (error) {
      console.log('ChatGPT unavailable:', error.message);
    }
  }

  const aiList = [
    ...(availableAIs.includes('grok') ? [{ name: 'Grok', fetch: fetchGrok, model: 'grok-beta', id: 'grok' }] : []),
    ...(availableAIs.includes('gemini') ? [{ name: 'Gemini', fetch: fetchGemini, model: 'gemini-2.0-flash', id: 'gemini' }] : []),
    ...(availableAIs.includes('chatgpt') ? [{ name: 'ChatGPT', fetch: fetchChatGPT, model: 'gpt-4o', id: 'chatgpt' }] : [])
  ];
  updateAIStatus(null, availableAIs);
  return aiList.length > 0 ? aiList[0] : null;
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
    console.log('Scrolled to bottom, scrollHeight:', chatContainer.scrollHeight, 'scrollTop:', chatContainer.scrollTop);
    const messages = chatContainer.querySelectorAll('.message');
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const rect = lastMessage.getBoundingClientRect();
      const containerRect = chatContainer.getBoundingClientRect();
      console.log('Last message position:', {
        top: rect.top,
        bottom: rect.bottom,
        containerTop: containerRect.top,
        containerBottom: containerRect.bottom,
        isVisible: rect.bottom <= containerRect.bottom && rect.top >= containerRect.top
      });
    }
  });
}

function updateActionButton() {
  const button = document.getElementById('action-button');
  const currentIcon = document.getElementById('button-icon');
  currentIcon.remove();

  if (isTyping) {
    button.classList.add('stop');
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
    button.classList.remove('stop');
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
    isTyping = false;
    currentTypingTimeouts.forEach(clearTimeout);
    currentTypingTimeouts = [];
    if (currentTypingMessage) {
      const bubble = currentTypingMessage.querySelector('.bubble');
      if (bubble && bubble.textContent) bubble.textContent += '...';
    }
    updateActionButton();
    scrollToBottom();
  }
}

function handleAction() {
  if (isTyping) {
    stopTyping();
  } else {
    sendMessage();
  }
}

function showThinking() {
  if (thinkingIndicator) {
    thinkingIndicator.style.display = 'block';
    scrollToBottom();
  }
}

function hideThinking() {
  if (thinkingIndicator) {
    thinkingIndicator.style.display = 'none';
    scrollToBottom();
  }
}

async function sendMessage() {
  const input = userInput.value.trim();
  if (!input || isTyping) return;

  appendMessage('user', input);
  userInput.value = '';
  scrollToBottom();
  showThinking();

  if (!openAIApiKey && !xAIApiKey && !geminiApiKey) {
    hideThinking();
    appendMessage('bot', 'No AI available', false, true);
    updateAIStatus();
    return;
  }

  try {
    const availableAI = await checkAIAvailability();
    if (!availableAI) {
      hideThinking();
      appendMessage('bot', 'No AI available', false, true);
      updateAIStatus();
      return;
    }

    let reply;
    const promptWithDirective = LUNA_DIRECTIVE + input;
    try {
      reply = await availableAI.fetch(promptWithDirective, availableAI.model);
      updateAIStatus(availableAI.id, [availableAI.id]);
    } catch (error) {
      if (availableAI.name === 'ChatGPT' && error.message.includes('insufficient_quota')) {
        try {
          reply = await fetchChatGPT(promptWithDirective, 'gpt-3.5-turbo');
          updateAIStatus('chatgpt', ['chatgpt']);
        } catch (fallbackError) {
          try {
            reply = await fetchChatGPT(promptWithDirective, 'gpt-4o-mini');
            updateAIStatus('chatgpt', ['chatgpt']);
          } catch (miniError) {
            throw new Error(`ChatGPT fallbacks failed: ${miniError.message}`);
          }
        }
      } else {
        throw error;
      }
    }
    hideThinking();
    await typeBotMessage(reply);
  } catch (error) {
    console.error('SendMessage error:', error.message);
    hideThinking();
    stopTyping();
    appendMessage('bot', 'No AI available', false, true);
    updateAIStatus();
  }
}

async function fetchChatGPT(prompt, model = 'gpt-4o') {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10000);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: LUNA_DIRECTIVE }, { role: 'user', content: prompt }],
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    if (!data.choices || !data.choices[0]?.message?.content) throw new Error('No valid response from ChatGPT');
    return data.choices[0].message.content;
  } catch (error) {
    console.error('fetchChatGPT error:', error.message);
    throw error;
  }
}

async function fetchGrok(prompt, model = 'grok-beta') {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10000);

  try {
    const response = await fetch('https://api.grok.xai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${xAIApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: LUNA_DIRECTIVE }, { role: 'user', content: prompt }],
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    if (!data.choices || !data.choices[0]?.message?.content) throw new Error('No valid response from Grok');
    return data.choices[0].message.content;
  } catch (error) {
    console.error('fetchGrok error:', error.message);
    throw error;
  }
}

async function fetchGemini(prompt, model = 'gemini-2.0-flash') {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10000);

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': geminiApiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: LUNA_DIRECTIVE + prompt }] }]
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) throw new Error('No valid response from Gemini');
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('fetchGemini error:', error.message);
    throw error;
  }
}

function appendMessage(role, text, isThinking = false, isError = false) {
  const msg = document.createElement('div');
  msg.classList.add('message', role);
  if (isError) msg.classList.add('error');

  if (role === 'bot') {
    const bubble = document.createElement('div');
    bubble.classList.add('bubble');
    bubble.textContent = text;
    if (isThinking) bubble.classList.add('dots');
    msg.appendChild(bubble);
  } else {
    msg.textContent = text;
  }

  // Insert message at the end
  chatContainer.appendChild(msg);
  scrollToBottom();
}

async function typeBotMessage(text, isError = false) {
  if (isTyping) stopTyping();

  const msg = document.createElement('div');
  msg.classList.add('message', 'bot');
  if (isError) msg.classList.add('error');
  const bubble = document.createElement('div');
  bubble.classList.add('bubble');
  msg.appendChild(bubble);

  // Insert message at the end
  chatContainer.appendChild(msg);

  isTyping = true;
  currentTypingMessage = msg;
  updateActionButton();

  currentTypingTimeouts = [];
  for (let i = 0; i < text.length; i++) {
    if (!isTyping) break;
    const timeout = setTimeout(() => {
      bubble.textContent += text.charAt(i);
      scrollToBottom();
    }, i * 15);
    currentTypingTimeouts.push(timeout);
  }

  const totalTime = text.length * 15;
  const reset = setTimeout(() => {
    isTyping = false;
    currentTypingMessage = null;
    updateActionButton();
    scrollToBottom();
  }, totalTime);
  currentTypingTimeouts.push(reset);
}

function initializeDarkMode() {
  const toggle = document.getElementById('dark-mode-toggle');
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  toggle.checked = savedTheme === 'dark';

  toggle.addEventListener('change', () => {
    const theme = toggle.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    console.log('Theme changed to:', theme);
    scrollToBottom();
  });
}

function initializeEventListeners() {
  console.log('Initializing event listeners');
  if (actionButton) actionButton.addEventListener('click', handleAction);
  if (userInput) {
    userInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleAction();
        console.log('Enter key pressed, handleAction triggered');
      }
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  console.log('DOM loaded, appending initial message');
  appendMessage("bot", "Hi, I'm Luna. How can I help?");
  setTimeout(scrollToBottom, 0);
  setTimeout(scrollToBottom, 100);
});

window.addEventListener('load', async () => {
  console.log('Window loaded, initializing');
  await loadApiKeys();
  initializeDarkMode();
  initializeEventListeners();
  setTimeout(scrollToBottom, 0);
  setTimeout(scrollToBottom, 100);
});