
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');

async function sendMessage() {
  const input = userInput.value.trim();
  if (!input) return;

  appendMessage('user', input);
  userInput.value = '';

  const thinkingEl = appendMessage('bot', 'Luna is thinking', true);
  animateDots(thinkingEl);

  const reply = await fetchChatGPT(input);

  clearInterval(thinkingEl._dotInterval);
  thinkingEl.remove();
  await typeBotMessage(reply);
}

function appendMessage(role, text, isThinking = false) {
  const msg = document.createElement('div');
  msg.classList.add('message', role);
  msg.textContent = text;
  if (isThinking) msg.classList.add('dots');
  chatContainer.append(msg);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  setTimeout(() => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }, 10);
  return msg;
}

async function typeBotMessage(text) {
  const msg = document.createElement('div');
  msg.classList.add('message', 'bot');
  chatContainer.appendChild(msg);

  for (let i = 0; i < text.length; i++) {
    msg.textContent += text.charAt(i);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    await new Promise(r => setTimeout(r, 15));
  }
}

async function fetchChatGPT(prompt) {
  const apiKey = 'YOUR_API_KEY_HERE';  // Replace this
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  return data.choices[0]?.message?.content || '[No response]';
}

function animateDots(el) {
  let dots = 0;
  const interval = setInterval(() => {
    el.textContent = 'Luna is thinking' + '.'.repeat(dots % 4);
    dots++;
  }, 500);
  el._dotInterval = interval;
}

window.onload = () => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  };