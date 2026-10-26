
/*
=========================================================
 ASWIK AI — SMART BRAIN ENGINE 4.1
 Developer: Aswik Singh

 Features:
 - Hugging Face AI through Cloudflare Worker
 - No API token exposed in browser code
 - Cyan futuristic chat interface
 - India date and time
 - Arithmetic and reasoning
 - Wikipedia retrieval as a relevant backup only
 - News retrieval
 - Indian festival search assistance
 - Thinking animation
 - Conversation history
 - Safe text formatting and source links
=========================================================
*/

"use strict";

/* =======================================================
   1. CONFIGURATION
======================================================= */

const ASWIK_AI_ENDPOINT =
  "https://ancient-pond-adc4.singhsoni3291.workers.dev";

const ASWIK = {
  name: "ASWIK AI",
  developer: "Aswik Singh",
  version: "4.1",

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

  timeout: 25000,
  maxHistory: 30,
  maxNews: 7
};

const ASWIK_STATE = {
  history: [],
  cache: new Map(),
  busy: false
};

/* =======================================================
   2. AUTOMATIC CHAT STYLING
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

    #chat .message-content em {
      color: #d5f7ff;
    }

    #chat .message-content code,
    #chat .message-content pre {
      background: rgba(0, 0, 0, .25);
      padding: 2px 5px;
      border-radius: 4px;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    #chat .aswik-list-item {
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
      from {
        opacity: 0;
        transform: translateY(7px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes aswikDot {
      0%, 60%, 100% {
        opacity: .35;
        transform: translateY(0);
      }
      30% {
        opacity: 1;
        transform: translateY(-4px);
      }
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
  let inCode = false;
  let codeLines = [];

  function closeList() {
    if (inList) {
      output.push("</div>");
      inList = false;
    }
  }

  function inlineFormat(value) {
    let s = escapeHTML(value);
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
    return s;
  }

  function flushCode() {
    output.push(
      "<pre><code>" +
      escapeHTML(codeLines.join("\n")) +
      "</code></pre>"
    );
    codeLines = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      closeList();

      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        inCode = true;
      }

      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

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

  if (inCode) flushCode();

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
    console.error("ASWIK: #chat element not found.");
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
   6. INSTANT ANSWERS
======================================================= */

function answerInstant(question) {
  const q = cleanQuestion(question);
  const current = indiaDateTime();

  if (/^(hi|hello|hey|hii|heyy|namaste|yo)\b/.test(q)) {
    return "Heyyy! ⚡ I'm ASWIK AI, created by Aswik Singh. Ask me anything and let's explore it together!";
  }

  if (containsAny(q, [
    "who made you",
    "who created you",
    "who developed you",
    "who built you",
    "who designed you",
    "who is your developer"
  ])) {
    return "I am **ASWIK AI**, designed and developed by **Aswik Singh**. ⚡ I use programmed tools and a connected language model for general questions.";
  }

  if (containsAny(q, [
    "about developer",
    "tell me about aswik singh",
    "who is aswik singh"
  ])) {
    return [
      "## About the Developer",
      "",
      "**Aswik Singh** is the developer of ASWIK AI.",
      "",
      "The project combines a futuristic assistant interface, programmed tools, online information retrieval, and a connected language model."
    ].join("\n");
  }

  if (
    q.includes("what is your name") ||
    q.includes("who are you") ||
    q.includes("introduce yourself")
  ) {
    return "I'm **ASWIK AI**, a digital assistant created by **Aswik Singh**. I can help with explanations, maths, writing, programming, and online information retrieval.";
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
      "- General questions through the connected language model.",
      "- Schoolwork, science, maths, and programming.",
      "- Code writing and explanations.",
      "- Wikipedia summaries when relevant.",
      "- Recent news from accessible public feeds.",
      "- Indian festival search assistance.",
      "- Current date and time in India.",
      "",
      "The online AI brain needs an internet connection and an available inference provider."
    ].join("\n");
  }

  if (
    q.includes("are you a real ai") ||
    q.includes("are you an llm") ||
    q.includes("are you a language model")
  ) {
    return "I'm **ASWIK AI**, created by **Aswik Singh**. This website connects programmed tools to a hosted language model for general-purpose responses when the service is available.";
  }

  return null;
}

