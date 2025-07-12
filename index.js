const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');

// Load API key from apikey.json
let openAIApiKey = '';

async function loadApiKey() {
  try {
    const response = await fetch('apikey.json');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    if (!data.openAIApiKey) {
      throw new Error('openAIApiKey not found in apikey.json');
    }
    openAIApiKey = data.openAIApiKey;
  } catch (error) {
    console.error('Failed to load API key:', error.message);
    appendMessage('bot', `[Error: Could not load API key. ${error.message}]`);
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
  console.log('Scrolling to bottom, scrollHeight:', chatContainer.scrollHeight, 'scrollTop:', chatContainer.scrollTop, 'clientHeight:', chatContainer.clientHeight);
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
    console.error('ChatGPT error:', error.message);
    clearInterval(thinkingEl._dotInterval);
    thinkingEl.remove();
    if (error.message.includes('insufficient_quota')) {
      await typeBotMessage('[Error: OpenAI quota exceeded. Please check your plan and billing details at https://platform.openai.com. Trying gpt-3.5-turbo...]');
      try {
        const fallbackReply = await fetchChatGPT(input, 'gpt-3.5-turbo');
        await typeBotMessage(fallbackReply);
      } catch (fallbackError) {
        await typeBotMessage(`[Error: Fallback to gpt-3.5-turbo failed. ${fallbackError.message}. Trying gpt-4o-mini...]`);
        try {
          const miniReply = await fetchChatGPT(input, 'gpt-4o-mini');
          await typeBotMessage(miniReply);
        } catch (miniError) {
          await typeBotMessage(`[Error: Fallback to gpt-4o-mini failed. ${miniError.message}. Please add credits or check billing at https://platform.openai.com.]`);
        }
      }
    } else {
      await typeBotMessage(`[Error: Failed to get response from ChatGPT. ${error.message}]`);
    }
  }
}

async function fetchChatGPT(prompt, model = 'gpt-4o') {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openAIApiKey}`,
    };
    // Uncomment and add your project/organization ID if required
    // headers['OpenAI-Project'] = 'your-project-id';
    // headers['OpenAI-Organization'] = 'your-org-id';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
    }
    clearTimeout(timeoutId);
    const data = await response.json();
    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error('No valid response from ChatGPT');
    }
    return data.choices[0].message.content;
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