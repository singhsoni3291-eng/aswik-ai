
/*
=========================================================
 ASWIK AI — SMART BRAIN ENGINE
 Developer: Aswik Singh
 Version: ASWIK Lite Brain 2.0

 Lightweight answer generation, reasoning, calculations,
 concept explanations, Wikipedia retrieval, news, date/time,
 festival search, and conversational context.

 No API key. No model download. No eval().
=========================================================
*/

"use strict";

/* =======================================================
   1. CONFIGURATION
======================================================= */

const ASWIK = {
  name: "ASWIK AI",
  developer: "Aswik Singh",

  wikipediaSearch:
    "https://en.wikipedia.org/w/rest.php/v1/search/page",

  wikipediaSummary:
    "https://en.wikipedia.org/api/rest_v1/page/summary/",

  newsProxy: "https://proxy.cors.dev/",

  feeds: {
    india:
      "https://news.google.com/rss/search?q=India+when:1d&hl=en-IN&gl=IN&ceid=IN:en",

    world:
      "https://news.google.com/rss/search?q=world+news+when:1d&hl=en-IN&gl=IN&ceid=IN:en",

    technology:
      "https://news.google.com/rss/search?q=technology+AI+when:1d&hl=en-IN&gl=IN&ceid=IN:en"
  },

  timeout: 10000,
  maxHistory: 30
};

const ASWIK_STATE = {
  history: [],
  cache: new Map(),
  busy: false
};

/* =======================================================
   2. SAFE TEXT AND HTML
======================================================= */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

/*
  Small Markdown-style formatter.
  Escapes user/source text before applying formatting.
  Supports bold, headings, lists, and line breaks.
*/

function formatAnswer(text) {
  const escaped = escapeHTML(String(text ?? ""));

  return escaped
    .split(/\r?\n/)
    .map(line => {
      let formatted = line.replace(
        /\*\*(.+?)\*\*/g,
        "<strong>$1</strong>"
      );

      if (/^### /.test(formatted)) {
        return "<h4>" + formatted.slice(4) + "</h4>";
      }

      if (/^## /.test(formatted)) {
        return "<h3>" + formatted.slice(3) + "</h3>";
      }

      if (/^# /.test(formatted)) {
        return "<h3>" + formatted.slice(2) + "</h3>";
      }

      if (/^\s*[-•]\s+/.test(formatted)) {
        return "<div class=\"aswik-list-item\">• " +
          formatted.replace(/^\s*[-•]\s+/, "") +
          "</div>";
      }

      return formatted;
    })
    .join("<br>");
}

function safeURL(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol)
      ? url.href
      : "#";
  } catch {
    return "#";
  }
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
   3. MESSAGE DISPLAY
   Keeps visible A / You labels even without special CSS.
======================================================= */

function addMessage(text, sender = "ai", links = []) {
  const chat = document.querySelector("#chat");

  if (!chat) {
    console.log(sender + ":", text);
    return;
  }

  const isUser = sender === "user";

  const message = document.createElement("div");
  message.className = isUser
    ? "message user-message"
    : "message ai-message";

  // Explicit sender label: A or You.
  const label = document.createElement("div");
  label.className = "message-sender";
  label.textContent = isUser ? "You" : "A";
  label.setAttribute("aria-label", isUser ? "You" : "ASWIK AI");

  const bubble = document.createElement("div");
  bubble.className = "message-content";
  bubble.innerHTML = formatAnswer(text);

  message.appendChild(label);
  message.appendChild(bubble);

  if (Array.isArray(links) && links.length > 0) {
    const linkContainer = document.createElement("div");
    linkContainer.className = "answer-links";

    links.forEach(item => {
      const anchor = document.createElement("a");
      anchor.href = safeURL(item.url);
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = item.label || "Open source";
      linkContainer.appendChild(anchor);
    });

    message.appendChild(linkContainer);
  }

  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;
}

