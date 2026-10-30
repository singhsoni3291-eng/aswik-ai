"use strict";

/*
=========================================================
 ASWIK AI — SMART BRAIN ENGINE 5.0
 Developer: Aswik Singh

 Features:
 - Cloudflare Workers AI connection
 - Automatic language detection
 - English, Hindi and Hinglish support
 - SearXNG-powered web search through the Worker
 - Source links in answers
 - Conversation history and follow-up questions
 - Instant date and time
 - Simple arithmetic
 - Safe text rendering
=========================================================
*/

const ASWIK = {
  name: "ASWIK AI",
  developer: "Aswik Singh",
  version: "5.0",

  workerURL:
    "https://ancient-pond-adc4.singhsoni3291.workers.dev",

  maxHistory: 20,
  requestTimeout: 35000
};

const chat = document.querySelector("#chat");
const input = document.querySelector("#messageInput");
const sendButton = document.querySelector("#sendBtn");

let conversation = [];
let isThinking = false;

/* ---------------- LANGUAGE DETECTION ---------------- */

function detectLanguage(text) {
  const value = String(text || "").toLowerCase();

  // Hindi written in Devanagari
  if (/[\u0900-\u097F]/.test(value)) {
    return "Hindi";
  }

  // Common Hindi words typed using English letters
  const hinglishWords = [
    "kya", "kaise", "kaisa", "kyun", "kyu",
    "hai", "hain", "ho", "tha", "thi",
    "mera", "meri", "mere", "aap", "tum",
    "mujhe", "batao", "samjhao", "samjha",
    "karna", "karo", "kaun", "kab", "kahan",
    "accha", "achha", "nahi", "nahin",
    "haan", "han", "bhai", "yaar",
    "kitna", "kitne", "kitni", "iska",
    "uska", "kyunki", "matlab", "mein",
    "me", "aur", "lekin", "wala", "wali"
  ];

  const words = value.match(/[a-z]+/g) || [];
  const matches = words.filter(word =>
    hinglishWords.includes(word)
  ).length;

  if (matches >= 2 || (matches >= 1 && words.length <= 5)) {
    return "Hinglish";
  }

  // Allow the AI to identify other languages itself
  return "Auto";
}

/* ---------------- CHAT DISPLAY ---------------- */

function addMessage(role, text, sources = []) {
  if (!chat) return;

  const wrapper = document.createElement("div");
  wrapper.className =
    role === "user" ? "message user-message" : "message assistant-message";

  const label = document.createElement("strong");
  label.className = "message-sender";
  label.textContent = role === "user" ? "YOU" : "A — ASWIK AI";

  const body = document.createElement("div");
  body.className = "message-text";
  body.textContent = text;

  wrapper.appendChild(label);
  wrapper.appendChild(body);

  if (role === "assistant" && Array.isArray(sources) && sources.length) {
    const sourceBox = document.createElement("div");
    sourceBox.className = "message-sources";

    const heading = document.createElement("strong");
    heading.textContent = "Sources";
    sourceBox.appendChild(heading);

    sources.forEach(source => {
      if (!source || !source.url) return;

      try {
        const url = new URL(source.url);

        if (!["https:", "http:"].includes(url.protocol)) return;

        const link = document.createElement("a");
        link.href = url.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = source.title || url.hostname;

        sourceBox.appendChild(link);
      } catch {
        // Ignore invalid source URLs
      }
    });

    if (sourceBox.querySelectorAll("a").length) {
      wrapper.appendChild(sourceBox);
    }
  }

  chat.appendChild(wrapper);
  chat.scrollTop = chat.scrollHeight;
}

function showThinking() {
  removeThinking();

  const element = document.createElement("div");
  element.id = "aswik-thinking";
  element.className = "message assistant-message";
  element.textContent = "⚡ ASWIK is thinking...";
  chat?.appendChild(element);

  if (chat) chat.scrollTop = chat.scrollHeight;
}

function removeThinking() {
  document.querySelector("#aswik-thinking")?.remove();
}

/* ---------------- LOCAL QUICK ANSWERS ---------------- */

function getLocalAnswer(question) {
  const q = question.trim().toLowerCase();

  if (
    q === "who made you?" ||
    q === "who created you?" ||
    q === "who is your developer?" ||
    q === "who developed you?"
  ) {
    return "I am ASWIK AI, a personal AI assistant created by Aswik Singh.";
  }

  if (
    q === "what time is it?" ||
    q === "current time" ||
    q === "what is the date today?" ||
    q === "today's date"
  ) {
    return `Current date and time: ${new Date().toLocaleString(
      "en-IN",
      { timeZone: "Asia/Kolkata" }
    )} (IST).`;
  }

  return null;
}

/* ---------------- WORKER CONNECTION ---------------- */

async function askASWIK(question) {
  const language = detectLanguage(question);

  const history = conversation
    .slice(-ASWIK.maxHistory)
    .map(item => ({
      role: item.role,
      content: item.content
    }));

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    ASWIK.requestTimeout
  );

  try {
    const response = await fetch(ASWIK.workerURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question,
        language,
        history
      }),
      signal: controller.signal
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Server error: ${response.status}`);
    }

    if (!data.answer) {
      throw new Error("The AI returned an empty answer.");
    }

    return {
      answer: data.answer,
      sources: Array.isArray(data.sources) ? data.sources : [],
      searched: Boolean(data.searched)
    };

  } finally {
    clearTimeout(timeout);
  }
}

/* ---------------- SEND MESSAGE ---------------- */

async function sendMessage() {
  if (!input || isThinking) return;

  const question = input.value.trim();
  if (!question) return;

  input.value = "";
  isThinking = true;

  addMessage("user", question);

  conversation.push({
    role: "user",
    content: question
  });

  const localAnswer = getLocalAnswer(question);

  if (localAnswer) {
    addMessage("assistant", localAnswer);

    conversation.push({
      role: "assistant",
      content: localAnswer
    });

    conversation = conversation.slice(-ASWIK.maxHistory);
    isThinking = false;
    return;
  }

  showThinking();

  try {
    const result = await askASWIK(question);

    removeThinking();
    addMessage("assistant", result.answer, result.sources);

    let historyAnswer = result.answer;

    if (result.sources.length) {
      historyAnswer += "\nSources: " +
        result.sources.map(source => source.title).join("; ");
    }

    conversation.push({
      role: "assistant",
      content: historyAnswer
    });

    conversation = conversation.slice(-ASWIK.maxHistory);

  } catch (error) {
    removeThinking();

    let message = "I couldn't connect to my AI brain. Please try again.";

    if (error.name === "AbortError") {
      message = "The request took too long. Please try again.";
    } else if (error.message) {
      message += "\nDetails: " + error.message;
    }

    addMessage("assistant", message);

    conversation.push({
      role: "assistant",
      content: message
    });

  } finally {
    isThinking = false;
    input.focus();
  }
}

/* ---------------- EVENT LISTENERS ---------------- */

if (!chat || !input || !sendButton) {
  console.error(
    "ASWIK AI: Required HTML elements not found. " +
    "Expected #chat, #messageInput and #sendBtn."
  );
} else {
  sendButton.addEventListener("click", sendMessage);

  input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  console.info(
    `ASWIK AI ${ASWIK.version} initialized — Developed by ${ASWIK.developer}.`
  );
}
