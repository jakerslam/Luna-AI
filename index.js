const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const actionButton = document.getElementById('action-button');
let thinkingIndicator = null;
let isTyping = false;
let currentTypingTimeouts = [];
let currentTypingMessage = null;

let openAIApiKey = '';
let xAIApiKey = '';
let geminiApiKey = '';
let openrouterApiKey = '';

const endpoints = {
  grok: 'https://api.x.ai/v1/chat/completions',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
  chatgpt: 'https://api.openai.com/v1/chat/completions',
  qwen: 'https://openrouter.ai/api/v1/chat/completions'
};

const defaultAi = 'qwen';
let availableAIs = []; // Global variable to store available AIs

async function loadApiKeys() {
  try {
    const response = await fetch('/apikey.json');
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    openAIApiKey = data.openAIApiKey || '';
    xAIApiKey = data.xAIApiKey || '';
    geminiApiKey = data.geminiApiKey || '';
    openrouterApiKey = data.openrouterApiKey || '';
    console.log('Loaded API keys (raw values):', {
      openAIApiKey: openAIApiKey.length > 0 ? openAIApiKey.substring(0, 5) + '...' : 'empty',
      xAIApiKey: xAIApiKey.length > 0 ? xAIApiKey.substring(0, 5) + '...' : 'empty',
      geminiApiKey: geminiApiKey.length > 0 ? geminiApiKey.substring(0, 5) + '...' : 'empty',
      openrouterApiKey: openrouterApiKey.length > 0 ? openrouterApiKey.substring(0, 5) + '...' : 'empty'
    });
  } catch (error) {
    console.error('Failed to load API keys:', error.message);
    appendMessage('bot', 'Error loading API keys: ' + error.message, false, true);
  }
  updateAIStatus(); // Initial status update
}

function updateAIStatus(lastUsedAI = null, availableAIsParam = []) {
  const aiStatus = {
    grok: { squares: document.querySelectorAll('.ai-status:nth-child(1) .status-square') },
    gemini: { squares: document.querySelectorAll('.ai-status:nth-child(2) .status-square') },
    chatgpt: { squares: document.querySelectorAll('.ai-status:nth-child(3) .status-square') },
    qwen: { squares: document.querySelectorAll('.ai-status:nth-child(4) .status-square') }
  };

  ['grok', 'gemini', 'chatgpt', 'qwen'].forEach(ai => {
    const { squares } = aiStatus[ai];
    if (squares.length === 0) {
      console.warn(`No status squares found for ${ai}, DOM query failed`);
      return;
    }
    squares.forEach(square => {
      square.classList.remove('online', 'offline');
      square.style.background = ''; // Revert to original (no forced color)
    });

    const isOffline = (ai === 'qwen' && !openrouterApiKey) || (!xAIApiKey && ai === 'grok') || (!openAIApiKey && ai === 'chatgpt') || (!geminiApiKey && ai === 'gemini');
    if (isOffline) {
      squares[0].classList.add('offline');
      squares[0].style.background = 'red';
      for (let i = 1; i < squares.length; i++) squares[i].style.background = '';
      console.log(`${ai} set to offline (red) due to missing key`);
    } else if (availableAIsParam.includes(ai) && lastUsedAI !== ai) {
      squares[0].classList.add('online');
      squares[0].style.background = 'green';
      for (let i = 1; i < squares.length; i++) squares[i].style.background = '';
      console.log(`${ai} set to online (1 green) as available`);
    } else if (availableAIsParam.includes(ai) && lastUsedAI === ai && lastUsedAI !== 'mostRecent') {
      squares.forEach((square, index) => {
        square.classList.add('online');
        square.style.background = index === 0 || index === 1 ? 'green' : '';
      });
      console.log(`${ai} set to used (2 green) as last used`);
    } else if (availableAIsParam.includes(ai) && lastUsedAI === ai && lastUsedAI === 'mostRecent') {
      squares.forEach(square => {
        square.classList.add('online');
        square.style.background = 'green';
      });
      console.log(`${ai} set to most recent (3 green)`);
    } else {
      squares[0].classList.add('offline');
      squares[0].style.background = 'red';
      for (let i = 1; i < squares.length; i++) squares[i].style.background = '';
      console.log(`${ai} set to offline (red) by default`);
    }
  });
}