function showThinking() {
  removeThinking();

  const chat = document.querySelector("#chat");
  if (!chat) return;

  const thinking = document.createElement("div");
  thinking.id = "aswik-thinking";
  thinking.className = "message ai-message";

  const label = document.createElement("div");
  label.className = "message-sender";
  label.textContent = "A";

  const content = document.createElement("div");
  content.className = "message-content";
  content.textContent = "⚡ ASWIK is thinking...";

  thinking.append(label, content);
  chat.appendChild(thinking);
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
   4. INDIA DATE AND TIME
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
  clock.textContent =
    current.date + " • " + current.time + " IST";
}

updateClock();
setInterval(updateClock, 1000);

/* =======================================================
   5. BASIC CONVERSATION AND IDENTITY
======================================================= */

function answerInstant(question) {
  const q = cleanQuestion(question);
  const current = indiaDateTime();

  if (/^(hi|hello|hey|hii|heyy|namaste|yo)\b/.test(q)) {
    return "Heyyy! ⚡ I'm ASWIK AI, created by Aswik Singh. Ask me a question, test my reasoning, give me a calculation, or ask me to explain a topic!";
  }

  if (containsAny(q, [
    "who made you",
    "who created you",
    "who developed you",
    "who built you",
    "who designed you",
    "who is your developer"
  ])) {
    return "I am **ASWIK AI**, designed and developed by **Aswik Singh**. ⚡ My current brain combines JavaScript reasoning, calculations, built-in explanations, and online information retrieval.";
  }

  if (containsAny(q, [
    "about developer",
    "tell me about aswik singh",
    "who is aswik singh"
  ])) {
    return "## About the Developer\n\n**Aswik Singh** is the developer of ASWIK AI. The project combines a futuristic assistant interface with a lightweight answer engine and online information retrieval.";
  }

  if (containsAny(q, [
    "what is your name",
    "who are you",
    "introduce yourself"
  ])) {
    return "I'm **ASWIK AI** — a digital assistant created by **Aswik Singh**. I can calculate, solve supported puzzles, explain topics, and retrieve online information.";
  }

  if (
    q === "time" ||
    q.includes("current time") ||
    q.includes("what time is it") ||
    q.includes("time in india")
  ) {
    return "The current time in India is **" +
      current.time + "** on " + current.date + ".";
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
    return "VIBGYOR represents the seven rainbow colours: **Violet, Indigo, Blue, Green, Yellow, Orange, and Red**.";
  }

  if (q.includes("what can you do") || q === "help") {
    return [
      "## ASWIK AI capabilities",
      "",
      "• Solve supported logic puzzles.",
      "• Calculate arithmetic and show steps.",
      "• Explain concepts using built-in knowledge.",
      "• Retrieve relevant Wikipedia summaries.",
      "• Look up recent news when the feed is available.",
      "• Show the current date and time in India.",
      "• Help search for Indian festival dates.",
      "",
      "I'm a lightweight answer engine, not a trained general-purpose language model yet."
    ].join("\n");
  }

  if (
    q.includes("are you a real ai") ||
    q.includes("are you an llm") ||
    q.includes("are you a language model")
  ) {
    return "I'm an AI-style assistant built with JavaScript reasoning and retrieval. This version doesn't contain a trained large language model, so I cannot reliably generate every possible answer. We're improving my answer engine step by step!";
  }

  return null;
}

/* =======================================================
   6. REASONING ENGINE
======================================================= */

