
"use strict";

/*
=========================================================
 ASWIK AI — SMART BRAIN ENGINE 5.1
 Developer: Aswik Singh

 - Original JARVIS chat bubble structure restored
 - Cloudflare Workers AI
 - English, Hindi and Hinglish support
 - Web search through Cloudflare Worker
 - Conversation history
 - Search form and quick buttons
 - Live India clock
 - About Developer dialog
=========================================================
*/

const ASWIK = {
  name: "ASWIK AI",
  developer: "Aswik Singh",
  version: "5.1",
  endpoint: "https://ancient-pond-adc4.singhsoni3291.workers.dev",
  maxHistory: 20,
  timeout: 35000
};

const $ = selector => document.querySelector(selector);

const chat = $("#chat");
const input = $("#messageInput");
const sendBtn = $("#sendBtn");

let history = [];
let busy = false;

/* ---------------- LANGUAGE DETECTION ---------------- */

function detectLanguage(text) {
  const q = String(text || "").toLowerCase();

  if (/[\u0900-\u097F]/.test(q)) {
    return "Hindi";
  }

  const hindiWords = [
    "kya", "kaise", "kyun", "kyu", "hai", "hain",
    "ho", "tha", "thi", "mera", "meri", "mere",
    "aap", "tum", "mujhe", "batao", "samjhao",
    "samjha", "karna", "karo", "kaun", "kab",
    "kahan", "nahi", "nahin", "haan", "achha",
    "accha", "kitna", "kitne", "kitni", "iska",
    "uska", "kyunki", "matlab", "mein", "aur",
    "lekin", "bhai", "yaar"
  ];

  const words = q.match(/[a-z]+/g) || [];
  const matches = words.filter(word =>
    hindiWords.includes(word)
  ).length;

  if (matches >= 2 || (matches >= 1 && words.length <= 5)) {
    return "Hinglish";
  }

  // English is the default for English-script questions.
  return "English";
}

/* ---------------- ORIGINAL CHAT BUBBLES ---------------- */

