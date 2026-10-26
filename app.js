
/*
  ASWIK AI — SMART LIGHTWEIGHT ANSWER ENGINE
  Developer: Aswik Singh

  Features:
  - Generates answers using JavaScript logic and calculations
  - Solves selected riddles and reasoning questions
  - Explains AI, machine learning, deep learning, and other concepts
  - Searches Wikipedia for factual information
  - Retrieves news through a public RSS proxy when available
  - Provides Indian date/time and festival-search assistance
  - Keeps a lightweight, no-API-key design

  Important:
  This is a lightweight answer engine, not a trained LLM.
*/

"use strict";

/* =========================
   1. CONFIGURATION
========================= */

const ASWIK = {
  name: "ASWIK AI",
  developer: "Aswik Singh",

  wikipediaSearch:
    "https://en.wikipedia.org/w/rest.php/v1/search/page",

  wikipediaSummary:
    "https://en.wikipedia.org/api/rest_v1/page/summary/",

  newsProxy: "https://proxy.cors.dev/",

  newsFeeds: {
    india:
      "https://news.google.com/rss/search?q=India+when:1d&hl=en-IN&gl=IN&ceid=IN:en",

    world:
      "https://news.google.com/rss/search?q=world+news+when:1d&hl=en-IN&gl=IN&ceid=IN:en",

    technology:
      "https://news.google.com/rss/search?q=technology+AI+when:1d&hl=en-IN&gl=IN&ceid=IN:en"
  },

  maxHistory: 30,
  requestTimeout: 9000
};

const answerCache = new Map();
const conversationHistory = [];

/* =========================
   2. HTML HELPERS
========================= */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
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

function formatAnswer(text) {
  return escapeHTML(text)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

function addMessage(text, sender = "ai", options = {}) {
  const chat = document.querySelector("#chat");
  if (!chat) {
    console.log(`[${sender}]`, text);
    return;
  }

  const message = document.createElement("div");
  message.className =
    sender === "user" ? "message user-message" : "message ai-message";

  const content = document.createElement("div");
  content.className = "message-content";
  content.innerHTML = formatAnswer(text);

  message.appendChild(content);

  if (options.links?.length) {
    const links = document.createElement("div");
    links.className = "answer-links";

    for (const item of options.links) {
      const anchor = document.createElement("a");
      anchor.href = safeURL(item.url);
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = item.label;
      links.appendChild(anchor);
    }

    message.appendChild(links);
  }

  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;
}

function showThinking() {
  removeThinking();

  const chat = document.querySelector("#chat");
  if (!chat) return;

  const element = document.createElement("div");
  element.id = "aswik-thinking";
  element.className = "message ai-message";
  element.textContent = "⚡ ASWIK is thinking...";
  chat.appendChild(element);
  chat.scrollTop = chat.scrollHeight;
}

function removeThinking() {
  document.querySelector("#aswik-thinking")?.remove();
}

function remember(role, content) {
  conversationHistory.push({ role, content, time: Date.now() });

  while (conversationHistory.length > ASWIK.maxHistory) {
    conversationHistory.shift();
  }
}

/* =========================
   3. DATE AND TIME
========================= */

function getIndianDateTime() {
  const now = new Date();

  const date = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(now);

  const time = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  }).format(now);

  return { date, time };
}

function updateClock() {
  const clock = document.querySelector("#clock");
  if (!clock) return;

  const { date, time } = getIndianDateTime();
  clock.textContent = `${date} • ${time} IST`;
}

updateClock();
setInterval(updateClock, 1000);

/* =========================
   4. TEXT UNDERSTANDING
========================= */

function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\p{L}\p{N}\s'°.+*/=()-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text, phrases) {
  return phrases.some(phrase => text.includes(phrase));
}

function googleSearchURL(query) {
  return "https://www.google.com/search?q=" +
    encodeURIComponent(query);
}

function wikipediaSearchURL(query) {
  return "https://en.wikipedia.org/w/index.php?search=" +
    encodeURIComponent(query);
}

/* =========================
   5. INSTANT ANSWERS
========================= */