/* =======================================================
   7. REASONING
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

  if (
    q.includes("bat") &&
    q.includes("ball") &&
    (
      q.includes("110") ||
      q.includes("1.10")
    ) &&
    (
      q.includes("100 more") ||
      q.includes("1 more")
    )
  ) {
    if (
      q.includes("₹") ||
      q.includes("rupee") ||
      q.includes("rupees")
    ) {
      return [
        "The ball costs **₹5** and the bat costs **₹105**.",
        "",
        "Let the ball cost ₹x.",
        "The bat costs ₹(x + 100).",
        "Together: x + (x + 100) = 110.",
        "So 2x = 10, which gives x = 5.",
        "",
        "Check: ₹5 + ₹105 = ₹110."
      ].join("\n");
    }

    return [
      "The ball costs **5 cents** and the bat costs **105 cents**.",
      "",
      "Let the ball cost x.",
      "The bat costs x + 1.",
      "Together: x + (x + 1) = 1.10.",
      "So 2x = 0.10, giving x = 0.05.",
      "",
      "Check: $0.05 + $1.05 = $1.10."
    ].join("\n");
  }

  const clockMatch = q.match(/\b(\d{1,2})\s*:\s*(\d{2})\b/);

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

      return "The smaller angle at " + clockMatch[0] +
        " is **" + angle + "°**.";
    }
  }

  return null;
}

/* =======================================================
   8. SAFE ARITHMETIC
======================================================= */

function solveMath(question) {
  let expression = String(question)
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/\bwhat is\b/g, "")
    .replace(/\bcalculate\b/g, "")
    .replace(/\bcompute\b/g, "")
    .replace(/\bsolve\b/g, "")
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

  if (!expression || !/^[\d\s.+\-*/%()]+$/.test(expression)) {
    return null;
  }

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
   9. CONCEPTS
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
      "**Relationship:** Deep learning is part of machine learning, which is part of AI."
    ].join("\n")
  },
  {
    id: "ai",
    keys: ["what is artificial intelligence", "define artificial intelligence", "what is ai", "define ai"],
    answer: "**Artificial intelligence (AI)** is the field of building computer systems that perform tasks associated with human intelligence, such as understanding language, recognising patterns, solving problems, and making predictions."
  },
  {
    id: "ml",
    keys: ["what is machine learning", "define machine learning", "what is ml"],
    answer: "**Machine learning** is a branch of AI in which a system learns patterns from data to make predictions or decisions."
  },
  {
    id: "dl",
    keys: ["what is deep learning", "define deep learning"],
    answer: "**Deep learning** is a type of machine learning that uses neural networks with multiple layers to learn complex patterns."
  },
  {
    id: "algorithm",
    keys: ["what is an algorithm", "define algorithm"],
    answer: "An **algorithm** is a defined sequence of steps for solving a problem or completing a task."
  },
  {
    id: "javascript",
    keys: ["what is javascript", "define javascript"],
    answer: "**JavaScript** is a programming language used to make websites interactive and communicate with online services."
  },
  {
    id: "html",
    keys: ["what is html", "define html"],
    answer: "**HTML** stands for HyperText Markup Language. It defines the structure and content of web pages."
  },
  {
    id: "css",
    keys: ["what is css", "define css"],
    answer: "**CSS** stands for Cascading Style Sheets. It controls web page appearance, including colours, layouts, spacing, fonts, and animations."
  },
  {
    id: "api",
    keys: ["what is an api", "what is api", "define api"],
    answer: "An **API** is a defined way for software systems to communicate."
  },
  {
    id: "neural-network",
    keys: ["what is a neural network", "define neural network"],
    answer: "A **neural network** is a machine-learning model made of connected computational units arranged in layers. Training adjusts its parameters so it can learn patterns from examples."
  },
  {
    id: "generative-ai",
    keys: ["what is generative ai", "define generative ai"],
    answer: "**Generative AI** produces content such as text, images, audio, or code based on patterns learned during training."
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

  if (
    containsAny(q, ["difference", "different", "compare", " vs ", "versus"]) &&
    q.includes("artificial intelligence") &&
    q.includes("machine learning") &&
    q.includes("deep learning")
  ) {
    return CONCEPTS.find(c => c.id === "ai-ml-dl").answer;
  }

  const concepts = CONCEPTS
    .filter(c => c.id !== "ai-ml-dl")
    .sort((a, b) => {
      const al = Math.max(0, ...a.keys.map(k => k.length));
      const bl = Math.max(0, ...b.keys.map(k => k.length));
      return bl - al;
    });

  for (const concept of concepts) {
    for (const key of concept.keys) {
      if (q === key || q.includes(key)) return concept.answer;
    }
  }

  return null;
}

