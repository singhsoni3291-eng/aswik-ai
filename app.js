
"use strict";

/*
 * ASWIK AI — ASWIK LITE BRAIN
 * Developer: Aswik Singh
 *
 * Lightweight JavaScript assistant:
 * - Wikipedia knowledge retrieval
 * - Indian and world news retrieval
 * - Indian festival search
 * - Date and time
 * - Short-term conversation context
 * - Search caching and duplicate-request protection
 *
 * No API key or AI model download required.
 *
 * Important: This is a retrieval-based assistant, not a trained
 * generative language model.
 */

const ASWIK = {
  name: "ASWIK AI",
  developer: "Aswik Singh",

  wikipediaSearch:
    "https://en.wikipedia.org/w/rest.php/v1/search/page",

  wikipediaSummary:
    "https://en.wikipedia.org/api/rest_v1/page/summary/",

  newsProxy: "https://proxy.cors.dev/",

  newsFeeds: {
    india: [
      {
        name: "Google News India",
        url: "https://news.google.com/rss/search?q=India%20when%3A1d&hl=en-IN&gl=IN&ceid=IN%3Aen"
      },
      {
        name: "Google News India Politics",
        url: "https://news.google.com/rss/search?q=India%20politics%20when%3A1d&hl=en-IN&gl=IN&ceid=IN%3Aen"
      },
      {
        name: "Google News India Economy",
        url: "https://news.google.com/rss/search?q=India%20economy%20when%3A1d&hl=en-IN&gl=IN&ceid=IN%3Aen"
      }
    ],

    world: [
      {
        name: "Google News World",
        url: "https://news.google.com/rss/search?q=world%20news%20when%3A1d&hl=en-IN&gl=IN&ceid=IN%3Aen"
      }
    ],

    technology: [
      {
        name: "Google News Technology",
        url: "https://news.google.com/rss/search?q=technology%20news%20when%3A1d&hl=en-IN&gl=IN&ceid=IN%3Aen"
      }
    ]
  },

  cacheDuration: 5 * 60 * 1000,
  maxHistory: 8,
  maxInputLength: 2000
};

const state = {
  history: [],
  cache: new Map(),
  pending: new Map(),
  busy: false,
  lastTopic: "",
  lastQuestion: "",
  clockTimer: null
};

const $ = (selector) => document.querySelector(selector);

const elements = {
  chat: $("#chat"),
  input: $("#messageInput"),
  send: $("#sendBtn"),
  searchForm: $("#searchForm"),
  searchInput: $("#searchInput"),
  aboutBtn: $("#aboutBtn"),
  aboutDialog: $("#aboutDialog"),
  closeAbout: $("#closeAbout"),
  clock: $("#clock")
};

/* -------------------- BASIC UTILITIES -------------------- */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanQuestion(question) {
  return String(question ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, ASWIK.maxInputLength);
}

function addMessage(text, sender = "assistant", options = {}) {
  if (!elements.chat) {
    console.error("ASWIK: #chat element was not found.");
    return null;
  }

  const message = document.createElement("div");
  message.className = `message ${sender}`;
  message.dataset.aswikMessage = "true";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = sender === "user" ? "Y" : "A";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const heading = document.createElement("strong");
  heading.textContent = sender === "user" ? "YOU" : ASWIK.name;

  const body = document.createElement("div");
  body.className = "message-content";

  if (options.html === true) {
    // Only use this for HTML assembled by ASWIK's trusted renderer.
    body.innerHTML = text;
  } else {
    body.textContent = text;
  }

  bubble.append(heading, body);
  message.append(avatar, bubble);
  elements.chat.appendChild(message);

  message.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });

  return message;
}

function addRichMessage(parts) {
  const message = document.createElement("div");
  message.className = "message assistant";
  message.dataset.aswikMessage = "true";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "A";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const heading = document.createElement("strong");
  heading.textContent = ASWIK.name;

  const body = document.createElement("div");
  body.className = "message-content";

  for (const part of parts) {
    if (part.type === "text") {
      const paragraph = document.createElement("p");
      paragraph.textContent = part.text;
      body.appendChild(paragraph);
    }

    if (part.type === "link") {
      const paragraph = document.createElement("p");
      const link = document.createElement("a");

      link.href = part.url;
      link.textContent = part.text;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      paragraph.appendChild(link);
      body.appendChild(paragraph);
    }
  }

  bubble.append(heading, body);
  message.append(avatar, bubble);
  elements.chat.appendChild(message);

  message.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });

  return message;
}