function addMessage(text, who = "assistant", sources = []) {
  if (!chat) return null;

  const row = document.createElement("div");
  row.className = `message ${who}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = who === "user" ? "Y" : "A";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const heading = document.createElement("strong");
  heading.textContent = who === "user" ? "YOU" : "ASWIK AI";

  const paragraph = document.createElement("p");
  paragraph.textContent = String(text);

  bubble.appendChild(heading);
  bubble.appendChild(paragraph);

  // Display real source links when the Worker supplies them.
  if (who === "assistant" && Array.isArray(sources) && sources.length) {
    const sourceHeading = document.createElement("strong");
    sourceHeading.textContent = "Sources";
    sourceHeading.className = "source-heading";
    bubble.appendChild(sourceHeading);

    sources.forEach(source => {
      try {
        const url = new URL(source.url);

        if (!["https:", "http:"].includes(url.protocol)) return;

        const link = document.createElement("a");
        link.href = url.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = source.title || url.hostname;
        link.className = "source-link";

        bubble.appendChild(link);
      } catch {
        // Ignore invalid source links.
      }
    });
  }

  row.appendChild(avatar);
  row.appendChild(bubble);

  chat.appendChild(row);

  chat.scrollTo({
    top: chat.scrollHeight,
    behavior: "smooth"
  });

  return paragraph;
}

/* ---------------- THINKING INDICATOR ---------------- */

function showThinking() {
  removeThinking();

  const row = document.createElement("div");
  row.className = "message assistant typing-message";
  row.id = "aswikThinking";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "A";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const heading = document.createElement("strong");
  heading.textContent = "ASWIK AI";

  const paragraph = document.createElement("p");
  paragraph.textContent = "⚡ ASWIK is thinking...";

  bubble.append(heading, paragraph);
  row.append(avatar, bubble);

  chat?.appendChild(row);

  if (chat) chat.scrollTop = chat.scrollHeight;
}

function removeThinking() {
  $("#aswikThinking")?.remove();
}

/* ---------------- LOCAL ANSWERS ---------------- */

function instantAnswer(question) {
  const q = question.trim().toLowerCase();

  const identityQuestions = [
    "who made you",
    "who created you",
    "who is your developer",
    "who developed you"
  ];

  if (identityQuestions.some(item => q.includes(item))) {
    return "I am ASWIK AI, a personal AI assistant created by Aswik Singh.";
  }

  if (
    q === "what time is it" ||
    q === "current time" ||
    q === "today's date" ||
    q === "what is today's date"
  ) {
    return "Current date and time: " +
      new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata"
      }) + " (IST).";
  }

  return null;
}

/* ---------------- CLOCK ---------------- */

function updateClock() {
  const clock = $("#clock");
  if (!clock) return;

  const now = new Date();

  clock.textContent = now.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}

updateClock();
setInterval(updateClock, 1000);

/* ---------------- AI REQUEST ---------------- */

async function askBrain(question) {
  const language = detectLanguage(question);

  // Exclude the current question, which is already in history.
  const previousHistory = history
    .slice(0, -1)
    .slice(-ASWIK.maxHistory)
    .map(item => ({
      role: item.role,
      content: item.content
    }));

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    ASWIK.timeout
  );

  try {
    const response = await fetch(ASWIK.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question,
        language,
        history: previousHistory
      }),
      signal: controller.signal
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    if (!data.answer) {
      throw new Error("The AI returned an empty answer.");
    }

    return {
      answer: data.answer,
      sources: Array.isArray(data.sources) ? data.sources : [],
      searched: Boolean(data.searched),
      searchError: data.searchError || null
    };

  } finally {
    clearTimeout(timer);
  }
}

/* ---------------- SEND MESSAGE ---------------- */

async function sendMessage(text = null) {
  if (busy) return;

  const question = String(text ?? input?.value ?? "").trim();
  if (!question) return;

  if (input) input.value = "";

  busy = true;

  addMessage(question, "user");

  history.push({
    role: "user",
    content: question
  });

  const instant = instantAnswer(question);

  if (instant) {
    addMessage(instant, "assistant");

    history.push({
      role: "assistant",
      content: instant
    });

    history = history.slice(-ASWIK.maxHistory);
    busy = false;
    return;
  }

  showThinking();

  try {
    const result = await askBrain(question);

    removeThinking();

    addMessage(
      result.answer,
      "assistant",
      result.sources
    );

    let savedAnswer = result.answer;

    if (result.sources.length) {
      savedAnswer += "\nSources: " +
        result.sources.map(s => s.title).join("; ");
    }

    history.push({
      role: "assistant",
      content: savedAnswer
    });

    // Preserve a compact conversation context.
    history = history.slice(-ASWIK.maxHistory);

    if (result.searchError) {
      console.warn("ASWIK search diagnostic:", result.searchError);
    }

  } catch (error) {
    removeThinking();

    let message = "I couldn't connect to my AI brain. Please try again.";

    if (error.name === "AbortError") {
      message = "The request timed out. Please try again.";
    } else if (error.message) {
      message += "\n" + error.message;
    }

    addMessage(message, "assistant");

    history.push({
      role: "assistant",
      content: message
    });

    history = history.slice(-ASWIK.maxHistory);

    console.error("ASWIK AI error:", error);

  } finally {
    removeThinking();
    busy = false;
    input?.focus();
  }
}

/* ---------------- SEND BUTTON ---------------- */

sendBtn?.addEventListener("click", () => sendMessage());

input?.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

/* ---------------- SEARCH FORM ---------------- */

$("#searchForm")?.addEventListener("submit", event => {
  event.preventDefault();

  const searchInput = $("#searchInput");
  const query = searchInput?.value.trim();

  if (!query) return;

  window.open(
    "https://www.google.com/search?q=" + encodeURIComponent(query),
    "_blank",
    "noopener,noreferrer"
  );

  searchInput.value = "";
});

/* ---------------- QUICK QUESTION BUTTONS ---------------- */

document.querySelectorAll("[data-query]").forEach(button => {
  button.addEventListener("click", () => {
    const question = button.getAttribute("data-query");
    if (question) sendMessage(question);
  });
});

/* ---------------- ABOUT DEVELOPER ---------------- */

$("#aboutBtn")?.addEventListener("click", () => {
  const dialog = $("#aboutDialog");

  if (dialog?.showModal) {
    dialog.showModal();
  } else if (dialog) {
    dialog.setAttribute("open", "");
  }
});

$("#closeAbout")?.addEventListener("click", () => {
  const dialog = $("#aboutDialog");

  if (dialog?.close) {
    dialog.close();
  } else {
    dialog?.removeAttribute("open");
  }
});

/* ---------------- STARTUP ---------------- */

console.log(
  `${ASWIK.name} Brain ${ASWIK.version} — Developer: ${ASWIK.developer}`
);