async function checkAIAvailability() {
  const testPrompt = 'test';
  const localAvailableAIs = [];

  console.log('Checking availability with keys:', {
    openrouterApiKey: openrouterApiKey.length > 0 ? 'present' : 'absent',
    xAIApiKey: xAIApiKey.length > 0 ? 'present' : 'absent',
    geminiApiKey: geminiApiKey.length > 0 ? 'present' : 'absent',
    openAIApiKey: openAIApiKey.length > 0 ? 'present' : 'absent'
  });

  if (openrouterApiKey) {
    try {
      const response = await fetchAI(endpoints.qwen, openrouterApiKey, 'qwen/qwen3-30b-a3b:free', 'POST', {
        model: 'qwen/qwen3-30b-a3b:free',
        messages: [{ role: 'system', content: "You are Captain AI, a super friendly helpful chatbot. You really care about this person." }, { role: 'user', content: testPrompt }]
      });
      if (response) localAvailableAIs.push('qwen');
    } catch (error) {
      console.log('Qwen availability check failed:', error.message);
    }
  }

  if (xAIApiKey) {
    try {
      const response = await fetchAI(endpoints.grok, xAIApiKey, 'grok-beta', 'POST', {
        model: 'grok-beta',
        messages: [{ role: 'system', content: "You are Luna, a super friendly helpful chatbot. You really care about this person." }, { role: 'user', content: testPrompt }]
      });
      if (response) localAvailableAIs.push('grok');
    } catch (error) {
      console.log('Grok availability check failed:', error.message);
    }
  }

  // Temporarily disable Gemini due to CORS
  /*
  if (geminiApiKey) {
    try {
      const response = await fetchAI(endpoints.gemini, geminiApiKey, 'gemini-2.0-flash', 'POST', {
        contents: [{ parts: [{ text: "You are Luna, a super friendly helpful chatbot. You really care about this person. " + testPrompt }] }]
      }, 'X-goog-api-key');
      if (response) localAvailableAIs.push('gemini');
    } catch (error) {
      console.log('Gemini availability check failed:', error.message);
    }
  }
  */

  if (openAIApiKey) {
    try {
      const response = await fetchAI(endpoints.chatgpt, openAIApiKey, 'gpt-4o', 'POST', {
        model: 'gpt-4o',
        messages: [{ role: 'system', content: "You are Luna, a super friendly helpful chatbot. You really care about this person." }, { role: 'user', content: testPrompt }]
      });
      if (response) localAvailableAIs.push('chatgpt');
    } catch (error) {
      console.log('ChatGPT availability check failed:', error.message);
    }
  }

  const aiList = [
    ...(localAvailableAIs.includes('qwen') ? [{ name: 'Qwen', fetch: (prompt) => fetchAI(endpoints.qwen, openrouterApiKey, 'qwen/qwen3-30b-a3b:free', 'POST', {
      model: 'qwen/qwen3-30b-a3b:free',
      messages: [{ role: 'system', content: "You are Luna, a super friendly helpful chatbot. You really care about this person." }, { role: 'user', content: prompt }]
    }), model: 'qwen/qwen3-30b-a3b:free', id: 'qwen' }] : []),
    ...(localAvailableAIs.includes('grok') ? [{ name: 'Grok', fetch: (prompt) => fetchAI(endpoints.grok, xAIApiKey, 'grok-beta', 'POST', {
      model: 'grok-beta',
      messages: [{ role: 'system', content: "You are Luna, a super friendly helpful chatbot. You really care about this person." }, { role: 'user', content: prompt }]
    }), model: 'grok-beta', id: 'grok' }] : []),
    // Gemini temporarily disabled
    // ...(localAvailableAIs.includes('gemini') ? [{ name: 'Gemini', fetch: (prompt) => fetchAI(endpoints.gemini, geminiApiKey, 'gemini-2.0-flash', 'POST', {
    //   contents: [{ parts: [{ text: "You are Luna, a super friendly helpful chatbot. You really care about this person. " + prompt }] }]
    // }, 'X-goog-api-key'), model: 'gemini-2.0-flash', id: 'gemini' }] : []),
    ...(localAvailableAIs.includes('chatgpt') ? [{ name: 'ChatGPT', fetch: (prompt) => fetchAI(endpoints.chatgpt, openAIApiKey, 'gpt-4o', 'POST', {
      model: 'gpt-4o',
      messages: [{ role: 'system', content: "You are Luna, a super friendly helpful chatbot. You really care about this person." }, { role: 'user', content: prompt }]
    }), model: 'gpt-4o', id: 'chatgpt' }] : [])
  ];
  availableAIs = localAvailableAIs; // Update global variable
  updateAIStatus(null, localAvailableAIs);
  return { ai: aiList[0], availableAIs: localAvailableAIs, aiList: aiList };
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
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
    hideThinking();
  }
}

function showThinking() {
  if (thinkingIndicator) {
    thinkingIndicator.style.display = 'flex';
    chatContainer.appendChild(thinkingIndicator);
    return;
  }
  thinkingIndicator = document.getElementById('thinking-indicator');
  if (thinkingIndicator) {
    thinkingIndicator.style.display = 'flex';
    chatContainer.appendChild(thinkingIndicator);
  }
}

function hideThinking() {
  if (thinkingIndicator) {
    thinkingIndicator.style.display = 'none';
  }
}