function showTyping() {
  const message = addMessage("Thinking…", "assistant");
  if (message) message.dataset.typing = "true";
  return message;
}

function removeTyping(message) {
  if (message?.isConnected) message.remove();
}

function setBusy(busy) {
  state.busy = busy;

  if (elements.send) {
    elements.send.disabled = busy;
    elements.send.setAttribute("aria-busy", String(busy));
  }

  if (elements.input) {
    elements.input.disabled = busy;
  }
}

async function fetchText(url, timeout = 12000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "*/*" }
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status}).`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchJSON(url, timeout = 12000) {
  const text = await fetchText(url, timeout);
  return JSON.parse(text);
}

async function cachedRequest(key, requestFunction) {
  const cached = state.cache.get(key);

  if (cached && Date.now() - cached.time < ASWIK.cacheDuration) {
    return cached.value;
  }

  if (state.pending.has(key)) {
    return state.pending.get(key);
  }

  const promise = requestFunction()
    .then((value) => {
      state.cache.set(key, {
        time: Date.now(),
        value
      });

      return value;
    })
    .finally(() => {
      state.pending.delete(key);
    });

  state.pending.set(key, promise);
  return promise;
}

/* -------------------- CLOCK -------------------- */

function updateClock() {
  if (!elements.clock) return;

  elements.clock.textContent = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata"
  }).format(new Date());
}

function getCurrentDateTime() {
  const now = new Date();

  return {
    date: new Intl.DateTimeFormat("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata"
    }).format(now),

    time: new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata"
    }).format(now)
  };
}

/* -------------------- QUESTION UNDERSTANDING -------------------- */

function stripQuestionPrefix(question) {
  return String(question)
    .replace(/^(please\s+)?(can you|could you|would you|will you)\s+/i, "")
    .replace(/^(please\s+)?(tell me|explain to me|show me|find me)\s+/i, "")
    .replace(/^(what is|what are|who is|who was|define)\s+/i, "")
    .replace(/^(explain|describe|summarize|summarise)\s+/i, "")
    .replace(/^(search for|look up|find information about)\s+/i, "")
    .replace(/[?.!]+$/g, "")
    .trim();
}

function isGreeting(question) {
  return /^(hi|hello|hey|heyy|hii|good morning|good afternoon|good evening|namaste|yo)(\s+aswik)?$/i
    .test(normalizeText(question));
}

function getFollowUpQuestion(question) {
  const normalized = normalizeText(question);

  const followUpPatterns = [
    /^tell me more$/,
    /^explain more$/,
    /^go on$/,
    /^continue$/,
    /^why$/,
    /^how so$/,
    /^what about it$/,
    /^give an example$/,
    /^examples please$/,
    /^make it simpler$/,
    /^simplify it$/,
    /^summarize it$/,
    /^summarise it$/
  ];

  if (!followUpPatterns.some((pattern) => pattern.test(normalized))) {
    return question;
  }

  if (!state.lastTopic) return question;

  if (/^why$/.test(normalized)) {
    return `Why is ${state.lastTopic} important?`;
  }

  if (/^how so$/.test(normalized)) {
    return `Explain how ${state.lastTopic} works.`;
  }

  if (/^give an example$|^examples please$/.test(normalized)) {
    return `Give examples of ${state.lastTopic}.`;
  }

  if (/^make it simpler$|^simplify it$/.test(normalized)) {
    return `Explain ${state.lastTopic} in simpler words.`;
  }

  if (/^summari[sz]e it$/.test(normalized)) {
    return `Summarize ${state.lastTopic}.`;
  }

  return `${question} about ${state.lastTopic}`;
}

function rememberExchange(question, answer) {
  state.history.push({
    role: "user",
    content: question,
    time: Date.now()
  });

  state.history.push({
    role: "assistant",
    content: answer,
    time: Date.now()
  });

  while (state.history.length > ASWIK.maxHistory * 2) {
    state.history.shift();
  }

  state.lastQuestion = question;
}

function inferTopic(question) {
  const topic = stripQuestionPrefix(question)
    .replace(/^(the|a|an)\s+/i, "")
    .trim();

  if (topic.length >= 2 && topic.length <= 100) {
    state.lastTopic = topic;
  }
}

/* -------------------- INSTANT ANSWERS -------------------- */

function getInstantAnswer(question) {
  const q = normalizeText(question);
  const current = getCurrentDateTime();

  if (isGreeting(question)) {
    return "Hello! ⚡ I'm ASWIK AI, created by Aswik Singh. What would you like to explore today?";
  }

  if (
    /who made you|who created you|who developed you|who is your developer|who built you|who is aswik singh/.test(q)
  ) {
    return "I am ASWIK AI, created and developed by Aswik Singh. ⚡";
  }

  if (
    /what is your name|who are you|introduce yourself|tell me about yourself/.test(q)
  ) {
    return "I'm ASWIK AI — a lightweight digital assistant created by Aswik Singh. I can retrieve knowledge, help with questions, check the date and time, and open online sources. My current JavaScript brain is not a trained generative language model.";
  }

  if (
    /what can you do|your features|help me|help menu/.test(q)
  ) {
    return "Here's what I can help with:\n\n• Answer simple built-in questions\n• Retrieve encyclopedia information\n• Find current news through online sources\n• Search for Indian festival information\n• Check the current date and time\n• Remember the recent topic during this session\n\nI'm being improved gradually, without downloading another heavy AI model.";
  }

  if (
    /what time is it|current time|tell me the time|time in india/.test(q)
  ) {
    return `The current time in India is ${current.time} (IST).`;
  }

  if (
    /what is today's date|what is the date today|current date|today's date|date today/.test(q)
  ) {
    return `Today is ${current.date} in India.`;
  }

  if (
    /what is vibgyor|colours of the rainbow|colors of the rainbow|rainbow colours|rainbow colors/.test(q)
  ) {
    return "VIBGYOR represents the seven traditional rainbow colours: Violet, Indigo, Blue, Green, Yellow, Orange, and Red.";
  }

  if (
    /what is 2\s*\+\s*2|what is two plus two/.test(q)
  ) {
    return "2 + 2 = 4.";
  }

  return null;
}

/* -------------------- WIKIPEDIA KNOWLEDGE -------------------- */

function getSearchTerms(question) {
  return stripQuestionPrefix(question)
    .replace(/\b(in simple words|in simple language|for beginners|in detail|with examples|in short|briefly)\b/gi, "")
    .replace(/\b(please|today|currently|actually|basically)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleScore(title, query) {
  const t = normalizeText(title);
  const q = normalizeText(query);

  if (!t || !q) return 0;
  if (t === q) return 100;

  let score = 0;

  if (t.startsWith(q)) score += 35;
  if (t.includes(q)) score += 25;
  if (q.includes(t)) score += 15;

  const queryWords = q.split(" ").filter((word) => word.length > 2);
  const titleWords = new Set(t.split(" "));

  for (const word of queryWords) {
    if (titleWords.has(word)) score += 8;
  }

  return score;
}

async function searchWikipedia(question, limit = 5) {
  const query = getSearchTerms(question);

  if (!query) return [];

  const cacheKey = `wiki-search:${query.toLowerCase()}:${limit}`;

  return cachedRequest(cacheKey, async () => {
    const url = new URL(ASWIK.wikipediaSearch);

    url.searchParams.set("q", query);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("language", "en");

    const data = await fetchJSON(url.toString());
    const pages = Array.isArray(data.pages) ? data.pages : [];

    return pages
      .map((page) => ({
        ...page,
        _score: titleScore(page.title || "", query)
      }))
      .sort((a, b) => b._score - a._score);
  });
}

async function getWikipediaSummary(title) {
  const safeTitle = String(title || "").trim();

  if (!safeTitle) {
    throw new Error("A Wikipedia article title is required.");
  }

  const cacheKey = `wiki-summary:${safeTitle.toLowerCase()}`;

  return cachedRequest(cacheKey, async () => {
    const url = ASWIK.wikipediaSummary +
      encodeURIComponent(safeTitle.replace(/ /g, "_"));

    return fetchJSON(url);
  });
}

function getArticleURL(title) {
  return "https://en.wikipedia.org/wiki/" +
    encodeURIComponent(String(title || "").replace(/ /g, "_"));
}

async function answerFromWikipedia(question) {
  const results = await searchWikipedia(question, 5);

  if (!results.length) {
    addRichMessage([
      {
        type: "text",
        text: "I couldn't find a suitable encyclopedia article for that question."
      },
      {
        type: "text",
        text: "Try a shorter topic, or use the Live Web Search box below."
      },
      {
        type: "link",
        text: `Search the web for: ${question}`,
        url: "https://www.google.com/search?q=" + encodeURIComponent(question)
      }
    ]);

    return;
  }

  const best = results[0];

  let article;

  try {
    article = await getWikipediaSummary(best.title);
  } catch (error) {
    console.warn("ASWIK: Wikipedia summary failed.", error);

    addRichMessage([
      {
        type: "text",
        text: `I found a possible topic: ${best.title}, but couldn't load its summary.`
      },
      {
        type: "link",
        text: "Open the Wikipedia article",
        url: getArticleURL(best.title)
      },
      {
        type: "link",
        text: "Search other sources",
        url: "https://www.google.com/search?q=" + encodeURIComponent(question)
      }
    ]);

    return;
  }

  if (article.type === "disambiguation") {
    const parts = [
      {
        type: "text",
        text: `"${best.title}" can refer to more than one topic. Here are some possible matches:`
      }
    ];

    for (const item of results.slice(0, 4)) {
      parts.push({
        type: "link",
        text: item.title,
        url: getArticleURL(item.title)
      });
    }

    addRichMessage(parts);
    return;
  }

  const extract = article.extract ||
    "The article did not provide a readable summary.";

  const parts = [
    {
      type: "text",
      text: extract
    },
    {
      type: "link",
      text: `Read more: ${article.title || best.title}`,
      url: article.content_urls?.desktop?.page || getArticleURL(best.title)
    }
  ];

  const alternatives = results
    .filter((item) => normalizeText(item.title) !== normalizeText(best.title))
    .slice(0, 2);

  if (alternatives.length) {
    parts.push({
      type: "text",
      text: "Related topics:"
    });

    for (const item of alternatives) {
      parts.push({
        type: "link",
        text: item.title,
        url: getArticleURL(item.title)
      });
    }
  }

  addRichMessage(parts);

  state.lastTopic = article.title || best.title;
}