function answerReasoning(question) {
  const q = normalise(question);

  // Sheep puzzle.
  if (
    q.includes("17 sheep") &&
    (q.includes("all but 9") || q.includes("all except 9"))
  ) {
    return "The answer is **9 sheep**. “All but 9 run away” means all except 9 run away, so 9 remain.";
  }

  // Race position.
  if (q.includes("overtake") && q.includes("second place")) {
    return "You are in **second place**. By overtaking the person in second, you take their position. You haven't overtaken the person in first place.";
  }

  // Clock puzzle: punctuation-independent detection.
  if (
    (/\b3\s*:\s*15\b/.test(q) || /\b3\s+15\b/.test(q)) &&
    containsAny(q, ["clock", "angle", "hands", "minute hand", "hour hand"])
  ) {
    return [
      "The smaller angle is **7.5°**.",
      "",
      "**Step 1:** The minute hand at 15 minutes is at 15 × 6° = 90°.",
      "**Step 2:** The hour hand moves 30° per hour and 0.5° per minute.",
      "**Step 3:** At 3:15, the hour hand is (3 × 30°) + (15 × 0.5°) = 97.5°.",
      "**Step 4:** The difference is 97.5° − 90° = **7.5°**."
    ].join("\n");
  }

  // Only-child family riddle.
  if (
    q.includes("no brothers or sisters") &&
    q.includes("father's son")
  ) {
    return "Assuming the speaker has no siblings, **“my father's son” means the speaker**. Therefore, if this person's father is the speaker, the person is **the speaker's child**. The precise answer depends on the complete riddle and picture.";
  }

  // All months have 28 days.
  if (
    q.includes("how many months") &&
    q.includes("28 days")
  ) {
    return "**12 months.** Every month has at least 28 days. February has 28 days in a common year and 29 in a leap year.";
  }

  // Bat and ball.
  if (
    q.includes("bat and a ball") &&
    (q.includes("1.10") || q.includes("$1.10"))
  ) {
    return "The ball costs **5 cents** and the bat costs **$1.05**. Together they cost $1.10, and the bat costs exactly $1 more than the ball.";
  }

  // Simple sequence recognition.
  const sequenceMatch = q.match(
    /(?:sequence|series|next number|what comes next)\D*((?:-?\d+\s*,\s*){2,}-?\d+)/
  );

  if (sequenceMatch) {
    const nums = sequenceMatch[1]
      .split(",")
      .map(n => Number(n.trim()));

    const differences = nums.slice(1).map(
      (n, i) => n - nums[i]
    );

    if (
      differences.length > 0 &&
      differences.every(n => n === differences[0])
    ) {
      const next = nums[nums.length - 1] + differences[0];
      return "The next number is **" + next +
        "**. Each term changes by " + differences[0] + ".";
    }

    if (
      nums.every(n => n !== 0) &&
      nums.slice(1).every(
        (n, i) => Math.abs(n / nums[i] - nums[1] / nums[0]) < 0.000001
      )
    ) {
      const ratio = nums[1] / nums[0];
      const next = nums[nums.length - 1] * ratio;
      return "The next number is **" + next +
        "**. Each term is multiplied by " + ratio + ".";
    }
  }

  return null;
}

