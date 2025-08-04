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

// Initialize chat history
let chatHistory = [];

const endpoints = {
  grok: 'https://api.x.ai/v1/chat/completions',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
  chatgpt: 'https://api.openai.com/v1/chat/completions',
  qwen: 'http://127.0.0.1:11434/api/generate',
  phi: 'http://127.0.0.1:11434/api/generate'
};

const defaultAi = 'phi';
let availableAIs = [];

const availableModels = {
  phi: true,
  qwen: true
};

// Define AI complexity order (simpler to more complex)
const aiComplexityOrder = ['phi', 'qwen', 'gemini', 'chatgpt', 'grok'];

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
  updateAIStatus();
}

function updateAIStatus(lastUsedAI = null, availableAIsParam = []) {
  const aiStatus = {
    grok: { squares: document.querySelectorAll('.ai-status:nth-child(1) .status-square') },
    gemini: { squares: document.querySelectorAll('.ai-status:nth-child(2) .status-square') },
    chatgpt: { squares: document.querySelectorAll('.ai-status:nth-child(3) .status-square') },
    qwen: { squares: document.querySelectorAll('.ai-status:nth-child(4) .status-square') },
    phi: { squares: document.querySelectorAll('.ai-status:nth-child(5) .status-square') },
    local: { squares: document.querySelectorAll('.ai-status:nth-child(6) .status-square') }
  };

  ['grok', 'gemini', 'chatgpt', 'qwen', 'phi', 'local'].forEach(ai => {
    const { squares } = aiStatus[ai];
    if (squares.length === 0) {
      console.warn(`No status squares found for ${ai}, DOM query failed`);
      return;
    }
    squares.forEach(square => {
      square.classList.remove('online', 'offline');
      square.style.background = '';
    });

    const isOffline = (ai === 'qwen' && !availableModels.qwen) || (!xAIApiKey && ai === 'grok') || (!openAIApiKey && ai === 'chatgpt') || (!geminiApiKey && ai === 'gemini') || (ai === 'phi' && !availableModels.phi);
    if (ai === 'local') {
      const isLocalUsed = availableAIsParam.includes('qwen') || availableAIsParam.includes('phi');
      if (isLocalUsed && (lastUsedAI === 'qwen' || lastUsedAI === 'phi')) {
        squares.forEach((square, index) => {
          square.classList.add('online');
          square.style.background = index === 0 || index === 1 ? 'green' : '';
        });
        console.log('local set to used (2 green) as local AI was last used');
      } else if (isLocalUsed) {
        squares[0].classList.add('online');
        squares[0].style.background = 'green';
        for (let i = 1; i < squares.length; i++) squares[i].style.background = '';
        console.log('local set to online (1 green) as local AI is available');
      } else {
        squares[0].classList.add('offline');
        squares[0].style.background = 'red';
        for (let i = 1; i < squares.length; i++) squares[i].style.background = '';
        console.log('local set to offline (red) by default');
      }
    } else if (isOffline) {
      squares[0].classList.add('offline');
      squares[0].style.background = 'red';
      for (let i = 1; i < squares.length; i++) squares[i].style.background = '';
      console.log(`${ai} set to offline (red) due to missing key or file`);
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

function checkModelFile(modelName) {
  return availableModels[modelName] || false;
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

  await new Promise(resolve => setTimeout(resolve, 1000));

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

  if (checkModelFile('phi')) {
    try {
      const response = await fetchAI(endpoints.phi, '', 'phi', 'POST', { model: "phi:latest", prompt: testPrompt, stream: false });
      if (response) localAvailableAIs.push('phi');
    } catch (error) {
      console.log('Phi availability check failed:', error.message);
    }
  }

  if (checkModelFile('qwen')) {
    try {
      const response = await fetchAI(endpoints.qwen, '', 'qwen', 'POST', { model: "qwen3:4b", prompt: testPrompt, stream: false });
      if (response) localAvailableAIs.push('qwen');
    } catch (error) {
      console.log('Qwen availability check failed:', error.message);
    }
  }

  const aiList = [
    ...(localAvailableAIs.includes('qwen') ? [{ name: 'Qwen', fetch: (prompt) => fetchAI(endpoints.qwen, '', 'qwen', 'POST', { model: "qwen3:4b", prompt: `${prompt}\n\nContext: ${chatHistory.map(h => `${h.role}: ${h.message}`).join('\n')}`, stream: false }), id: 'qwen' }] : []),
    ...(localAvailableAIs.includes('phi') ? [{ name: 'Phi', fetch: (prompt) => fetchAI(endpoints.phi, '', 'phi', 'POST', { model: "phi:latest", prompt: `${prompt}\n\nContext: ${chatHistory.map(h => `${h.role}: ${h.message}`).join('\n')}`, stream: false }), id: 'phi' }] : []),
    ...(localAvailableAIs.includes('grok') ? [{ name: 'Grok', fetch: (prompt) => fetchAI(endpoints.grok, xAIApiKey, 'grok-beta', 'POST', {
      model: 'grok-beta',
      messages: [{ role: 'system', content: "You are Luna, a super friendly helpful chatbot. You really care about this person." }, { role: 'user', content: `${prompt}\n\nContext: ${chatHistory.map(h => `${h.role}: ${h.message}`).join('\n')}` }]
    }), model: 'grok-beta', id: 'grok' }] : []),
    ...(localAvailableAIs.includes('gemini') ? [{ name: 'Gemini', fetch: (prompt) => fetchAI(endpoints.gemini, geminiApiKey, 'gemini-2.0-flash', 'POST', {
      contents: [{ parts: [{ text: "You are Luna, a super friendly helpful chatbot. You really care about this person. " + `${prompt}\n\nContext: ${chatHistory.map(h => `${h.role}: ${h.message}`).join('\n')}` }] }]
    }, 'X-goog-api-key'), model: 'gemini-2.0-flash', id: 'gemini' }] : []),
    ...(localAvailableAIs.includes('chatgpt') ? [{ name: 'ChatGPT', fetch: (prompt) => fetchAI(endpoints.chatgpt, openAIApiKey, 'gpt-4o', 'POST', {
      model: 'gpt-4o',
      messages: [{ role: 'system', content: "You are Luna, a super friendly helpful chatbot. You really care about this person." }, { role: 'user', content: `${prompt}\n\nContext: ${chatHistory.map(h => `${h.role}: ${h.message}`).join('\n')}` }]
    }), model: 'gpt-4o', id: 'chatgpt' }] : [])
  ];
  availableAIs = localAvailableAIs;
  updateAIStatus(null, localAvailableAIs);
  return { ai: aiList.length > 0 ? aiList[0] : null, availableAIs: localAvailableAIs, aiList: aiList };
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function scrollToBottom() {
  const start = chatContainer.scrollTop;
  const target = chatContainer.scrollHeight - chatContainer.clientHeight;
  const duration = 1000;
  let startTime = null;

  function animateScroll(currentTime) {
    if (!startTime) startTime = currentTime;
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
    chatContainer.scrollTop = start + (target - start) * ease;
    if (progress < 1) requestAnimationFrame(animateScroll);
  }

  requestAnimationFrame(animateScroll);
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
  if (thinkingIndicator) thinkingIndicator.style.display = 'none';
}

async function sendMessage() {
  const input = userInput.value.trim();
  if (!input || isTyping) return;

  // Add user message to chat history
  chatHistory.push({ role: 'user', message: input });
  if (chatHistory.length > 5) chatHistory.shift(); // Keep last 5 messages
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
    if (!result || !result.ai) {
      hideThinking();
      appendMessage('bot', 'No AI available', false, true);
      updateAIStatus();
      return;
    }

    let { ai: availableAI, availableAIs: currentAvailableAIs, aiList } = result;

    if (currentAvailableAIs.includes(defaultAi)) {
      availableAI = aiList.find(ai => ai.id === defaultAi) || availableAI;
    }

    let reply;
    const aiListNames = aiList.map(ai => ai.name).join(', ');
    const promptWithDirective = `Provide a single, complete response as Luna, with no labeling or passing unless necessary. Assume you’re already known as Luna and skip the greeting unless asked. You are a super friendly helpful chatbot. You really care about this person. Available AIs are: ${aiListNames}. If you are unqualified to answer or a simpler AI can handle this, pass by logging the reason to the console and responding with the pass message. Question: ${input}`;
    try {
      reply = await availableAI.fetch(promptWithDirective);
      console.log(`Response from ${availableAI.name}:`, reply);
      let currentIndex = aiComplexityOrder.indexOf(availableAI.id);
      let nextSimplerAI = aiList.find(ai => aiComplexityOrder.indexOf(ai.id) < currentIndex && currentAvailableAIs.includes(ai.id));
      let nextComplexAI = aiList.find(ai => aiComplexityOrder.indexOf(ai.id) > currentIndex && currentAvailableAIs.includes(ai.id));

      if (reply === "" || (nextSimplerAI && availableAI.id !== 'phi')) {
        if (nextSimplerAI) {
          console.log(`[Pass] ${availableAI.name} passed to ${nextSimplerAI.name} because a simpler AI can handle it or response was empty`);
          appendMessage('bot', `[${availableAI.name}] passed this question to [${nextSimplerAI.name}]`);
          availableAI = nextSimplerAI;
          reply = await availableAI.fetch(promptWithDirective);
          if (reply === "" && nextComplexAI) {
            console.log(`[Pass] ${availableAI.name} passed to ${nextComplexAI.name} due to empty response`);
            appendMessage('bot', `[${availableAI.name}] passed this question to [${nextComplexAI.name}]`);
            availableAI = nextComplexAI;
            reply = await availableAI.fetch(promptWithDirective);
          }
        } else if (nextComplexAI) {
          console.log(`[Pass] ${availableAI.name} passed to ${nextComplexAI.name} due to empty response or unqualified`);
          appendMessage('bot', `[${availableAI.name}] passed this question to [${nextComplexAI.name}]`);
          availableAI = nextComplexAI;
          reply = await availableAI.fetch(promptWithDirective);
        } else {
          appendMessage('bot', 'Unable to generate a response');
        }
        hideThinking();
      } else {
        // Add AI response to chat history
        chatHistory.push({ role: 'ai', message: reply });
        if (chatHistory.length > 5) chatHistory.shift();
        updateAIStatus(availableAI.id, currentAvailableAIs, 'mostRecent');
        hideThinking();
        await typeBotMessage(reply);
      }
    } catch (error) {
      console.error(`${availableAI.name} error:`, error.message);
      hideThinking();
      if (error.name === 'AbortError' && nextComplexAI) {
        console.log(`[Pass] ${availableAI.name} passed to ${nextComplexAI.name} due to timeout`);
        appendMessage('bot', `[${availableAI.name}] passed this question to [${nextComplexAI.name}]`);
        availableAI = nextComplexAI;
        try {
          reply = await availableAI.fetch(promptWithDirective);
          chatHistory.push({ role: 'ai', message: reply });
          if (chatHistory.length > 5) chatHistory.shift();
          updateAIStatus(availableAI.id, currentAvailableAIs, 'mostRecent');
          hideThinking();
          await typeBotMessage(reply);
        } catch (fallbackError) {
          console.error(`${availableAI.name} fallback error:`, fallbackError.message);
          appendMessage('bot', 'No AI available after timeout', false, true);
        }
      } else if (availableAI.name === 'ChatGPT' && error.message.includes('insufficient_quota')) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          reply = await fetchAI(endpoints.chatgpt, openAIApiKey, 'gpt-3.5-turbo', 'POST', {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'system', content: "You are Luna, a super friendly helpful chatbot. You really care about this person." }, { role: 'user', content: promptWithDirective }]
          });
          chatHistory.push({ role: 'ai', message: reply });
          if (chatHistory.length > 5) chatHistory.shift();
          updateAIStatus('chatgpt', currentAvailableAIs, 'mostRecent');
        } catch (fallbackError) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          try {
            reply = await fetchAI(endpoints.chatgpt, openAIApiKey, 'gpt-4o-mini', 'POST', {
              model: 'gpt-4o-mini',
              messages: [{ role: 'system', content: "You are Luna, a super friendly helpful chatbot. You really care about this person." }, { role: 'user', content: promptWithDirective }]
            });
            chatHistory.push({ role: 'ai', message: reply });
            if (chatHistory.length > 5) chatHistory.shift();
            updateAIStatus('chatgpt', currentAvailableAIs, 'mostRecent');
          } catch (miniError) {
            throw new Error(`ChatGPT fallbacks failed: ${miniError.message}`);
          }
        }
        hideThinking();
        await typeBotMessage(reply);
      } else {
        appendMessage('bot', 'No AI available after error', false, true);
      }
    }
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
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout

  try {
    const response = await fetch(endpoint, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        [headerKey]: `${headerKey === 'Authorization' ? 'Bearer ' : ''}${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    console.log(`fetchAI response for ${endpoint}:`, data);
    let responseText = endpoint === endpoints.gemini ? data.candidates[0].content.parts[0].text : data.response;
    responseText = responseText.replace(/<think>[\s\S]*?<\/think>/g, '');
    if ((typeof endpoint === 'string' && (endpoint.includes('chatgpt') || endpoint.includes('grok') || endpoint.includes('api/generate'))) && (!data.response)) {
      throw new Error('No valid response from AI');
    }
    if (endpoint === endpoints.gemini && (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text)) {
      throw new Error('No valid response from Gemini');
    }
    return responseText;
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
    scrollToBottom();
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
    const timeout = setTimeout(() => bubble.textContent += text.charAt(i), i * 15);
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
  if (isTyping) stopTyping();
  else sendMessage();
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
  const scrollButton = document.getElementById('scroll-to-bottom');
  if (scrollButton) scrollButton.addEventListener('click', scrollToBottom);
}

function displayVersion() {
  const versionElement = document.createElement('div');
  versionElement.className = 'version';
  versionElement.textContent = 'Version 1.2.0'; // Updated to 1.2.0
  document.querySelector('.chat-wrapper').appendChild(versionElement);
}

function updateScrollButton() {
  const scrollButton = document.getElementById('scroll-to-bottom');
  if (!scrollButton) return;
  const isAtBottom = chatContainer.scrollHeight - chatContainer.scrollTop <= chatContainer.clientHeight + 10;
  scrollButton.style.display = isAtBottom ? 'none' : 'flex';
}

function updateDynamicPosition() {
  const inputContainer = document.getElementById('input-container');
  if (!inputContainer) return;

  const inputContainerRect = inputContainer.getBoundingClientRect();
  const buttonBottom = window.innerHeight - inputContainerRect.top + 10;
  document.documentElement.style.setProperty('--dynamic-button-bottom', `${buttonBottom}px`);
}

window.addEventListener("DOMContentLoaded", () => {
  console.log('DOM loaded, appending initial message');
  appendMessage("bot", "I'm Luna. How can I help?");
  displayVersion();
});

window.addEventListener('load', async () => {
  console.log('Window loaded, initializing');
  await loadApiKeys();
  updateAIStatus();
  updateAIStatus('phi', ['phi'], 'mostRecent');

  initializeDarkMode();
  initializeEventListeners();
  chatContainer.addEventListener('scroll', debounce(updateScrollButton, 100));
  updateScrollButton();
  updateDynamicPosition();
});

window.addEventListener('resize', debounce(updateDynamicPosition, 100));