/* -------------------- NEWS RETRIEVAL -------------------- */

function getTextContent(element, selector) {
  return element.querySelector(selector)?.textContent?.trim() || "";
}

function parseRSS(xmlText, sourceName) {
  const parser = new DOMParser();
  const documentXML = parser.parseFromString(xmlText, "text/xml");

  if (documentXML.querySelector("parsererror")) {
    throw new Error("The news feed could not be parsed.");
  }

  const rssItems = [...documentXML.querySelectorAll("item")];
  const atomItems = [...documentXML.querySelectorAll("entry")];
  const items = rssItems.length ? rssItems : atomItems;

  return items.map((item) => {
    const title = getTextContent(item, "title");
    const description =
      getTextContent(item, "description") ||
      getTextContent(item, "summary") ||
      getTextContent(item, "content");

    let link = getTextContent(item, "link");

    if (!link) {
      link = item.querySelector("link")?.getAttribute("href") || "";
    }

    const date =
      getTextContent(item, "pubDate") ||
      getTextContent(item, "published") ||
      getTextContent(item, "updated");

    return {
      title,
      description: description.replace(/<[^>]*>/g, " ").trim(),
      link,
      date,
      source: sourceName
    };
  }).filter((item) => item.title && item.link);
}

async function getNews(category = "india") {
  const feeds = ASWIK.newsFeeds[category] || ASWIK.newsFeeds.india;
  const allArticles = [];

  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      const url = ASWIK.newsProxy + feed.url;
      const xml = await fetchText(url, 15000);

      return parseRSS(xml, feed.name);
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      allArticles.push(...result.value);
    } else {
      console.warn("ASWIK: A news feed failed.", result.reason);
    }
  }

  const seen = new Set();

  return allArticles.filter((article) => {
    const key = normalizeText(article.title);

    if (!key || seen.has(key)) return false;

    seen.add(key);
    return true;
  }).slice(0, 10);
}