/* =======================================================
   10. NETWORK UTILITIES
======================================================= */

async function fetchTimed(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ASWIK.timeout);

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
   11. WIKIPEDIA BACKUP
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

  // Require a strong title match to avoid unrelated articles.
  if (ranked[0].score < 7) return null;

  const summary = await wikipediaSummary(ranked[0].key);
  if (!summary.extract) return null;

  return {
    text:
      "**" + summary.title + "**\n\n" +
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
  const rss2jsonURL =
    "https://api.rss2json.com/v1/api.json?rss_url=" +
    encodeURIComponent(feedURL);

  try {
    const response = await fetchTimed(rss2jsonURL);
    const data = await response.json();
    const articles = parseRSS2JSON(data);

    if (articles.length) return articles;
  } catch (error) {
    console.warn("RSS2JSON unavailable:", error.message);
  }

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

  throw new Error("All news retrieval methods failed");
}

function getNewsTopic(question) {
  const q = cleanQuestion(question);

  if (containsAny(q, [
    "world news",
    "global news",
    "international news"
  ])) return "world";

  if (containsAny(q, [
    "technology news",
    "tech news",
    "ai news",
    "artificial intelligence news"
  ])) return "technology";

  return "india";
}

async function answerNews(question) {
  const topic = getNewsTopic(question);

  try {
    const articles = await fetchNewsArticles(ASWIK.feeds[topic]);

    const lines = [
      "## Recent " + topic + " news",
      "",
      "Headlines returned by the current news feed:"
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
      text: "I couldn't retrieve headlines right now. Use these links to search current news.",
      links: [
        { label: "Latest Indian news", url: googleURL("latest Indian news") },
        { label: "Latest world news", url: googleURL("latest world news") },
        { label: "Latest AI and technology news", url: googleURL("latest AI technology news") }
      ]
    };
  }
}

/* =======================================================
   13. FESTIVAL ASSISTANCE
======================================================= */