/* =======================================================
   7. SAFE ARITHMETIC PARSER
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
    .replace(/\bplus\b/g, "+")
    .replace(/\bminus\b/g, "-")
    .replace(/\btimes\b/g, "*")
    .replace(/\bmultiplied by\b/g, "*")
    .replace(/\bdivided by\b/g, "/")
    .replace(/\bover\b/g, "/")
    .replace(/\bmodulo\b/g, "%")
    .replace(/\bmod\b/g, "%")
    .replace(/[?=]/g, " ")
    .trim();

  if (!expression) return null;

  // Restrict to arithmetic syntax.
  if (!/^[\d\s.+\-*/%()]+$/.test(expression)) return null;

  const tokens = expression.match(/\d+(?:\.\d+)?|\.\d+|[()+\-*/%]/g);

  if (!tokens || tokens.join("") !== expression.replace(/\s/g, "")) {
    return null;
  }

  // Avoid interpreting a lone number as a question.
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

      if (tokens[index] !== ")") {
        throw new Error("Missing closing bracket");
      }

      index++;
      return value;
    }

    const token = tokens[index++];

    if (token === undefined || !/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(token)) {
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
        throw new Error("Cannot divide by zero");
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
   8. BUILT-IN KNOWLEDGE AND COMPOSED EXPLANATIONS
======================================================= */

const CONCEPTS = [
  {
    id: "ai-ml-dl",
    keys: ["artificial intelligence", "machine learning", "deep learning"],
    answer: [
      "## AI vs Machine Learning vs Deep Learning",
      "",
      "**Artificial intelligence (AI)** is the broad field of making computers perform tasks associated with intelligent behaviour.",
      "",
      "**Machine learning (ML)** is a subset of AI in which systems learn patterns from data to make predictions or decisions.",
      "",
      "**Deep learning (DL)** is a subset of ML that uses neural networks with multiple layers to learn complex patterns.",
      "",
      "**Relationship:** Deep learning is part of machine learning, and machine learning is part of AI.",
      "",
      "**Example:** A cat-recognition application performs an AI task. It may use machine learning to learn from examples and a deep neural network to recognise visual patterns."
    ].join("\n")
  },
  {
    id: "ai",
    keys: ["artificial intelligence", "what is ai", "define ai"],
    answer: "## Artificial Intelligence\n\nArtificial intelligence (AI) is the field of building computer systems that perform tasks associated with human intelligence, such as understanding language, recognising patterns, solving problems, and making predictions.\n\nExamples include voice assistants, recommendation systems, image recognition, and navigation software.\n\nAI is the broad field; some AI systems use fixed rules, while others learn patterns from data."
  },
  {
    id: "ml",
    keys: ["machine learning", "what is ml", "define ml"],
    answer: "## Machine Learning\n\nMachine learning is a branch of AI in which a system learns patterns from data to make predictions or decisions, instead of relying only on manually written rules.\n\nFor example, an email filter can learn patterns associated with spam messages from examples.\n\nMachine learning is one approach within AI."
  },
  {
    id: "dl",
    keys: ["deep learning", "what is dl", "define deep learning"],
    answer: "## Deep Learning\n\nDeep learning is a type of machine learning that uses neural networks with multiple layers to learn complex patterns.\n\nIt is used in image recognition, speech processing, translation, and many modern generative AI systems.\n\nDeep learning is part of machine learning, which is part of AI."
  },
  {
    id: "algorithm",
    keys: ["what is an algorithm", "define algorithm", "what is algorithm"],
    answer: "An **algorithm** is a clear sequence of steps used to solve a problem or complete a task. A cooking recipe is a simple analogy: it gives ordered instructions to produce a result."
  },
  {
    id: "javascript",
    keys: ["what is javascript", "define javascript", "javascript programming"],
    answer: "## JavaScript\n\nJavaScript is a programming language widely used to make websites interactive. It can respond to clicks, process input, calculate results, update pages, and communicate with online services."
  },
  {
    id: "html",
    keys: ["what is html", "define html"],
    answer: "**HTML** stands for HyperText Markup Language. It defines the structure and content of a web page, including headings, paragraphs, buttons, forms, and images."
  },
  {
    id: "css",
    keys: ["what is css", "define css"],
    answer: "**CSS** stands for Cascading Style Sheets. It controls the visual appearance of a web page, including colours, layouts, spacing, fonts, animations, and responsive design."
  },
  {
    id: "api",
    keys: ["what is an api", "what is api", "define api"],
    answer: "An **API** is a defined way for one software system to communicate with another. For example, a weather application may use an API to request weather information from a server."
  },
  {
    id: "neural-network",
    keys: ["what is a neural network", "define neural network"],
    answer: "A **neural network** is a machine-learning model made of connected computational units arranged in layers. During training, it adjusts numerical parameters to learn patterns from examples."
  },
  {
    id: "generative-ai",
    keys: ["what is generative ai", "define generative ai"],
    answer: "**Generative AI** creates new content—such as text, images, audio, or code—based on patterns learned during training. A rule-based script can compose responses, but that alone does not make it a trained generative model."
  },
  {
    id: "internet",
    keys: ["what is the internet", "define internet"],
    answer: "The **internet** is a worldwide network of connected computer networks that communicate using shared protocols. The web is one service that runs on the internet; email and other services use it too."
  },
  {
    id: "photosynthesis",
    keys: ["what is photosynthesis", "define photosynthesis"],
    answer: "**Photosynthesis** is the process by which plants, algae, and some bacteria use light energy to convert carbon dioxide and water into energy-rich sugars. Oxygen is released during the common form of photosynthesis."
  },
  {
    id: "gravity",
    keys: ["what is gravity", "define gravity"],
    answer: "**Gravity** is the interaction that attracts objects with mass toward one another. On Earth, it makes unsupported objects fall toward the ground and helps keep the Moon in orbit."
  }
];

function answerConcept(question) {
  const q = cleanQuestion(question);

  // Detect comparison questions before individual concepts.
  const combined = CONCEPTS.find(item =>
    item.id === "ai-ml-dl"
  );

  if (
    (q.includes("difference") || q.includes("compare") || q.includes("vs")) &&
    q.includes("artificial intelligence") &&
    q.includes("machine learning") &&
    q.includes("deep learning")
  ) {
    return combined.answer;
  }

  // Exact or specific phrase matching first.
  for (const concept of CONCEPTS) {
    if (concept.id === "ai-ml-dl") continue;

    for (const key of concept.keys) {
      if (q === key || q.includes(key)) {
        return concept.answer;
      }
    }
  }

  // If the question mentions all three, give the comparison.
  if (
    q.includes("artificial intelligence") &&
    q.includes("machine learning") &&
    q.includes("deep learning")
  ) {
    return combined.answer;
  }

  return null;
}

/* =======================================================
   9. WIKIPEDIA SEARCH
======================================================= */

async function fetchTimed(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ASWIK.timeout);

  try {
    const response = await fetch(url, {
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

async function wikipediaResults(query) {
  const key = "wiki-search:" + cleanQuestion(query);

  if (ASWIK_STATE.cache.has(key)) {
    return ASWIK_STATE.cache.get(key);
  }

  const url = new URL(ASWIK.wikipediaSearch);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "5");

  const response = await fetchTimed(url);
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
    .replace(/^(please\s+)?(explain|describe|define|tell me about|who is|who was|what is|what are|where is|where are|when did|when was|why is|why are|how does|how do|how did)\s+/i, "")
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

  // Don't confidently show unrelated articles.
  if (ranked[0].score < 3) return null;

  const best = ranked[0];
  const summary = await wikipediaSummary(best.key);

  if (!summary.extract) return null;

  return {
    text: "**" + summary.title + "**\n\n" +
      summary.extract +
      "\n\n*Source: Wikipedia summary. Verify important information with additional sources.*",

    links: [
      { label: "Read source", url: summary.url },
      { label: "More search results", url: wikiURL(topic) }
    ]
  };
}

/* =======================================================
   10. LIVE NEWS
======================================================= */

function parseNews(xmlText) {
  const documentXML = new DOMParser().parseFromString(
    xmlText,
    "application/xml"
  );

  if (documentXML.querySelector("parsererror")) {
    throw new Error("Invalid RSS feed");
  }

  return Array.from(documentXML.querySelectorAll("item"))
    .slice(0, 7)
    .map(item => ({
      title: item.querySelector("title")?.textContent?.trim() || "",
      url: item.querySelector("link")?.textContent?.trim() || "",
      date: item.querySelector("pubDate")?.textContent?.trim() || "",
      source: item.querySelector("source")?.textContent?.trim() || ""
    }))
    .filter(item => item.title && item.url);
}

async function answerNews(question) {
  const q = cleanQuestion(question);

  let topic = "india";

  if (containsAny(q, ["world news", "global news", "international news"])) {
    topic = "world";
  }

  if (containsAny(q, ["technology news", "tech news", "ai news"])) {
    topic = "technology";
  }

  try {
    const url = ASWIK.newsProxy + ASWIK.feeds[topic];
    const response = await fetchTimed(url);
    const articles = parseNews(await response.text());

    if (!articles.length) {
      throw new Error("No articles found");
    }

    const lines = [
      "## Recent " + topic + " news",
      "",
      "Stories returned by the current news feed:"
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
  } catch {
    return {
      text: "I couldn't retrieve the news feed right now. The public feed or proxy may be unavailable. Here are live search options instead.",
      links: [
        { label: "Latest Indian news", url: googleURL("latest Indian news") },
        { label: "Latest world news", url: googleURL("latest world news") },
        { label: "Latest technology news", url: googleURL("latest AI technology news") }
      ]
    };
  }
}

/* =======================================================
   11. INDIAN FESTIVAL ASSISTANCE
======================================================= */

function answerFestival() {
  const current = indiaDateTime();

  return {
    text: [
      "Today in India is **" + current.date + "**.",
      "",
      "I don't have a verified festival calendar covering every Indian region and tradition built into this lightweight version, so I won't guess which festival is being observed today.",
      "",
      "Check a current calendar and confirm the date for your region."
    ].join("\n"),

    links: [
      {
        label: "Indian festivals today",
        url: googleURL("Indian festivals today " + new Date().getFullYear())
      },
      {
        label: "Hindu calendar",
        url: googleURL("Hindu calendar festivals today India")
      },
      {
        label: "Indian government holiday calendar",
        url: googleURL("India official government holiday calendar")
      }
    ]
  };
}

/* =======================================================
   12. SMART ROUTING
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
    "festival in india"
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
      "That doesn't mean the question is impossible. My lightweight brain still has limits, and I don't want to invent facts.",
      "",
      "I can help you search for the answer online."
    ].join("\n"),

    links: [
      { label: "Search the web", url: googleURL(question) },
      { label: "Search Wikipedia", url: wikiURL(question) }
    ]
  };
}

/* =======================================================
   13. MAIN ANSWER GENERATOR
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

    // Priority 1: identity, greetings, date, time.
    result = answerInstant(original);

    // Priority 2: explicit reasoning before online retrieval.
    if (!result) {
      result = answerReasoning(original);
    }

    // Priority 3: arithmetic.
    if (!result) {
      result = solveMath(original);
    }

    // Priority 4: compose an explanation from built-in knowledge.
    if (!result) {
      result = answerConcept(original);
    }

    // Priority 5: news retrieval.
    if (!result && isNewsQuestion(q)) {
      result = await answerNews(original);
    }

    // Priority 6: festival-date assistance.
    if (!result && isFestivalQuestion(q)) {
      result = answerFestival();
    }

    // Priority 7: factual retrieval.
    if (!result && isFactualQuestion(q)) {
      try {
        result = await answerWikipedia(original);
      } catch (error) {
        console.warn("Wikipedia retrieval failed:", error);
      }
    }

    // Priority 8: honest search fallback.
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
   14. CONNECT EXISTING HTML CONTROLS
======================================================= */

function submitQuestion(question) {
  const value = String(question || "").trim();
  if (value) void handleQuestion(value);
}

const messageForm = document.querySelector("#messageForm");
const messageInput = document.querySelector("#messageInput");
const sendButton = document.querySelector("#sendBtn");

if (messageForm) {
  messageForm.addEventListener("submit", event => {
    event.preventDefault();

    submitQuestion(messageInput?.value);

    if (messageInput) {
      messageInput.value = "";
      messageInput.focus();
    }
  });
} else if (sendButton && messageInput) {
  sendButton.addEventListener("click", event => {
    event.preventDefault();
    submitQuestion(messageInput.value);
    messageInput.value = "";
    messageInput.focus();
  });

  messageInput.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitQuestion(messageInput.value);
      messageInput.value = "";
    }
  });
}

// Quick prompt buttons.
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
    submitQuestion(searchInput.value);
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
  "⚡ " + ASWIK.name + " brain ready. Developer: " + ASWIK.developer
);