async function sendMessage() {
  const input = userInput.value.trim();
  if (!input || isTyping) return;

  appendMessage('user', input);
  userInput.value = '';
  showThinking();

  if (!openAIApiKey && !xAIApiKey && !geminiApiKey && !openrouterApiKey) {
    hideThinking();
    appendMessage('bot', 'No AI available', false, true);
    updateAIStatus();
    return;
  }

  try {
    let result = await checkAIAvailability();
    if (!result) {
      hideThinking();
      appendMessage('bot', 'No AI available', false, true);
      updateAIStatus();
      return;
    }

    let { ai: availableAI, availableAIs: currentAvailableAIs, aiList } = result;

    // Default to Qwen if available
    if (currentAvailableAIs.includes(defaultAi)) {
      availableAI = aiList.find(ai => ai.id === defaultAi) || availableAI;
    }

    let reply;
    const promptWithDirective = "You are Luna, a super friendly helpful chatbot. You really care about this person. " + input;
    try {
      reply = await availableAI.fetch(promptWithDirective);
      updateAIStatus(availableAI.id, currentAvailableAIs, 'mostRecent');
    } catch (error) {
      console.error(`${availableAI.name} error:`, error.message);
      if (availableAI.name === 'ChatGPT' && error.message.includes('insufficient_quota')) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          reply = await fetchAI(endpoints.chatgpt, openAIApiKey, 'gpt-3.5-turbo', 'POST', {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'system', content: "You are Luna, a super friendly helpful chatbot. You really care about this person." }, { role: 'user', content: promptWithDirective }]
          });
          updateAIStatus('chatgpt', currentAvailableAIs, 'mostRecent');
        } catch (fallbackError) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          try {
            reply = await fetchAI(endpoints.chatgpt, openAIApiKey, 'gpt-4o-mini', 'POST', {
              model: 'gpt-4o-mini',
              messages: [{ role: 'system', content: "You are Luna, a super friendly helpful chatbot. You really care about this person." }, { role: 'user', content: promptWithDirective }]
            });
            updateAIStatus('chatgpt', currentAvailableAIs, 'mostRecent');
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

async function fetchAI(endpoint, apiKey, model, method, body, headerKey = 'Authorization') {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(endpoint, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        [headerKey]: `${headerKey === 'Authorization' ? 'Bearer ' : ''}${apiKey}`,
        'HTTP-Referer': 'http://localhost:8000', // Replace with your site URL
        'X-Title': 'Luna AI Chat', // Replace with your site name
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    console.log(`fetchAI response for ${endpoint}:`, data);
    if ((endpoint === endpoints.chatgpt || endpoint === endpoints.grok || endpoint === endpoints.qwen) && (!data.choices || !data.choices[0]?.message?.content)) {
      throw new Error('No valid response from AI');
    }
    if (endpoint === endpoints.gemini && (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text)) {
      throw new Error('No valid response from Gemini');
    }
    return endpoint === endpoints.gemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content;
  } catch (error) {
    console.error(`fetchAI error for ${endpoint}:`, error.message);
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
    scrollToBottom(); // Scroll to bottom for user messages
  }

  chatContainer.appendChild(msg);
}

async function typeBotMessage(text, isError = false) {
  if (isTyping) stopTyping();

  const msg = document.createElement('div');
  msg.classList.add('message', 'bot');
  if (isError) msg.classList.add('error');
  const bubble = document.createElement('div');
  bubble.classList.add('bubble');
  msg.appendChild(bubble);

  chatContainer.appendChild(msg);
  isTyping = true;
  currentTypingMessage = msg;
  updateActionButton();

  currentTypingTimeouts = [];
  for (let i = 0; i < text.length; i++) {
    if (!isTyping) break;
    const timeout = setTimeout(() => {
      bubble.textContent += text.charAt(i);
    }, i * 15);
    currentTypingTimeouts.push(timeout);
  }

  const totalTime = text.length * 15;
  const reset = setTimeout(() => {
    isTyping = false;
    currentTypingMessage = null;
    updateActionButton();
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
  });
}

function handleAction() {
  if (isTyping) {
    stopTyping();
  } else {
    sendMessage();
  }
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

function displayVersion() {
  const versionElement = document.createElement('div');
  versionElement.className = 'version';
  versionElement.textContent = 'Version 1.0.1';
  document.querySelector('.chat-wrapper').appendChild(versionElement);
}

window.addEventListener("DOMContentLoaded", () => {
  console.log('DOM loaded, appending initial message');
  appendMessage("bot", "I'm Luna. How can I help?");
  displayVersion();
});

window.addEventListener('load', async () => {
  console.log('Window loaded, initializing');
  await loadApiKeys();
  updateAIStatus(); // Ensure initial status update
  updateAIStatus('qwen', ['qwen'], 'mostRecent'); // Initial Qwen status

  initializeDarkMode();
  initializeEventListeners();
});