function answerFestival(question) {
  const current = indiaDateTime();
  const year = new Date().getFullYear();

  return {
    text: [
      "## Indian festival information",
      "",
      "Today in India is **" + current.date + "**.",
      "",
      "Festival dates can depend on region, tradition, and lunar-calendar calculations. I won't guess a festival name without a reliable current calendar.",
      "",
      "Open a current calendar or search result below."
    ].join("\n"),

    links: [
      {
        label: "Indian festivals today",
        url: googleURL("Indian festivals today " + year + " " + current.date)
      },
      {
        label: "Hindu calendar",
        url: googleURL("Hindu calendar festivals today India " + year)
      },
      {
        label: "Government holiday calendar",
        url: googleURL("site:gov.in India holiday calendar " + year)
      }
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
    text: "I couldn't get a reliable answer from my available services. You can retry the AI connection or search online.",

    links: [
      { label: "Search the web", url: googleURL(question) },
      { label: "Search Wikipedia", url: wikiURL(question) }
    ]
  };
}

/* =======================================================
   15. CONNECTED LANGUAGE MODEL
======================================================= */

async function askASWIKLanguageModel(question) {
  const history = ASWIK_STATE.history
    .slice(0, -1)
    .slice(-8)
    .map(item => ({
      role:
        item.role === "ai" || item.role === "assistant"
          ? "assistant"
          : "user",
      text: String(item.text || "").slice(0, 3000)
    }));

  const response = await fetchTimed(ASWIK_AI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      question,
      history
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const reason =
      data.details ||
      data.error ||
      "HTTP " + response.status;

    throw new Error(
      "AI connection failed (" +
      response.status + "): " + reason
    );
  }

  if (
    typeof data.answer !== "string" ||
    !data.answer.trim()
  ) {
    throw new Error("The AI returned no answer.");
  }

  return data.answer.trim();
}

/* =======================================================
   16. MAIN ANSWER GENERATOR
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

    // Fast built-in answers.
    result = answerInstant(original);

    // Reasoning puzzles.
    if (!result) {
      result = answerReasoning(original);
    }

    // Arithmetic.
    if (!result) {
      result = solveMath(original);
    }

    // Concepts only when the question specifically matches.
    if (!result) {
      result = answerConcept(original);
    }

    // Dedicated current-news retrieval.
    if (!result && isNewsQuestion(q)) {
      result = await answerNews(original);
    }

    // Dedicated festival search assistance.
    if (!result && isFestivalQuestion(q)) {
      result = answerFestival(original);
    }

    // Ask the real language model for every other question.
    if (!result) {
      try {
        result = await askASWIKLanguageModel(original);
      } catch (error) {
        console.error("ASWIK language model failed:", error);

        // Wikipedia is a restricted backup for factual queries only.
        if (isFactualQuestion(q)) {
          try {
            const wiki = await answerWikipedia(original);
            if (wiki) result = wiki;
          } catch (wikiError) {
            console.warn("Wikipedia backup failed:", wikiError);
          }
        }

        // Do not display irrelevant Wikipedia results or hide errors.
        if (!result) {
          result = {
            text:
              "⚠️ **ASWIK AI couldn't reach its language model.**\n\n" +
              "The online AI service may be temporarily unavailable. " +
              "Please try again shortly.\n\n" +
              "Technical detail: " + error.message,

            links: [
              {
                label: "Open ASWIK AI",
                url: "https://singhsoni3291-eng.github.io/aswik-ai/"
              }
            ]
          };
        }
      }
    }

    if (!result) {
      result = answerFallback(original);
    }

    const answerText =
      typeof result === "string"
        ? result
        : (result.text || result.answer || "No answer was returned.");

    const answerLinks =
      typeof result === "string"
        ? []
        : (result.links || []);

    addMessage(answerText, "ai", answerLinks);
    remember("ai", answerText);

  } catch (error) {
    console.error("ASWIK Brain error:", error);

    const message =
      "⚠️ Something went wrong while processing your question.\n\n" +
      String(error.message || error);

    addMessage(message, "ai");
    remember("ai", message);

  } finally {
    removeThinking();
    ASWIK_STATE.busy = false;
  }
}

/* =======================================================
   17. CONNECT HTML CONTROLS
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

  document.querySelectorAll("[data-query], [data-search]").forEach(button => {
    button.addEventListener("click", () => {
      const query =
        button.getAttribute("data-query") ||
        button.getAttribute("data-search") ||
        button.textContent;

      submitQuestion(query);
    });
  });

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
   18. STARTUP
======================================================= */

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initialiseASWIK,
    { once: true }
  );
} else {
  initialiseASWIK();
}