async function answerNews(question) {
  let category = "india";
  const q = normalizeText(question);

  if (/technology|tech news|artificial intelligence news/.test(q)) {
    category = "technology";
  } else if (/world news|international news|global news/.test(q)) {
    category = "world";
  }

  addMessage("Checking available news feeds…", "assistant");
  const status = elements.chat?.lastElementChild;

  try {
    const articles = await getNews(category);

    if (status?.isConnected) status.remove();

    if (!articles.length) {
      addRichMessage([
        {
          type: "text",
          text: "I couldn't retrieve news feeds just now. You can still open a live search."
        },
        {
          type: "link",
          text: "Search Google News",
          url: "https://news.google.com/search?q=" +
            encodeURIComponent(question)
        }
      ]);

      return;
    }

    const parts = [
      {
        type: "text",
        text: `Here are the latest available headlines from ${category === "india" ? "India" : category === "world" ? "world news" : "technology"} feeds. Please open an article to confirm its details and publication time.`
      }
    ];

    for (const article of articles) {
      parts.push({
        type: "link",
        text: `${article.title} — ${article.source}`,
        url: article.link
      });
    }

    addRichMessage(parts);
  } catch (error) {
    if (status?.isConnected) status.remove();

    console.error("ASWIK: News retrieval failed.", error);

    addRichMessage([
      {
        type: "text",
        text: "The news feed could not be reached. This may be a network or proxy issue."
      },
      {
        type: "link",
        text: "Open Google News",
        url: "https://news.google.com/search?q=" +
          encodeURIComponent(question)
      }
    ]);
  }
}

