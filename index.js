const chatContainer = document.getElementById("chat-container");
const userInput = document.getElementById("user-input");

async function sendMessage() {
  const input = userInput.value.trim();
  if (!input) return;

  appendMessage("user", input);
  userInput.value = "";

  const thinkingEl = appendMessage("bot", "Luna is thinking", true);
  animateDots(thinkingEl);

  const reply = await fetchChatGPT(input);

  clearInterval(thinkingEl._dotInterval);
  thinkingEl.remove();
  await typeBotMessage(reply);
}

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Debounced scroll function
const scrollToBottom = debounce(() => {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}, 10);

function appendMessage(role, text, isThinking = false) {
  const msg = document.createElement("div");
  msg.classList.add("message", role);

  if (role === "bot") {
    const bubble = document.createElement("div");
    bubble.classList.add("bubble");
    bubble.textContent = text;
    if (isThinking) bubble.classList.add("dots");
    msg.appendChild(bubble);
  } else {
    msg.textContent = text;
  }

  chatContainer.appendChild(msg);
  scrollToBottom();
  return msg;
}

async function typeBotMessage(text) {
  const msg = document.createElement("div");
  msg.classList.add("message", "bot");
  const bubble = document.createElement("div");
  bubble.classList.add("bubble");
  msg.appendChild(bubble);
  chatContainer.appendChild(msg);

  const textNode = document.createTextNode("");
  bubble.appendChild(textNode);

  for (let i = 0; i < text.length; i++) {
    textNode.textContent += text.charAt(i);
    scrollToBottom();
    await new Promise((r) => setTimeout(r, 15));
  }
}

async function fetchChatGPT(prompt) {
  const apiKey = "YOUR_API_KEY_HERE"; // Replace this
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  return data.choices[0]?.message?.content || "[No response]";
}

function animateDots(el) {
  let dots = 0;
  const bubble = el.querySelector(".bubble");
  const baseText = "Luna is thinking ";
  bubble.textContent = baseText;
  const dotsSpan = document.createElement("span");
  bubble.appendChild(dotsSpan);

  const interval = setInterval(() => {
    dotsSpan.textContent = ".".repeat(dots % 4);
    dots++;
  }, 500);
  el._dotInterval = interval;
}

window.onload = () => {
  setTimeout(() => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
    console.log("Scrolled to:", chatContainer.scrollTop);
  }, 100);
};

window.addEventListener("resize", () => {
  chatContainer.scrollTop = chatContainer.scrollHeight;
});