function getInstantAnswer(question) {
  const q = normalize(question);
  const { date, time } = getIndianDateTime();

  if (/^(hi|hello|hey|hii|heyy|yo|namaste|good morning|good afternoon|good evening)\b/.test(q)) {
    return "Hello! ⚡ I'm ASWIK AI, created by Aswik Singh. Ask me a question, give me a calculation, challenge me with a riddle, or ask me to explain a topic.";
  }

  if (
    q.includes("who made you") ||
    q.includes("who created you") ||
    q.includes("who developed you") ||
    q.includes("who is your developer") ||
    q.includes("who built you") ||
    q.includes("who designed you")
  ) {
    return "I am ASWIK AI, designed and developed by **Aswik Singh**. ⚡ My current brain combines JavaScript reasoning, calculations, and online information retrieval.";
  }

  if (
    q.includes("about developer") ||
    q.includes("tell me about aswik singh") ||
    q.includes("who is aswik singh")
  ) {
    return "## About the Developer\n\n**Aswik Singh** is the developer of ASWIK AI. This project combines a futuristic assistant interface with a lightweight JavaScript answer engine and online information retrieval.";
  }

  if (
    q === "time" ||
    q.includes("what time is it") ||
    q.includes("current time") ||
    q.includes("time in india") ||
    q.includes("time in ist")
  ) {
    return `The current time in India is **${time}** on **${date}**.`;
  }

  if (
    q === "date" ||
    q.includes("today's date") ||
    q.includes("todays date") ||
    q.includes("what is the date") ||
    q.includes("which day is today") ||
    q.includes("what day is it")
  ) {
    return `Today in India is **${date}**. The current time is ${time} IST.`;
  }

  if (
    q.includes("what is your name") ||
    q.includes("who are you") ||
    q.includes("introduce yourself")
  ) {
    return "I'm **ASWIK AI** — a lightweight digital assistant created by **Aswik Singh**. I can calculate, solve selected logic puzzles, explain topics, and retrieve online information.";
  }

  if (
    q === "help" ||
    q.includes("what can you do") ||
    q.includes("your capabilities") ||
    q.includes("how can you help")
  ) {
    return [
      "Here's what I can do right now:",
      "",
      "• Solve supported riddles and logic questions.",
      "• Calculate arithmetic and explain the steps.",
      "• Explain concepts in my built-in knowledge areas.",
      "• Search Wikipedia for factual topics.",
      "• Retrieve recent news when the public feed is accessible.",
      "• Show the date and time in India.",
      "• Help find information about Indian festivals.",
      "",
      "I'm still a lightweight answer engine, not a fully trained general-purpose language model."
    ].join("\n");
  }

  if (q.includes("vibgyor")) {
    return "VIBGYOR represents the seven colours of the rainbow: **Violet, Indigo, Blue, Green, Yellow, Orange, and Red**.";
  }

  if (
    q.includes("are you real ai") ||
    q.includes("are you an llm") ||
    q.includes("are you a language model")
  ) {
    return "I'm an AI-style assistant powered by JavaScript logic and online retrieval. This version does **not** contain a trained large language model, so it cannot independently generate every kind of answer the way a full LLM can.";
  }

  return null;
}

/* =========================
   6. REASONING ENGINE
   These rules solve a question;
   they do not copy an article.
========================= */

