
/*
=========================================================
 ASWIK AI — SMART BRAIN ENGINE 3.0
 Developer: Aswik Singh
 No API key. No paid AI service. No eval().

 Features:
 - Restored chat bubbles with automatic CSS
 - Safe text rendering and source links
 - India date/time
 - Arithmetic and clock-angle reasoning
 - Improved concept matching
 - Wikipedia search and summaries
 - News retrieval with multiple fallbacks
 - Indian festival search assistance
 - Thinking indicator and conversation history
 - Existing HTML controls supported
=========================================================
*/

"use strict";

/* =======================================================
   1. CONFIGURATION
======================================================= */

const ASWIK = {
  name: "ASWIK AI",
  developer: "Aswik Singh",
  version: "3.0",

  wikipediaSearch:
    "https://en.wikipedia.org/w/rest.php/v1/search/page",

  wikipediaSummary:
    "https://en.wikipedia.org/api/rest_v1/page/summary/",

  feeds: {
    india:
      "https://news.google.com/rss/search?q=India+when%3A1d&hl=en-IN&gl=IN&ceid=IN%3Aen",

    world:
      "https://news.google.com/rss/search?q=world+news+when%3A1d&hl=en-IN&gl=IN&ceid=IN%3Aen",

    technology:
      "https://news.google.com/rss/search?q=AI+technology+when%3A1d&hl=en-IN&gl=IN&ceid=IN%3Aen"
  },

  timeout: 12000,
  maxHistory: 30,
  maxNews: 7
};

const ASWIK_STATE = {
  history: [],
  cache: new Map(),
  busy: false
};

/* =======================================================
   2. AUTOMATIC CHAT UI STYLING
   Restores visible bubbles even if the original CSS
   does not contain styles for the message classes.
======================================================= */

function installChatStyles() {
  if (document.querySelector("#aswik-brain-styles")) return;

  const style = document.createElement("style");
  style.id = "aswik-brain-styles";

  style.textContent = `
    #chat {
      display: flex;
      flex-direction: column;
      gap: 18px;
      overflow-y: auto;
      scroll-behavior: smooth;
      min-height: 0;
      padding: 16px;
      box-sizing: border-box;
    }

    #chat .message {
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: fit-content;
      max-width: min(88%, 760px);
      min-width: 0;
      box-sizing: border-box;
      overflow-wrap: anywhere;
      animation: aswikMessageIn .22s ease-out;
    }

    #chat .user-message {
      align-self: flex-end;
      align-items: flex-end;
    }

    #chat .ai-message {
      align-self: flex-start;
      align-items: flex-start;
    }

    #chat .message-sender {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #62eaff;
      padding: 0 7px;
    }

    #chat .user-message .message-sender {
      color: #a8c5ff;
    }

    #chat .message-content {
      box-sizing: border-box;
      padding: 12px 16px;
      border: 1px solid rgba(83, 221, 255, .24);
      border-radius: 18px;
      background: rgba(13, 34, 48, .96);
      color: #edfaff;
      font-size: 15px;
      line-height: 1.65;
      overflow-wrap: anywhere;
      max-width: 100%;
    }

    #chat .user-message .message-content {
      background: linear-gradient(
        135deg,
        rgba(12, 82, 112, .98),
        rgba(17, 55, 89, .98)
      );
      border-color: rgba(100, 210, 255, .4);
      border-radius: 18px 18px 5px 18px;
    }

    #chat .ai-message .message-content {
      border-radius: 18px 18px 18px 5px;
    }

    #chat .message-content h3,
    #chat .message-content h4 {
      margin: 8px 0;
      color: #76eaff;
      line-height: 1.4;
    }

    #chat .message-content p {
      margin: 5px 0 10px;
    }

    #chat .message-content strong {
      color: #ffffff;
      font-weight: 750;
    }

    #chat .message-content code {
      background: rgba(0, 0, 0, .25);
      padding: 2px 5px;
      border-radius: 4px;
    }

    #chat .message-content .aswik-list-item {
      padding-left: 5px;
      margin: 4px 0;
    }

    #chat .answer-links {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 7px;
      max-width: 100%;
      padding: 3px 7px;
    }

    #chat .answer-links a {
      color: #65dfff;
      font-size: 13px;
      text-decoration: none;
      overflow-wrap: anywhere;
    }

    #chat .answer-links a:hover {
      text-decoration: underline;
    }

    #chat .aswik-thinking-dots {
      display: inline-flex;
      gap: 5px;
      align-items: center;
      margin-left: 5px;
    }

    #chat .aswik-thinking-dots span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #62eaff;
      animation: aswikDot 1s infinite ease-in-out;
    }

    #chat .aswik-thinking-dots span:nth-child(2) {
      animation-delay: .15s;
    }

    #chat .aswik-thinking-dots span:nth-child(3) {
      animation-delay: .3s;
    }

    @keyframes aswikMessageIn {
      from { opacity: 0; transform: translateY(7px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes aswikDot {
      0%, 60%, 100% { opacity: .35; transform: translateY(0); }
      30% { opacity: 1; transform: translateY(-4px); }
    }

    @media (max-width: 600px) {
      #chat .message {
        max-width: 94%;
      }

      #chat .message-content {
        font-size: 14px;
        padding: 10px 12px;
      }
    }
  `;

  document.head.appendChild(style);
}

