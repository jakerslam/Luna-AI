const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');

// Load API key from apikey.json
let openAIApiKey = '';

async function loadApiKey() {
  try {
    const response = await fetch('apikey.json');
    const data = await response.json();
    openAIApiKey = data.openAIApiKey;
  } catch (error) {
    console.error('Failed to load API key:', error);
    appendMessage('bot', '[Error: Could not load API key. Please check apikey.json.]');
  }
}

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

const scrollToBottom = debounce(() => {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}, 10);

async function sendMessage() {
  const input = userInput.value.trim();
  if (!input) return;

  appendMessage('user', input);
  userInput.value = '';

  if (!openAIApiKey) {
    appendMessage('bot', '[Error: API key not loaded. Please check apikey.json.]');
    return;
  }

  const thinkingEl = appendMessage('bot', 'Luna is thinking', true);
  animateDots(thinkingEl);

  try {
    const reply = await fetchChatGPT(input);
    clearInterval(thinkingEl._dotInterval);
    thinkingEl.remove();
    await typeBotMessage(reply);
  } catch (error) {
    clearInterval(thinkingEl._dotInterval);
    thinkingEl.remove();
    await typeBotMessage('[Error: Failed to get response from ChatGPT]');
  }
}

async function fetchChatGPT(prompt) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();
    return data.choices[0]?.message?.content || '[No response]';
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function appendMessage(role, text, isThinking = false) {
  const msg = document.createElement('div');
  msg.classList.add('message', role);

  if (role === 'bot') {
    const bubble = document.createElement('div');
    bubble.classList.add('bubble');
    bubble.textContent = text;
    if (isThinking) bubble.classList.add('dots');
    msg.appendChild(bubble);
  } else {
    msg.textContent = text;
  }

  chatContainer.appendChild(msg);
  scrollToBottom();
  return msg;
}

async function typeBotMessage(text) {
  const msg = document.createElement('div');
  msg.classList.add('message', 'bot');
  const bubble = document.createElement('div');
  bubble.classList.add('bubble');
  msg.appendChild(bubble);
  chatContainer.appendChild(msg);

  const textNode = document.createTextNode('');
  bubble.appendChild(textNode);

  for (let i = 0; i < text.length; i++) {
    textNode.textContent += text.charAt(i);
    scrollToBottom();
    await new Promise((r) => setTimeout(r, 15));
  }
}

function animateDots(el) {
  let dots = 0;
  const bubble = el.querySelector('.bubble');
  const baseText = 'Luna is thinking ';
  bubble.textContent = baseText;
  const dotsSpan = document.createElement('span');
  bubble.appendChild(dotsSpan);

  const interval = setInterval(() => {
    dotsSpan.textContent = '.'.repeat(dots % 4);
    dots++;
  }, 500);
  el._dotInterval = interval;
}

// Dark mode toggle
function initializeDarkMode() {
  const toggle = document.getElementById('dark-mode-toggle');
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  toggle.checked = savedTheme === 'dark';

  toggle.addEventListener('change', () => {
    const theme = toggle.checked ? 'dark' : 'light';
    document.documentElement.classList.add('theme-transition');
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    setTimeout(() => document.documentElement.classList.remove('theme-transition'), 300);
  });
}

window.addEventListener('load', async () => {
  await loadApiKey();
  initializeDarkMode();
  appendMessage('bot', "Hi, I'm Luna! How can I help you today?");
});