function answerReasoning(question) {
  const q = normalize(question);

  // Classic sheep riddle.
  if (
    q.includes("17 sheep") &&
    (q.includes("all but 9") || q.includes("all except 9"))
  ) {
    return "The answer is **9 sheep**. “All but 9 run away” means all of the sheep except 9 run away, so 9 remain.";
  }

  // Position in a race.
  if (
    q.includes("overtake") &&
    q.includes("second place")
  ) {
    return "You are in **second place**. When you overtake the person who was second, you take their position. You haven't overtaken the person in first place.";
  }

  // Clock angle at 3:15.
  if (
    q.includes("3:15") &&
    (q.includes("clock") || q.includes("angle") || q.includes("hands"))
  ) {
    return [
      "The smaller angle is **7.5°**.",
      "",
      "Here's the calculation:",
      "• The minute hand at 15 minutes is at 15 × 6° = 90°.",
      "• The hour hand moves 30° per hour, plus 0.5° per minute.",
      "• At 3:15, it is (3 × 30°) + (15 × 0.5°) = 97.5°.",
      "• Difference = 97.5° − 90° = **7.5°**."
    ].join("\n");
  }

  // Family riddle.
  if (
    q.includes("no brothers or sisters") &&
    q.includes("father's son")
  ) {
    return [
      "Assuming the speaker has no siblings, **“my father's son” means the speaker**.",
      "",
      "So “this person's father is me” means the person is **the speaker's child**.",
      "",
      "The exact answer depends on the full wording and who is shown in the picture."
    ].join("\n");
  }

  // Number of days in months.
  if (
    q.includes("how many months") &&
    q.includes("28 days")
  ) {
    return "All **12 months** have at least 28 days. February has 28 days in a common year and 29 in a leap year.";
  }

  // Bat and ball puzzle.
  if (
    q.includes("bat and a ball") &&
    (q.includes("$1.10") || q.includes("1.10"))
  ) {
    return "The ball costs **5 cents** and the bat costs **$1.05**. Together they cost $1.10, and the bat costs $1 more than the ball.";
  }

  // Light switch riddle.
  if (
    q.includes("electric bulb") &&
    q.includes("switch") &&
    q.includes("room")
  ) {
    return "One classic solution is to use the bulb's heat: turn on the first switch for a few minutes, turn it off, turn on the second switch, then enter the room. If the bulb is on, it's the second switch; if it's off but warm, it's the first; if it's off and cool, it's the third. This assumes an incandescent bulb and that you can touch it safely.";
  }

  // Simple sequence.
  const sequenceMatch = q.match(
    /(?:what comes next|next number|continue the sequence)[^0-9-]*(-?\d+(?:\s*[,]\s*-?\d+){2,})/
  );

  if (sequenceMatch) {
    const numbers = sequenceMatch[1]
      .split(",")
      .map(value => Number(value.trim()));

    if (numbers.length >= 3) {
      const differences = numbers.slice(1).map(
        (value, index) => value - numbers[index]
      );

      const allSameDifference = differences.every(
        difference => difference === differences[0]
      );

      if (allSameDifference) {
        const next = numbers[numbers.length - 1] + differences[0];
        return `The next number is **${next}**. The sequence increases by ${differences[0]} each time.`;
      }

      const ratios = numbers.slice(1).map(
        (value, index) => value / numbers[index]
      );

      if (
        numbers.every(value => value !== 0) &&
        ratios.every(ratio => Math.abs(ratio - ratios[0]) < 0.000001)
      ) {
        const next = numbers[numbers.length - 1] * ratios[0];
        return `The next number is **${next}**. Each term is multiplied by ${ratios[0]}.`;
      }
    }
  }

  return null;
}

/* =========================
   7. SAFE MATH CALCULATOR
========================= */