/* =======================================================
   3. SAFE TEXT FORMATTING
======================================================= */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

function formatAnswer(text) {
  const lines = String(text ?? "").split(/\r?\n/);
  const output = [];
  let inList = false;

  function closeList() {
    if (inList) {
      output.push("</div>");
      inList = false;
    }
  }

  function inlineFormat(value) {
    let s = escapeHTML(value);

    s = s.replace(
      /`([^`]+)`/g,
      "<code>$1</code>"
    );

    s = s.replace(
      /\*\*(.+?)\*\*/g,
      "<strong>$1</strong>"
    );

    s = s.replace(
      /(^|[^*])\*([^*]+)\*/g,
      "$1<em>$2</em>"
    );

    return s;
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      closeList();
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);

    if (heading) {
      closeList();
      const tag = heading[1].length === 1 ? "h3" : "h4";

      output.push(
        "<" + tag + ">" +
        inlineFormat(heading[2]) +
        "</" + tag + ">"
      );

      continue;
    }

    const bullet = trimmed.match(/^[-•*]\s+(.+)$/);

    if (bullet) {
      if (!inList) {
        output.push('<div class="aswik-list">');
        inList = true;
      }

      output.push(
        '<div class="aswik-list-item">• ' +
        inlineFormat(bullet[1]) +
        "</div>"
      );

      continue;
    }

    closeList();
    output.push("<p>" + inlineFormat(trimmed) + "</p>");
  }

  closeList();
  return output.join("");
}

function safeURL(value) {
  try {
    const url = new URL(value);

    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
  } catch {}

  return null;
}

function normalise(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function cleanQuestion(text) {
  return normalise(text)
    .replace(/[?!.,]+$/g, "")
    .trim();
}

function containsAny(text, words) {
  return words.some(word => text.includes(word));
}

function googleURL(query) {
  return "https://www.google.com/search?q=" +
    encodeURIComponent(query);
}

function wikiURL(query) {
  return "https://en.wikipedia.org/w/index.php?search=" +
    encodeURIComponent(query);
}

/* =======================================================
   4. CHAT MESSAGES
======================================================= */

function addMessage(text, sender = "ai", links = []) {
  const chat = document.querySelector("#chat");

  if (!chat) {
    console.error(
      "ASWIK: #chat was not found. Add an element with id='chat'."
    );
    console.log(sender + ":", text);
    return;
  }

  const isUser = sender === "user";
  const message = document.createElement("div");

  message.className = isUser
    ? "message user-message"
    : "message ai-message";

  const label = document.createElement("div");
  label.className = "message-sender";
  label.textContent = isUser ? "You" : "A";

  const bubble = document.createElement("div");
  bubble.className = "message-content";
  bubble.innerHTML = formatAnswer(text);

  message.append(label, bubble);

  if (Array.isArray(links) && links.length) {
    const linkContainer = document.createElement("div");
    linkContainer.className = "answer-links";

    links.forEach(item => {
      const href = safeURL(item.url);
      if (!href) return;

      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = item.label || "Open source";

      linkContainer.appendChild(anchor);
    });

    if (linkContainer.childElementCount) {
      message.appendChild(linkContainer);
    }
  }

  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;
}

function showThinking() {
  removeThinking();

  const chat = document.querySelector("#chat");
  if (!chat) return;

  const message = document.createElement("div");
  message.id = "aswik-thinking";
  message.className = "message ai-message";

  const label = document.createElement("div");
  label.className = "message-sender";
  label.textContent = "A";

  const content = document.createElement("div");
  content.className = "message-content";
  content.textContent = "⚡ ASWIK is thinking";

  const dots = document.createElement("span");
  dots.className = "aswik-thinking-dots";

  for (let i = 0; i < 3; i++) {
    dots.appendChild(document.createElement("span"));
  }

  content.appendChild(dots);
  message.append(label, content);
  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;
}

function removeThinking() {
  document.querySelector("#aswik-thinking")?.remove();
}

function remember(role, text) {
  ASWIK_STATE.history.push({
    role,
    text,
    timestamp: Date.now()
  });

  while (ASWIK_STATE.history.length > ASWIK.maxHistory) {
    ASWIK_STATE.history.shift();
  }
}

/* =======================================================
   5. INDIA DATE AND TIME
======================================================= */

function indiaDateTime() {
  const now = new Date();

  return {
    date: new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(now),

    time: new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }).format(now)
  };
}

function updateClock() {
  const clock = document.querySelector("#clock");
  if (!clock) return;

  const current = indiaDateTime();
  clock.textContent = current.date + " • " + current.time + " IST";
}

/* =======================================================
   6. IDENTITY AND INSTANT ANSWERS
======================================================= */

function answerInstant(question) {
  const q = cleanQuestion(question);
  const current = indiaDateTime();

  if (/^(hi|hello|hey|hii|heyy|namaste|yo)\b/.test(q)) {
    return "Heyyy! ⚡ I'm ASWIK AI, created by Aswik Singh. Ask me anything, test my calculations, or explore a topic!";
  }

  if (containsAny(q, [
    "who made you",
    "who created you",
    "who developed you",
    "who built you",
    "who designed you",
    "who is your developer"
  ])) {
    return "I am **ASWIK AI**, designed and developed by **Aswik Singh**. ⚡ My current brain uses JavaScript rules, calculations, built-in explanations, and online information retrieval. I am still being improved.";
  }

  if (containsAny(q, [
    "about developer",
    "tell me about aswik singh",
    "who is aswik singh"
  ])) {
    return "## About the Developer\n\n**Aswik Singh** is the developer of ASWIK AI. The project combines a futuristic assistant interface, a lightweight answer engine, and online information retrieval.";
  }

  if (containsAny(q, [
    "what is your name",
    "who are you",
    "introduce yourself"
  ])) {
    return "I'm **ASWIK AI**, a digital assistant created by **Aswik Singh**. I can calculate, explain supported topics, solve selected puzzles, and retrieve online information.";
  }

  if (
    q === "time" ||
    q.includes("current time") ||
    q.includes("what time is it") ||
    q.includes("time in india")
  ) {
    return "The current time in India is **" +
      current.time + " IST**, on " + current.date + ".";
  }

  if (
    q === "date" ||
    q.includes("today's date") ||
    q.includes("todays date") ||
    q.includes("what is the date") ||
    q.includes("which day is today") ||
    q.includes("what day is it")
  ) {
    return "Today in India is **" + current.date +
      "**. The current time is " + current.time + " IST.";
  }

  if (q.includes("vibgyor")) {
    return "VIBGYOR stands for **Violet, Indigo, Blue, Green, Yellow, Orange, and Red**.";
  }

  if (q.includes("what can you do") || q === "help") {
    return [
      "## ASWIK AI capabilities",
      "",
      "- Solve selected logic puzzles.",
      "- Calculate arithmetic and explain selected steps.",
      "- Explain supported concepts.",
      "- Retrieve Wikipedia summaries.",
      "- Retrieve news when a feed is accessible.",
      "- Show the date and time in India.",
      "- Find online festival-calendar sources.",
      "",
      "This version uses a rule-based JavaScript brain, not a trained general-purpose language model."
    ].join("\n");
  }

  if (
    q.includes("are you a real ai") ||
    q.includes("are you an llm") ||
    q.includes("are you a language model")
  ) {
    return "I'm **ASWIK AI**, a software assistant with programmed reasoning and retrieval features. This version does not contain a trained large language model, so my ability to answer unfamiliar questions is limited.";
  }

  return null;
}

/* =======================================================
   7. REASONING AND CLOCK ANGLES
======================================================= */

function answerReasoning(question) {
  const q = normalise(question);

  if (
    q.includes("17 sheep") &&
    (q.includes("all but 9") || q.includes("all except 9"))
  ) {
    return "The answer is **9 sheep**. All except 9 run away, so 9 remain.";
  }

  if (q.includes("overtake") && q.includes("second place")) {
    return "You are in **second place**. You take the position of the person you overtook.";
  }

  if (
    q.includes("28 days") &&
    (q.includes("months") || q.includes("month"))
  ) {
    return "**12 months.** Every month has at least 28 days.";
  }

  // Bat and ball puzzle.
  if (
    q.includes("bat and a ball") &&
    (q.includes("1.10") || q.includes("$1.10"))
  ) {
    return "The ball costs **$0.05** and the bat costs **$1.05**. Together they cost $1.10, and the bat costs $1 more than the ball.";
  }

  // Clock-hand angle at a time like 3:15.
  const clockMatch = q.match(
    /\b(\d{1,2})\s*:\s*(\d{2})\b/
  );

  if (
    clockMatch &&
    containsAny(q, ["clock", "angle", "hands", "minute hand", "hour hand"])
  ) {
    const hour = Number(clockMatch[1]);
    const minute = Number(clockMatch[2]);

    if (hour >= 0 && hour <= 12 && minute >= 0 && minute < 60) {
      const hourAngle = ((hour % 12) * 30) + minute * 0.5;
      const minuteAngle = minute * 6;
      const difference = Math.abs(hourAngle - minuteAngle);
      const angle = Math.min(difference, 360 - difference);

      return [
        "The smaller angle is **" + angle + "°**.",
        "",
        "**Step 1:** Minute-hand angle = " + minute + " × 6° = " + minuteAngle + "°.",
        "**Step 2:** Hour-hand angle = (" + (hour % 12) + " × 30°) + (" + minute + " × 0.5°) = " + hourAngle + "°.",
        "**Step 3:** Difference = |" + hourAngle + " − " + minuteAngle + "| = " + difference + "°.",
        "**Step 4:** The smaller angle is min(" + difference + "°, 360° − " + difference + "°) = **" + angle + "°**."
      ].join("\n");
    }
  }

  // Arithmetic progression: 2, 4, 6, 8.
  const sequenceMatch = q.match(
    /(?:sequence|series|next number|what comes next)\D*((?:-?\d+(?:\.\d+)?\s*,\s*){2,}-?\d+(?:\.\d+)?)/
  );

  if (sequenceMatch) {
    const nums = sequenceMatch[1].split(",").map(Number);
    const differences = nums.slice(1).map((n, i) => n - nums[i]);

    if (
      differences.length &&
      differences.every(n => Math.abs(n - differences[0]) < 1e-10)
    ) {
      const next = nums[nums.length - 1] + differences[0];

      return "A likely next number is **" + next +
        "**, assuming the sequence continues with a constant difference of " +
        differences[0] + ". Other patterns may also be possible.";
    }
  }

  return null;
}

/* =======================================================
   8. SAFE ARITHMETIC PARSER
======================================================= */

function solveMath(question) {
  let expression = String(question)
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/\bwhat is\b/g, "")
    .replace(/\bcalculate\b/g, "")
    .replace(/\bcompute\b/g, "")
    .replace(/\bsolve\b/g, "")
    .replace(/\banswer\b/g, "")
    .replace(/\bmultiplied by\b/g, "*")
    .replace(/\bdivided by\b/g, "/")
    .replace(/\bplus\b/g, "+")
    .replace(/\bminus\b/g, "-")
    .replace(/\btimes\b/g, "*")
    .replace(/\bover\b/g, "/")
    .replace(/\bmodulo\b/g, "%")
    .replace(/\bmod\b/g, "%")
    .replace(/[?=]/g, " ")
    .trim();

  if (!expression) return null;
  if (!/^[\d\s.+\-*/%()]+$/.test(expression)) return null;

  const tokens = expression.match(/\d+(?:\.\d+)?|\.\d+|[()+\-*/%]/g);

  if (!tokens || tokens.join("") !== expression.replace(/\s/g, "")) {
    return null;
  }

  if (!tokens.some(token => /[+\-*/%]/.test(token))) return null;

  let index = 0;

  function factor() {
    if (tokens[index] === "+") {
      index++;
      return factor();
    }

    if (tokens[index] === "-") {
      index++;
      return -factor();
    }

    if (tokens[index] === "(") {
      index++;
      const value = expressionValue();

      if (tokens[index] !== ")") throw new Error("Missing )");

      index++;
      return value;
    }

    const token = tokens[index++];

    if (
      token === undefined ||
      !/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(token)
    ) {
      throw new Error("Expected a number");
    }

    return Number(token);
  }

  function term() {
    let value = factor();

    while (["*", "/", "%"].includes(tokens[index])) {
      const operator = tokens[index++];
      const right = factor();

      if ((operator === "/" || operator === "%") && right === 0) {
        throw new Error("Division by zero");
      }

      if (operator === "*") value *= right;
      if (operator === "/") value /= right;
      if (operator === "%") value %= right;
    }

    return value;
  }

  function expressionValue() {
    let value = term();

    while (tokens[index] === "+" || tokens[index] === "-") {
      const operator = tokens[index++];
      const right = term();

      value = operator === "+" ? value + right : value - right;
    }

    return value;
  }

  try {
    const result = expressionValue();

    if (index !== tokens.length || !Number.isFinite(result)) return null;

    return "The answer is **" +
      Number(result.toPrecision(12)) + "**.";
  } catch {
    return null;
  }
}

/* =======================================================
   9. BUILT-IN CONCEPTS
======================================================= */

const CONCEPTS = [
  {
    id: "ai-ml-dl",
    keys: [],
    answer: [
      "## AI vs Machine Learning vs Deep Learning",
      "",
      "**Artificial intelligence (AI)** is the broad field of making computers perform tasks associated with intelligent behaviour.",
      "",
      "**Machine learning (ML)** is a subset of AI in which systems learn patterns from data.",
      "",
      "**Deep learning (DL)** is a subset of machine learning that uses neural networks with multiple layers.",
      "",
      "**Relationship:** Deep learning is part of machine learning, which is part of AI.",
      "",
      "**Example:** A cat-recognition system is an AI application. It may learn from example images using a deep neural network."
    ].join("\n")
  },
  {
    id: "ai",
    keys: ["what is artificial intelligence", "define artificial intelligence", "what is ai", "define ai"],
    answer: "## Artificial Intelligence\n\nArtificial intelligence (AI) is the field of building computer systems that perform tasks associated with human intelligence, such as understanding language, recognising patterns, solving problems, and making predictions.\n\nExamples include voice assistants, recommendation systems, image recognition, and navigation software."
  },
  {
    id: "ml",
    keys: ["what is machine learning", "define machine learning", "what is ml"],
    answer: "## Machine Learning\n\nMachine learning is a branch of AI in which a system learns patterns from data to make predictions or decisions. For example, an email filter can learn from examples to identify spam."
  },
  {
    id: "dl",
    keys: ["what is deep learning", "define deep learning"],
    answer: "## Deep Learning\n\nDeep learning is a type of machine learning that uses neural networks with multiple layers to learn complex patterns. It is used in image recognition, speech processing, translation, and many generative AI systems."
  },
  {
    id: "algorithm",
    keys: ["what is an algorithm", "define algorithm"],
    answer: "An **algorithm** is a defined sequence of steps for solving a problem or completing a task. A cooking recipe is a simple example."
  },
  {
    id: "javascript",
    keys: ["what is javascript", "define javascript"],
    answer: "**JavaScript** is a programming language used to make websites interactive. It can process input, calculate results, update pages, and communicate with online services."
  },
  {
    id: "html",
    keys: ["what is html", "define html"],
    answer: "**HTML** stands for HyperText Markup Language. It defines the structure and content of web pages."
  },
  {
    id: "css",
    keys: ["what is css", "define css"],
    answer: "**CSS** stands for Cascading Style Sheets. It controls the appearance of web pages, including colours, layouts, spacing, fonts, and animations."
  },
  {
    id: "api",
    keys: ["what is an api", "what is api", "define api"],
    answer: "An **API** is a defined way for software systems to communicate. A weather application, for example, can request weather data through an API."
  },
  {
    id: "neural-network",
    keys: ["what is a neural network", "define neural network"],
    answer: "A **neural network** is a machine-learning model made of connected computational units arranged in layers. Training adjusts its parameters so it can learn patterns from examples."
  },
  {
    id: "generative-ai",
    keys: ["what is generative ai", "define generative ai"],
    answer: "**Generative AI** produces content such as text, images, audio, or code based on patterns learned during training. A rule-based script alone is not equivalent to a trained generative model."
  },
  {
    id: "internet",
    keys: ["what is the internet", "define internet"],
    answer: "The **internet** is a worldwide network of connected computer networks. The web, email, and many other services use it."
  },
  {
    id: "photosynthesis",
    keys: ["what is photosynthesis", "define photosynthesis"],
    answer: "**Photosynthesis** is the process by which plants, algae, and some bacteria use light energy to convert carbon dioxide and water into energy-rich sugars. Oxygen is released during the common form of photosynthesis."
  },
  {
    id: "gravity",
    keys: ["what is gravity", "define gravity"],
    answer: "**Gravity** is the interaction that attracts objects with mass toward one another. Earth's gravity makes unsupported objects fall toward the ground and helps keep the Moon in orbit."
  }
];

function answerConcept(question) {
  const q = cleanQuestion(question);

  const asksComparison =
    containsAny(q, ["difference", "different", "compare", "vs", "versus"]) &&
    q.includes("artificial intelligence") &&
    q.includes("machine learning") &&
    q.includes("deep learning");

  if (asksComparison) {
    return CONCEPTS.find(c => c.id === "ai-ml-dl").answer;
  }

  // Match the most specific phrases first.
  const concepts = CONCEPTS
    .filter(c => c.id !== "ai-ml-dl")
    .sort((a, b) => {
      const aLength = Math.max(0, ...a.keys.map(k => k.length));
      const bLength = Math.max(0, ...b.keys.map(k => k.length));
      return bLength - aLength;
    });

  for (const concept of concepts) {
    for (const key of concept.keys) {
      if (q === key || q.includes(key)) {
        return concept.answer;
      }
    }
  }

  if (
    q.includes("artificial intelligence") &&
    q.includes("machine learning") &&
    q.includes("deep learning")
  ) {
    return CONCEPTS.find(c => c.id === "ai-ml-dl").answer;
  }

  return null;
}

/* =======================================================
   10. NETWORK UTILITIES
======================================================= */

async function fetchTimed(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    ASWIK.timeout
  );

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    return response;
  } finally {
    clearTimeout(timer);
  }
}

/* =======================================================
   11. WIKIPEDIA RETRIEVAL
======================================================= */

async function wikipediaResults(query) {
  const key = "wiki-search:" + cleanQuestion(query);

  if (ASWIK_STATE.cache.has(key)) {
    return ASWIK_STATE.cache.get(key);
  }

  const url = new URL(ASWIK.wikipediaSearch);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "5");

  const response = await fetchTimed(url.toString());
  const data = await response.json();

  const results = (data.pages || []).map(page => ({
    title: page.title || "",
    description: page.description || "",
    excerpt: page.excerpt || "",
    key: page.key || page.title || ""
  }));

  ASWIK_STATE.cache.set(key, results);
  return results;
}

async function wikipediaSummary(title) {
  const key = "wiki-summary:" + title;

  if (ASWIK_STATE.cache.has(key)) {
    return ASWIK_STATE.cache.get(key);
  }

  const url = ASWIK.wikipediaSummary +
    encodeURIComponent(title.replace(/ /g, "_"));

  const response = await fetchTimed(url);
  const data = await response.json();

  const result = {
    title: data.title || title,
    extract: data.extract || "",
    url: data.content_urls?.desktop?.page || wikiURL(title)
  };

  ASWIK_STATE.cache.set(key, result);
  return result;
}

function relevance(result, query) {
  const title = cleanQuestion(result.title);
  const q = cleanQuestion(query);
  const words = q.split(/\s+/).filter(word => word.length > 2);

  let score = 0;

  if (title === q) score += 15;
  if (q.includes(title) && title.length > 3) score += 7;
  if (title.includes(q) && q.length > 3) score += 5;

  for (const word of words) {
    if (title.includes(word)) score += 2;
    if (cleanQuestion(result.description).includes(word)) score += 1;
  }

  return score;
}

function extractTopic(question) {
  return String(question)
    .replace(
      /^(please\s+)?(explain|describe|define|tell me about|who is|who was|what is|what are|where is|where are|when did|when was|why is|why are|how does|how do|how did)\s+/i,
      ""
    )
    .replace(/[?!.,]+$/g, "")
    .trim();
}

async function answerWikipedia(question) {
  const topic = extractTopic(question);
  if (topic.length < 2) return null;

  const results = await wikipediaResults(topic);
  if (!results.length) return null;

  const ranked = results
    .map(result => ({
      ...result,
      score: relevance(result, topic)
    }))
    .sort((a, b) => b.score - a.score);

  if (ranked[0].score < 3) return null;

  const summary = await wikipediaSummary(ranked[0].key);
  if (!summary.extract) return null;

  return {
    text: "**" + summary.title + "**\n\n" +
      summary.extract +
      "\n\n*Source: Wikipedia. Verify important information with additional sources.*",

    links: [
      { label: "Read Wikipedia source", url: summary.url },
      { label: "More search results", url: wikiURL(topic) }
    ]
  };
}

/* =======================================================
   12. NEWS RETRIEVAL
   Tries RSS2JSON, then public CORS proxies.
   Public services can be rate-limited or unavailable.
======================================================= */

function parseNews(xmlText) {
  const xml = new DOMParser().parseFromString(
    xmlText,
    "application/xml"
  );

  if (xml.querySelector("parsererror")) {
    throw new Error("Invalid RSS feed");
  }

  return Array.from(xml.querySelectorAll("item"))
    .slice(0, ASWIK.maxNews)
    .map(item => ({
      title: item.querySelector("title")?.textContent?.trim() || "",
      url: item.querySelector("link")?.textContent?.trim() || "",
      date: item.querySelector("pubDate")?.textContent?.trim() || "",
      source: item.querySelector("source")?.textContent?.trim() || ""
    }))
    .filter(item => item.title && safeURL(item.url));
}

function parseRSS2JSON(data) {
  if (data.status !== "ok" || !Array.isArray(data.items)) {
    throw new Error("RSS service did not return articles");
  }

  return data.items.slice(0, ASWIK.maxNews).map(item => ({
    title: item.title || "",
    url: item.link || "",
    date: item.pubDate || "",
    source: item.author || item.source || ""
  })).filter(item => item.title && safeURL(item.url));
}

async function fetchNewsArticles(feedURL) {
  // First try RSS2JSON's public endpoint.
  try {
    const url = "https://api.rss2json.com/v1/api.json?rss_url=" +
      encodeURIComponent(feedURL);

    const response = await fetchTimed(url);
    const data = await response.json();
    const articles = parseRSS2JSON(data);

    if (articles.length) return articles;
  } catch (error) {
    console.warn("RSS2JSON unavailable:", error.message);
  }

  // Then try public CORS proxy services.
  const proxyURLs = [
    "https://api.allorigins.win/raw?url=" +
      encodeURIComponent(feedURL),

    "https://corsproxy.io/?" +
      encodeURIComponent(feedURL)
  ];

  for (const proxyURL of proxyURLs) {
    try {
      const response = await fetchTimed(proxyURL);
      const articles = parseNews(await response.text());

      if (articles.length) return articles;
    } catch (error) {
      console.warn("News proxy failed:", error.message);
    }
  }

  // Direct RSS may work if the source allows browser CORS.
  try {
    const response = await fetchTimed(feedURL);
    const articles = parseNews(await response.text());

    if (articles.length) return articles;
  } catch (error) {
    console.warn("Direct RSS failed:", error.message);
  }

  throw new Error("All news retrieval methods failed");
}

function getNewsTopic(question) {
  const q = cleanQuestion(question);

  if (containsAny(q, [
    "world news",
    "global news",
    "international news"
  ])) {
    return "world";
  }

  if (containsAny(q, [
    "technology news",
    "tech news",
    "ai news",
    "artificial intelligence news"
  ])) {
    return "technology";
  }

  return "india";
}

async function answerNews(question) {
  const topic = getNewsTopic(question);

  try {
    const articles = await fetchNewsArticles(ASWIK.feeds[topic]);

    const lines = [
      "## Recent " + topic + " news",
      "",
      "These headlines were returned by the current feed. Open a source link to read the full report."
    ];

    articles.forEach((article, index) => {
      lines.push(
        "",
        (index + 1) + ". **" + article.title + "**",
        article.source ? "Source: " + article.source : "",
        article.date ? "Published: " + article.date : ""
      );
    });

    return {
      text: lines.filter(Boolean).join("\n"),
      links: articles.map(article => ({
        label: article.title,
        url: article.url
      }))
    };
  } catch (error) {
    console.error("News retrieval failed:", error);

    return {
      text: "I couldn't retrieve verified headlines right now. The public feed or its proxy may be unavailable. You can still open these live search pages.",
      links: [
        { label: "Latest Indian news", url: googleURL("latest Indian news") },
        { label: "Latest world news", url: googleURL("latest world news") },
        { label: "Latest AI and technology news", url: googleURL("latest AI technology news") }
      ]
    };
  }
}

/* =======================================================
   13. INDIAN FESTIVAL ASSISTANCE
======================================================= */

function answerFestival(question) {
  const current = indiaDateTime();
  const query = "Indian festivals today " +
    new Date().getFullYear() + " " + current.date;

  return {
    text: [
      "## Indian festival information",
      "",
      "Today in India is **" + current.date + "**.",
      "",
      "I need a current, reliable calendar to confirm which festival falls today. Festival dates can depend on region, tradition, and lunar-calendar calculations, so I won't invent a festival name.",
      "",
      "Open a search result to check current listings."
    ].join("\n"),

    links: [
      { label: "Search Indian festivals for today", url: googleURL(query) },
      { label: "Search Hindu calendar", url: googleURL("Hindu calendar festivals today India " + new Date().getFullYear()) },
      { label: "Official Indian government holidays", url: googleURL("site:gov.in India holiday calendar " + new Date().getFullYear()) }
    ]
  };
}

/* =======================================================
   14. QUESTION ROUTING
======================================================= */

function isNewsQuestion(q) {
  return containsAny(q, [
    "latest news",
    "today's news",
    "todays news",
    "give me news",
    "show me news",
    "indian news",
    "india news",
    "world news",
    "technology news",
    "tech news",
    "ai news",
    "headlines"
  ]);
}

function isFestivalQuestion(q) {
  return containsAny(q, [
    "festival today",
    "festivals today",
    "which festival",
    "what festival",
    "holiday today",
    "festival in india",
    "festivals in india",
    "festival is today"
  ]);
}

function isFactualQuestion(q) {
  return /^(who is|who was|what is|what are|where is|where are|when did|when was|why is|why are|how does|how do|how did|explain|describe|define|tell me about)\b/.test(q);
}

function answerFallback(question) {
  return {
    text: [
      "I couldn't confidently answer that with my current built-in knowledge.",
      "",
      "I'm still a lightweight JavaScript assistant, not a trained general-purpose language model. I don't want to invent facts.",
      "",
      "Try searching online or rephrasing the question."
    ].join("\n"),

    links: [
      { label: "Search the web", url: googleURL(question) },
      { label: "Search Wikipedia", url: wikiURL(question) }
    ]
  };
}

/* =======================================================
   15. MAIN ANSWER GENERATOR
======================================================= */

async function handleQuestion(question) {
  const original = String(question || "").trim();

  if (!original || ASWIK_STATE.busy) return;

  ASWIK_STATE.busy = true;

  addMessage(original, "user");
  remember("user", original);
  showThinking();

  try {
    const q = cleanQuestion(original);
    let result = null;

    // 1. Identity, greetings, date and time.
    result = answerInstant(original);

    // 2. Reasoning.
    if (!result) {
      result = answerReasoning(original);
    }

    // 3. Arithmetic.
    if (!result) {
      result = solveMath(original);
    }

    // 4. Built-in concept knowledge.
    if (!result) {
      result = answerConcept(original);
    }

    // 5. News.
    if (!result && isNewsQuestion(q)) {
      result = await answerNews(original);
    }

    // 6. Festivals.
    if (!result && isFestivalQuestion(q)) {
      result = answerFestival(original);
    }

    // 7. Wikipedia retrieval.
    if (!result && isFactualQuestion(q)) {
      try {
        result = await answerWikipedia(original);
      } catch (error) {
        console.warn("Wikipedia retrieval failed:", error);
      }
    }

    // 8. Honest fallback.
    if (!result) {
      result = answerFallback(original);
    }

    if (typeof result === "string") {
      addMessage(result, "ai");
      remember("ai", result);
    } else {
      addMessage(result.text, "ai", result.links || []);
      remember("ai", result.text);
    }
  } catch (error) {
    console.error("ASWIK Brain error:", error);

    const fallback = answerFallback(original);
    addMessage(fallback.text, "ai", fallback.links);
    remember("ai", fallback.text);
  } finally {
    removeThinking();
    ASWIK_STATE.busy = false;
  }
}

/* =======================================================
   16. CONNECT HTML CONTROLS
======================================================= */

function submitQuestion(question) {
  const value = String(question || "").trim();

  if (value && !ASWIK_STATE.busy) {
    void handleQuestion(value);
  }
}

function initialiseASWIK() {
  installChatStyles();

  updateClock();
  setInterval(updateClock, 1000);

  const messageForm = document.querySelector("#messageForm");
  const messageInput = document.querySelector("#messageInput");
  const sendButton = document.querySelector("#sendBtn");

  if (messageForm && messageInput) {
    messageForm.addEventListener("submit", event => {
      event.preventDefault();

      const value = messageInput.value.trim();
      if (!value) return;

      submitQuestion(value);
      messageInput.value = "";
      messageInput.focus();
    });
  } else if (sendButton && messageInput) {
    sendButton.addEventListener("click", event => {
      event.preventDefault();

      const value = messageInput.value.trim();
      if (!value) return;

      submitQuestion(value);
      messageInput.value = "";
      messageInput.focus();
    });

    messageInput.addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();

        const value = messageInput.value.trim();
        if (!value) return;

        submitQuestion(value);
        messageInput.value = "";
      }
    });
  }

  // Quick prompts.
  document.querySelectorAll("[data-query], [data-search]").forEach(button => {
    button.addEventListener("click", () => {
      const query =
        button.getAttribute("data-query") ||
        button.getAttribute("data-search") ||
        button.textContent;

      submitQuestion(query);
    });
  });

  // Search form.
  const searchForm = document.querySelector("#searchForm");
  const searchInput = document.querySelector("#searchInput");

  if (searchForm && searchInput) {
    searchForm.addEventListener("submit", event => {
      event.preventDefault();

      const value = searchInput.value.trim();
      if (!value) return;

      submitQuestion(value);
      searchInput.value = "";
    });
  }

  // About Developer dialog.
  const aboutDialog = document.querySelector("#aboutDialog");
  const aboutButton = document.querySelector("#aboutBtn");
  const closeAbout = document.querySelector("#closeAbout");

  if (aboutButton && aboutDialog) {
    aboutButton.addEventListener("click", () => {
      if (typeof aboutDialog.showModal === "function") {
        aboutDialog.showModal();
      } else {
        aboutDialog.setAttribute("open", "");
      }
    });
  }

  if (closeAbout && aboutDialog) {
    closeAbout.addEventListener("click", () => {
      if (typeof aboutDialog.close === "function") {
        aboutDialog.close();
      } else {
        aboutDialog.removeAttribute("open");
      }
    });
  }

  console.info(
    "⚡ " + ASWIK.name +
    " brain " + ASWIK.version +
    " ready. Developer: " + ASWIK.developer
  );
}

/* =======================================================
   17. STARTUP
======================================================= */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialiseASWIK, {
    once: true
  });
} else {
  initialiseASWIK();
}