/* -------------------- FESTIVAL INFORMATION -------------------- */

function answerFestival(question) {
  const current = getCurrentDateTime();

  addRichMessage([
    {
      type: "text",
      text: `Today is ${current.date} in India. I don't have a verified live Indian festival calendar available in my built-in knowledge, so I won't guess which festival falls today.`
    },
    {
      type: "text",
      text: "Check a current calendar or official source to confirm the festival and regional observance."
    },
    {
      type: "link",
      text: "Search Indian festivals for today's date",
      url: "https://www.google.com/search?q=" +
        encodeURIComponent(`${current.date} Indian festival`)
    },
    {
      type: "link",
      text: "Search Indian festival calendars",
      url: "https://www.google.com/search?q=" +
        encodeURIComponent("Indian festival calendar official")
    }
  ]);
}

/* -------------------- SMART RESPONSE COMPOSITION -------------------- */

function answerFromHistory(question) {
  const normalized = normalizeText(question);

  if (/what did i ask before|my previous question|what were we discussing/.test(normalized)) {
    if (!state.lastQuestion) {
      return "We haven't discussed a previous question in this session yet.";
    }

    return `Your previous question was: "${state.lastQuestion}"`;
  }

  if (/forget our conversation|clear memory|forget this chat/.test(normalized)) {
    state.history = [];
    state.lastTopic = "";
    state.lastQuestion = "";

    return "I've cleared ASWIK's temporary conversation memory for this page session.";
  }

  return null;
}

function buildSearchLink(question) {
  return "https://www.google.com/search?q=" +
    encodeURIComponent(question);
}

function answerGeneral(question) {
  const query = getSearchTerms(question);

  if (!query) {
    addMessage("Please tell me a little more about what you'd like to know.");
    return;
  }

  const parts = [
    {
      type: "text",
      text: `I can help you explore "${query}". My current brain retrieves information and organizes links; it does not yet have a trained generative language model.`
    },
    {
      type: "link",
      text: "Search Wikipedia",
      url: "https://en.wikipedia.org/w/index.php?search=" +
        encodeURIComponent(query)
    },
    {
      type: "link",
      text: "Search the wider web",
      url: buildSearchLink(query)
    }
  ];

  addRichMessage(parts);
}

/* -------------------- MAIN QUESTION ROUTER -------------------- */