function solveMath(question) {
  let expression = String(question)
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/\bwhat is\b/g, "")
    .replace(/\bcalculate\b/g, "")
    .replace(/\bsolve\b/g, "")
    .replace(/\bcompute\b/g, "")
    .replace(/\banswer\b/g, "")
    .replace(/\bplus\b/g, "+")
    .replace(/\bminus\b/g, "-")
    .replace(/\btimes\b/g, "*")
    .replace(/\bmultiplied by\b/g, "*")
    .replace(/\bdivided by\b/g, "/")
    .replace(/\bover\b/g, "/")
    .replace(/\bmodulo\b/g, "%")
    .replace(/\bmod\b/g, "%")
    .replace(/\bto the power of\b/g, "**")
    .replace(/\bsquared\b/g, "**2")
    .replace(/\bcubed\b/g, "**3")
    .replace(/[?=]/g, " ")
    .trim();

  const asksForMath =
    /^(?:[-+]?[\d.]+\s*(?:\+|-|\*|\/|%|\*\*)\s*[-+]?[\d.]+(?:\s*(?:\+|-|\*|\/|%|\*\*)\s*[-+]?[\d.]+)*)$/.test(expression);

  if (!asksForMath) return null;

  // Only permit digits, whitespace, decimal points and arithmetic operators.
  if (!/^[\d\s.+\-*/%()]+$/.test(expression)) return null;
  if (expression.includes("**")) return null;

  try {
    const tokens = expression.match(
      /(?:\d+(?:\.\d*)?|\.\d+)|[()+\-*/%]/g
    );

    if (!tokens || tokens.join("").replace(/\s/g, "") !== expression.replace(/\s/g, "")) {
      return null;
    }

    let index = 0;

    function parseExpression() {
      let value = parseTerm();

      while (tokens[index] === "+" || tokens[index] === "-") {
        const operator = tokens[index++];
        const right = parseTerm();
        value = operator === "+" ? value + right : value - right;
      }

      return value;
    }

    function parseTerm() {
      let value = parseFactor();

      while (["*", "/", "%"].includes(tokens[index])) {
        const operator = tokens[index++];
        const right = parseFactor();

        if (operator === "*") value *= right;
        if (operator === "/") {
          if (right === 0) throw new Error("Division by zero");
          value /= right;
        }
        if (operator === "%") {
          if (right === 0) throw new Error("Division by zero");
          value %= right;
        }
      }

      return value;
    }

    function parseFactor() {
      if (tokens[index] === "+") {
        index++;
        return parseFactor();
      }

      if (tokens[index] === "-") {
        index++;
        return -parseFactor();
      }

      if (tokens[index] === "(") {
        index++;
        const value = parseExpression();

        if (tokens[index] !== ")") {
          throw new Error("Missing closing bracket");
        }

        index++;
        return value;
      }

      const token = tokens[index++];

      if (token === undefined || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) {
        throw new Error("Invalid number");
      }

      return Number(token);
    }

    const result = parseExpression();

    if (index !== tokens.length || !Number.isFinite(result)) {
      return null;
    }

    return `The answer is **${Number(result.toPrecision(12))}**.`;
  } catch {
    return null;
  }
}

/* =========================
   8. BUILT-IN EXPLANATIONS
========================= */

const KNOWLEDGE = [
  {
    keywords: ["artificial intelligence", "what is ai", "define ai"],
    answer: [
      "**Artificial intelligence (AI)** is the field of building computer systems that can perform tasks associated with human intelligence, such as understanding language, recognising patterns, solving problems, and making predictions.",
      "",
      "Examples include virtual assistants, image recognition, recommendation systems, and navigation software.",
      "",
      "AI is the broad field. Some AI systems use fixed rules, while others learn patterns from data."
    ].join("\n")
  },
  {
    keywords: ["machine learning", "what is ml", "define ml"],
    answer: [
      "**Machine learning (ML)** is a branch of AI in which a computer learns patterns from data to make predictions or decisions, rather than relying only on manually written rules.",
      "",
      "Example: an email filter can learn patterns associated with spam messages from many examples.",
      "",
      "**Relationship:** machine learning is one approach within artificial intelligence."
    ].join("\n")
  },
  {
    keywords: ["deep learning", "what is dl", "define deep learning"],
    answer: [
      "**Deep learning** is a type of machine learning that uses neural networks with multiple layers to learn complex patterns.",
      "",
      "It is used in areas such as image recognition, speech processing, translation, and many modern generative AI systems.",
      "",
      "Deep learning is part of machine learning, which is part of AI."
    ].join("\n")
  },
  {
    keywords: ["difference between ai machine learning and deep learning", "ai vs ml vs dl", "compare ai ml and dl", "artificial intelligence machine learning deep learning"],
    answer: [
      "## AI vs Machine Learning vs Deep Learning",
      "",
      "**1. Artificial intelligence (AI)**",
      "The broad field of making computers perform tasks that normally require intelligent behaviour.",
      "",
      "**2. Machine learning (ML)**",
      "A subset of AI that learns patterns from data to make predictions or decisions.",
      "",
      "**3. Deep learning (DL)**",
      "A subset of ML that uses neural networks with many layers to learn complex patterns.",
      "",
      "**Relationship:** Deep learning ⊂ Machine learning ⊂ Artificial intelligence.",
      "",
      "**Example:** In a cat-recognition app, AI describes the overall intelligent task, ML describes learning from examples, and deep learning describes a neural-network approach that can recognise visual features."
    ].join("\n")
  },
  {
    keywords: ["what is an algorithm", "define algorithm"],
    answer: "An **algorithm** is a clear sequence of steps used to solve a problem or complete a task. A cooking recipe is a simple analogy: it gives ordered instructions for producing a result."
  },
  {
    keywords: ["what is javascript", "define javascript"],
    answer: "**JavaScript** is a programming language commonly used to make websites interactive. It can respond to clicks, process input, calculate results, update pages, and communicate with online services."
  },
  {
    keywords: ["what is html", "define html"],
    answer: "**HTML** stands for HyperText Markup Language. It defines the structure and content of a web page, such as headings, paragraphs, buttons, forms, and images."
  },
  {
    keywords: ["what is css", "define css"],
    answer: "**CSS** stands for Cascading Style Sheets. It controls how a web page looks, including colours, layouts, spacing, fonts, animations, and responsiveness."
  },
  {
    keywords: ["what is an api", "define api"],
    answer: "An **API** is a defined way for one software system to communicate with another. For example, a weather app may use an API to request weather data from a server."
  },
  {
    keywords: ["what is a neural network", "define neural network"],
    answer: "A **neural network** is a machine-learning model made of connected computational units arranged in layers. During training, it adjusts numerical parameters to learn patterns from examples."
  },
  {
    keywords: ["what is generative ai", "define generative ai"],
    answer: "**Generative AI** creates new content—such as text, images, audio, or code—based on patterns learned during training. A rule-based script can compose predefined responses, but that alone does not make it a trained generative model."
  }
];

function answerBuiltInKnowledge(question) {
  const q = normalize(question);

  // Prefer the combined comparison before the individual definitions.
  const combined = KNOWLEDGE.find(item =>
    item.keywords.some(keyword =>
      keyword === "difference between ai machine learning and deep learning" ||
      keyword === "ai vs ml vs dl" ||
      keyword === "compare ai ml and deep learning" ||
      keyword === "artificial intelligence machine learning deep learning"
    ) && (
      (q.includes("difference") && q.includes("deep learning")) ||
      (q.includes("compare") && q.includes("deep learning")) ||
      (q.includes("ai vs ml") || q.includes("ai vs machine learning")) ||
      (q.includes("artificial intelligence") &&
       q.includes("machine learning") &&
       q.includes("deep learning"))
    )
  );

  if (combined) return combined.answer;

  // Match a definition by its distinctive topic.
  const match = KNOWLEDGE.find(item =>
    item.keywords.some(keyword => q.includes(keyword))
  );

  return match?.answer ?? null;
}

/* =========================
   9. WIKIPEDIA RETRIEVAL
========================= */

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    ASWIK.requestTimeout
  );

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function searchWikipedia(query) {
  const key = "search:" + normalize(query);

  if (answerCache.has(key)) return answerCache.get(key);

  const url = new URL(ASWIK.wikipediaSearch);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "5");

  const response = await fetchWithTimeout(url);
  const data = await response.json();
  const pages = Array.isArray(data.pages) ? data.pages : [];

  const results = pages.map(page => ({
    title: page.title,
    description: page.description || "",
    excerpt: page.excerpt || "",
    key: page.key || page.title.replace(/ /g, "_")
  }));

  answerCache.set(key, results);
  return results;
}

async function getWikipediaSummary(title) {
  const key = "summary:" + title;

  if (answerCache.has(key)) return answerCache.get(key);

  const url = ASWIK.wikipediaSummary +
    encodeURIComponent(title.replace(/ /g, "_"));

  const response = await fetchWithTimeout(url);
  const data = await response.json();

  const summary = {
    title: data.title || title,
    extract: data.extract || "",
    url: data.content_urls?.desktop?.page ||
      wikipediaSearchURL(title)
  };

  answerCache.set(key, summary);
  return summary;
}