async function handleQuestion(originalQuestion) {
  let question = cleanQuestion(originalQuestion);

  if (!question) return;

  if (question.length > ASWIK.maxInputLength) {
    addMessage(
      `Please keep your question under ${ASWIK.maxInputLength} characters.`,
      "assistant"
    );
    return;
  }

  question = getFollowUpQuestion(question);

  addMessage(originalQuestion, "user");
  setBusy(true);

  const typing = showTyping();

  try {
    const instant = getInstantAnswer(question);

    if (instant) {
      removeTyping(typing);
      addMessage(instant, "assistant");
      rememberExchange(originalQuestion, instant);
      return;
    }

    const historyAnswer = answerFromHistory(question);

    if (historyAnswer) {
      removeTyping(typing);
      addMessage(historyAnswer, "assistant");
      rememberExchange(originalQuestion, historyAnswer);
      return;
    }

    const q = normalizeText(question);

    if (
      /\b(news|headlines|latest india|latest world|breaking news|current affairs)\b/.test(q)
    ) {
      removeTyping(typing);
      await answerNews(question);
      rememberExchange(originalQuestion, "Retrieved news headlines or offered live news links.");
      return;
    }

    if (
      /\bfestival\b|\bfestivals\b|\bdiwali\b|\bholi\b|\bdussehra\b|\bnavratri\b|\beid\b|\braksha bandhan\b|\bindian holiday\b/.test(q)
    ) {
      removeTyping(typing);
      answerFestival(question);
      rememberExchange(originalQuestion, "Provided date context and festival-calendar search links.");
      return;
    }

    if (
      /\b(wikipedia|encyclopedia|explain|define|what is|what are|who is|who was|how does|how do|tell me about|describe|meaning of)\b/.test(q)
    ) {
      removeTyping(typing);

      try {
        await answerFromWikipedia(question);
        rememberExchange(originalQuestion, "Retrieved encyclopedia information.");
      } catch (error) {
        console.error("ASWIK: Wikipedia lookup failed.", error);

        addRichMessage([
          {
            type: "text",
            text: "I couldn't retrieve the encyclopedia information right now."
          },
          {
            type: "link",
            text: "Search the web instead",
            url: buildSearchLink(question)
          }
        ]);

        rememberExchange(originalQuestion, "Wikipedia retrieval failed; offered web search.");
      }

      inferTopic(question);
      return;
    }

    removeTyping(typing);
    answerGeneral(question);
    rememberExchange(originalQuestion, "Offered relevant knowledge-search links.");
    inferTopic(question);
  } catch (error) {
    removeTyping(typing);

    console.error("ASWIK brain error:", error);

    addMessage(
      "Something went wrong while processing your question. Please check your internet connection and try again.",
      "assistant"
    );
  } finally {
    setBusy(false);

    if (elements.input) {
      elements.input.disabled = false;
      elements.input.focus();
    }
  }
}

/* -------------------- SEARCH PANEL -------------------- */

function openWebSearch(query) {
  const value = String(query || "").trim();

  if (!value) return;

  const url = buildSearchLink(value);
  window.open(url, "_blank", "noopener,noreferrer");
}

function handleSearchSubmit(event) {
  event.preventDefault();

  const query = elements.searchInput?.value.trim();

  if (!query) {
    elements.searchInput?.focus();
    return;
  }

  openWebSearch(query);
}

/* -------------------- EVENT HANDLERS -------------------- */

function handleSend() {
  if (state.busy) return;

  const question = elements.input?.value.trim();

  if (!question) {
    elements.input?.focus();
    return;
  }

  elements.input.value = "";
  handleQuestion(question);
}

function handleInputKeydown(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    handleSend();
  }
}

function handleQuickSearch(event) {
  const button = event.target.closest("[data-query], [data-search]");

  if (!button) return;

  const query =
    button.dataset.query ||
    button.dataset.search ||
    "";

  if (!query) return;

  if (elements.searchInput) {
    elements.searchInput.value = query;
  }

  openWebSearch(query);
}

function openAboutDialog() {
  if (!elements.aboutDialog) return;

  if (typeof elements.aboutDialog.showModal === "function") {
    elements.aboutDialog.showModal();
  } else {
    elements.aboutDialog.setAttribute("open", "");
  }
}

function closeAboutDialog() {
  if (!elements.aboutDialog) return;

  if (typeof elements.aboutDialog.close === "function") {
    elements.aboutDialog.close();
  } else {
    elements.aboutDialog.removeAttribute("open");
  }
}

/* -------------------- INITIALIZATION -------------------- */

function initializeASWIK() {
  updateClock();

  if (state.clockTimer) clearInterval(state.clockTimer);

  state.clockTimer = setInterval(updateClock, 1000);

  elements.send?.addEventListener("click", handleSend);
  elements.input?.addEventListener("keydown", handleInputKeydown);
  elements.searchForm?.addEventListener("submit", handleSearchSubmit);

  // Quick-search buttons are inside the search panel in index.html.
  document.querySelector(".quick-searches")
    ?.addEventListener("click", handleQuickSearch);

  elements.aboutBtn?.addEventListener("click", openAboutDialog);
  elements.closeAbout?.addEventListener("click", closeAboutDialog);

  elements.aboutDialog?.addEventListener("click", (event) => {
    if (event.target === elements.aboutDialog) {
      closeAboutDialog();
    }
  });

  console.info(
    `${ASWIK.name} initialized. Developer: ${ASWIK.developer}.`
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeASWIK, {
    once: true
  });
} else {
  initializeASWIK();
}