function scoreWikipediaResult(result, query) {
  const title = normalize(result.title);
  const q = normalize(query);
  const words = q.split(" ").filter(word => word.length > 2);

  let score = 0;

  if (title === q) score += 12;
  if (q.includes(title) && title.length > 3) score += 6;
  if (title.includes(q) && q.length > 3) score += 5;

  for (const word of words) {
    if (title.includes(word)) score += 2;
    if (normalize(result.description).includes(word)) score += 0.5;
  }

  return score;
}

async function answerFromWikipedia(question) {
  const cleaned = question
    .replace(/^(please\s+)?(explain|describe|define|tell me about|who is|what is|what are|where is|when did|when was|why is|how does|how do|how did)\s+/i, "")
    .replace(/[?!.]+$/g, "")
    .trim();

  if (cleaned.length < 2) return null;

  const results = await searchWikipedia(cleaned);
  if (!results.length) return null;

  const ranked = results
    .map(result => ({
      ...result,
      score: scoreWikipediaResult(result, cleaned)
    }))
    .sort((a, b) => b.score - a.score);

  // Avoid confidently returning an unrelated article.
  if (ranked[0].score < 2) return null;

  const best = ranked[0];
  const summary = await getWikipediaSummary(best.key);

  if (!summary.extract) return null;

  return {
    text: `**${summary.title}**\n\n${summary.extract}\n\nThis answer is based on the available Wikipedia summary.`,
    links: [
      { label: "Read source", url: summary.url },
      { label: "More results", url: wikipediaSearchURL(cleaned) }
    ]
  };
}

/* =========================
   10. NEWS RETRIEVAL
========================= */

function parseNewsXML(xmlText) {
  const xml = new DOMParser().parseFromString(
    xmlText,
    "application/xml"
  );

  if (xml.querySelector("parsererror")) {
    throw new Error("Could not read the news feed.");
  }

  return Array.from(xml.querySelectorAll("item"))
    .slice(0, 7)
    .map(item => ({
      title: item.querySelector("title")?.textContent?.trim() || "News story",
      link: item.querySelector("link")?.textContent?.trim() || "",
      pubDate: item.querySelector("pubDate")?.textContent?.trim() || "",
      source: item.querySelector("source")?.textContent?.trim() || ""
    }))
    .filter(item => item.title && item.link);
}

async function getNews(topic = "india") {
  const feed = ASWIK.newsFeeds[topic] || ASWIK.newsFeeds.india;

  // A public proxy may be unavailable or change its behaviour.
  const proxyURL = ASWIK.newsProxy + feed;

  const response = await fetchWithTimeout(proxyURL);
  const xmlText = await response.text();
  const articles = parseNewsXML(xmlText);

  if (!articles.length) {
    throw new Error("The news feed returned no stories.");
  }

  return articles;
}

async function answerNews(question) {
  const q = normalize(question);

  let topic = "india";

  if (includesAny(q, ["technology news", "tech news", "ai news", "artificial intelligence news"])) {
    topic = "technology";
  } else if (includesAny(q, ["world news", "international news", "global news"])) {
    topic = "world";
  }

  try {
    const articles = await getNews(topic);

    const lines = [
      `## Recent ${topic === "india" ? "Indian" : topic === "world" ? "world" : "technology"} news`,
      "",
      "Here are stories returned by the available news feed:"
    ];

    for (const [index, article] of articles.entries()) {
      lines.push(
        "",
        `${index + 1}. **${article.title}**`,
        article.source ? `Source: ${article.source}` : "",
        article.pubDate ? `Published: ${article.pubDate}` : ""
      );
    }

    return {
      text: lines.filter(Boolean).join("\n"),
      links: articles.map(article => ({
        label: article.title,
        url: article.link
      }))
    };
  } catch {
    return {
      text: "I couldn't retrieve the news feed right now. The feed or public proxy may be unavailable. You can still open a live search for current stories.",
      links: [
        {
          label: "Search latest Indian news",
          url: googleSearchURL("latest Indian news")
        },
        {
          label: "Search latest world news",
          url: googleSearchURL("latest world news")
        }
      ]
    };
  }
}

/* =========================
   11. FESTIVAL SEARCH
========================= */

function answerFestival(question) {
  const { date } = getIndianDateTime();

  return {
    text: [
      `Today in India is **${date}**.`,
      "",
      "I don't have a verified, built-in Indian festival calendar for every region and tradition, so I won't guess which festival falls today.",
      "",
      "Use the links below to check current festival listings and confirm the date with a reliable calendar."
    ].join("\n"),
    links: [
      {
        label: "Search Indian festivals today",
        url: googleSearchURL("Indian festivals today date and year")
      },
      {
        label: "Search Hindu calendar",
        url: googleSearchURL("Hindu calendar festivals today India")
      },
      {
        label: "Search official government information",
        url: googleSearchURL("India government holiday calendar festivals")
      }
    ]
  };
}

/* =========================
   12. QUESTION ROUTING
========================= */

function isNewsQuestion(q) {
  return includesAny(q, [
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
  return (
    q.includes("festival") ||
    q.includes("festivals") ||
    q.includes("holiday today") ||
    q.includes("which festival")
  );
}

function looksLikeQuestionForWikipedia(q) {
  return /^(who is|who was|what is|what are|where is|where are|when did|when was|why is|why are|how does|how do|how did|explain|describe|define|tell me about)\b/.test(q);
}

function answerGeneral(question) {
  const cleaned = question.trim();

  return {
    text: [
      "I couldn't confidently generate an answer to that question using my current built-in reasoning.",
      "",
      "I can try to find reliable information online instead. This doesn't mean the question is impossible; my lightweight answer engine simply has limits.",
      "",
      "Try asking it in a more specific way, or open a search below."
    ].join("\n"),
    links: [
      {
        label: "Search the web",
        url: googleSearchURL(cleaned)
      },
      {
        label: "Search Wikipedia",
        url: wikipediaSearchURL(cleaned)
      }
    ]
  };
}

async function handleQuestion(question) {
  const original = String(question || "").trim();
  if (!original) return;

  addMessage(original, "user");
  remember("user", original);
  showThinking();

  let result = null;

  try {
    const q = normalize(original);

    // 1. Direct identity, greeting, date and time.
    result = getInstantAnswer(original);

    // 2. Solve known reasoning puzzles before web retrieval.
    if (!result) result = answerReasoning(original);

    // 3. Calculate arithmetic without eval().
    if (!result) result = solveMath(original);

    // 4. Generate explanations from built-in knowledge.
    if (!result) result = answerBuiltInKnowledge(original);

    // 5. Current news.
    if (!result && isNewsQuestion(q)) {
      result = await answerNews(original);
    }

    // 6. Festival questions need current calendar verification.
    if (!result && isFestivalQuestion(q)) {
      result = answerFestival(original);
    }

    // 7. Factual questions: retrieve a relevant source.
    if (!result && looksLikeQuestionForWikipedia(q)) {
      result = await answerFromWikipedia(original);
    }

    // 8. General fallback: never pretend an unrelated result is an answer.
    if (!result) {
      result = answerGeneral(original);
    }

    if (typeof result === "string") {
      addMessage(result, "ai");
      remember("ai", result);
    } else {
      addMessage(result.text, "ai", { links: result.links || [] });
      remember("ai", result.text);
    }
  } catch (error) {
    console.error("ASWIK answer error:", error);

    const fallback = {
      text: "I ran into a problem while trying to retrieve information. Your question has not been lost—try again, or use the search links below.",
      links: [
        { label: "Search the web", url: googleSearchURL(original) },
        { label: "Search Wikipedia", url: wikipediaSearchURL(original) }
      ]
    };

    addMessage(fallback.text, "ai", { links: fallback.links });
    remember("ai", fallback.text);
  } finally {
    removeThinking();
  }
}

/* =========================
   13. CONNECT THE EXISTING UI
========================= */

function submitQuestion(question) {
  const value = String(question || "").trim();
  if (!value) return;
  void handleQuestion(value);
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

// Quick prompts and search form supported by your existing HTML.
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
  `${ASWIK.name} brain loaded. Developer: ${ASWIK.developer}`
);
