
/*
  ASWIK AI — FREE NEWS & FESTIVAL RETRIEVAL
  Developer: Aswik Singh
  No API keys or paid services required.

  News: publisher RSS feeds via a public CORS proxy.
  Festivals: Indian Festival API, with cautious date handling.
*/

"use strict";

const ASWIK = {
  name: "ASWIK AI",
  developer: "Aswik Singh",
  newsProxy: "https://proxy.cors.dev/",
  festivalApi: "https://indian-festival-api.vercel.app/api/festivals",
  timeoutMs: 12000
};

// ---------- Find elements in the existing interface ----------

function findElement(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) return element;
  }
  return null;
}

const chatBox = findElement([
  "#chatMessages", "#messages", "#chatHistory",
  ".chat-messages", ".messages", ".chat-history",
  "#chat", "[data-chat-messages]"
]);

const messageInput = findElement([
  "#userInput", "#messageInput", "#chatInput",
  "#questionInput", "textarea",
  'input[type="text"]'
]);

const sendButton = findElement([
  "#sendBtn", "#sendButton", "#submitBtn",
  ".send-btn", ".send-button", '[data-send]'
]);

// ---------- Safe, accessible message rendering ----------

function addMessage(text, role = "assistant", links = []) {
  if (!chatBox) {
    console.log(`${ASWIK.name} (${role}): ${text}`);
    return;
  }

  const bubble = document.createElement("div");
  bubble.className = `message ${role}-message`;
  bubble.style.whiteSpace = "pre-wrap";

  const content = document.createElement("p");
  content.textContent = text;
  bubble.appendChild(content);

  for (const item of links) {
    if (!item.url || !/^https?:\/\//i.test(item.url)) continue;

    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = item.label || item.url;
    link.style.display = "block";
    link.style.marginTop = "8px";
    bubble.appendChild(link);
  }

  chatBox.appendChild(bubble);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function showTyping() {
  const indicator = document.createElement("div");
  indicator.className = "message assistant-message aswik-loading";
  indicator.textContent = "ASWIK is checking sources…";
  if (chatBox) chatBox.appendChild(indicator);
  return indicator;
}

function removeTyping(indicator) {
  if (indicator && indicator.parentNode) indicator.remove();
}

// ---------- Network helper with timeout ----------

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ASWIK.timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      credentials: "omit"
    });

    if (!response.ok) {
      throw new Error(`Source returned HTTP ${response.status}`);
    }

    return response;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- India date and time ----------

function indiaNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const part = type => parts.find(item => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function formatIndiaDate(dateString) {
  const date = new Date(`${dateString}T12:00:00+05:30`);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

// ---------- RSS news retrieval ----------

const NEWS_FEEDS = {
  world: [
    {
      source: "BBC World",
      url: "https://feeds.bbci.co.uk/news/world/rss.xml"
    },
    {
      source: "DW News",
      url: "https://rss.dw.com/xml/rss-en-all",
      direct: true
    }
  ],
  india: [
    {
      source: "Times of India",
      url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms"
    },
    {
      source: "BBC News",
      url: "https://feeds.bbci.co.uk/news/rss.xml"
    }
  ],
  tech: [
    {
      source: "BBC Technology",
      url: "https://feeds.bbci.co.uk/news/technology/rss.xml"
    },
    {
      source: "The New York Times",
      url: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
      direct: true
    }
  ]
};

function parseRSS(xmlText, sourceName) {
  const xml = new DOMParser().parseFromString(xmlText, "application/xml");
  if (xml.querySelector("parsererror")) {
    throw new Error(`${sourceName} returned invalid RSS.`);
  }

  return [...xml.querySelectorAll("item")].map(item => {
    const title = item.querySelector("title")?.textContent?.trim() || "";
    const rawLink = item.querySelector("link")?.textContent?.trim() || "";
    const pubDate = item.querySelector("pubDate")?.textContent?.trim() || "";
    const timestamp = pubDate ? Date.parse(pubDate) : NaN;

    let safeUrl = "";
    try {
      const parsed = new URL(rawLink);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        safeUrl = parsed.href;
      }
    } catch {
      safeUrl = "";
    }

    return {
      title,
      url: safeUrl,
      source: sourceName,
      timestamp
    };
  }).filter(item => item.title && item.url);
}

async function readFeed(feed) {
  // Use the direct URL only for feeds documented to allow browser CORS.
  const url = feed.direct
    ? feed.url
    : ASWIK.newsProxy + feed.url;

  const response = await fetchWithTimeout(url);
  const xml = await response.text();
  return parseRSS(xml, feed.source);
}

function newsCategory(question) {
  if (/\b(technology|tech news|artificial intelligence news|AI news|science news|gadgets)\b/i.test(question)) {
    return "tech";
  }

  if (/\b(india|indian|india news|latest india news|national news)\b/i.test(question)) {
    return "india";
  }

  return "world";
}

async function getLatestNews(question) {
  const category = newsCategory(question);
  const feeds = NEWS_FEEDS[category];

  // Each source is allowed to fail independently.
  const settled = await Promise.allSettled(feeds.map(readFeed));

  const articles = settled
    .filter(result => result.status === "fulfilled")
    .flatMap(result => result.value);

  // De-duplicate by canonical URL and headline.
  const seen = new Set();
  const unique = articles.filter(article => {
    const key = `${article.url}|${article.title.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const now = Date.now();
  const recent = unique
    .filter(article =>
      Number.isFinite(article.timestamp) &&
      article.timestamp <= now + 60 * 60 * 1000 &&
      article.timestamp >= now - 3 * 24 * 60 * 60 * 1000
    )
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8);

  if (!recent.length) {
    const query = encodeURIComponent(
      `${question} latest news today`
    );

    addMessage(
      "I couldn't verify recent headlines from the available feeds. " +
      "I won't show older or unverified stories as today's news. " +
      "You can search current coverage here:"
    , "assistant", [{
      label: "Search current news",
      url: `https://www.google.com/search?q=${query}&tbm=nws`
    }]);
    return;
  }

  const label = {
    world: "recent world news",
    india: "recent Indian news",
    tech: "recent technology news"
  }[category];

  addMessage(
    `Here are ${label} from the last 3 days. ` +
    "Publication times are shown in India Standard Time (IST). " +
    "Open a headline to read the original report.",
    "assistant"
  );

  for (const article of recent) {
    const published = new Date(article.timestamp).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short"
    });

    addMessage(
      `${article.title}\nSource: ${article.source}\nPublished: ${published} IST`,
      "assistant",
      [{ label: "Read original article ↗", url: article.url }]
    );
  }
}

// ---------- Festival date retrieval ----------

function getFestivalDate(record, year) {
  // The API documents year-specific fields such as date_2026.
  const candidates = [
    record?.[`date_${year}`],
    record?.date
  ];

  return candidates.find(value =>
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) || "";
}

async function getFestivalsForToday() {
  const date = indiaNow();
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));

  // Fetch the month and check exact dates locally. This avoids
  // depending on a date-filter endpoint that may return no matches.
  const url = `${ASWIK.festivalApi}?month=${month}`;
  const response = await fetchWithTimeout(url);
  const payload = await response.json();

  const records = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.festivals)
        ? payload.festivals
        : [];

  if (!records.length) {
    throw new Error("The festival source returned no usable records.");
  }

  const matches = records.filter(record =>
    getFestivalDate(record, year) === date
  );

  if (matches.length) {
    const links = matches.map(festival => ({
      label: `More about ${festival.name || "this festival"}`,
      url: `https://www.google.com/search?q=${encodeURIComponent(
        `${festival.name || "Indian festival"} ${year} date India`
      )}`
    }));

    addMessage(
      `Festival calendar result for ${formatIndiaDate(date)}:\n\n` +
      matches.map(festival => {
        const name = festival.name || "Unnamed festival";
        const religion = festival.religion
          ? ` (${festival.religion})`
          : "";
        const description = festival.description
          ? ` — ${festival.description}`
          : "";
        return `• ${name}${religion}${description}`;
      }).join("\n") +
      "\n\nSource: a community-maintained festival dataset, not an official government confirmation.",
      "assistant",
      links
    );
    return;
  }

  // No matching entry does NOT mean no festival occurs today.
  addMessage(
    `The festival dataset did not confirm a festival for ${formatIndiaDate(date)}. ` +
    "That does not prove that no religious, regional, or local festival is observed today. " +
    "Please verify with an official state holiday calendar or a trusted local source.",
    "assistant",
    [{
      label: "Search Indian festivals for this date",
      url: `https://www.google.com/search?q=${encodeURIComponent(
        `Indian festivals today ${date} official calendar`
      )}`
    }, {
      label: "Check Indian government holiday information",
      url: "https://www.india.gov.in/"
    }]
  );
}

// ---------- Simple instant answers ----------

function instantAnswer(question) {
  const q = question.trim().toLowerCase();

  if (/^(hi|hello|hey|hii|helo)[!. ]*$/.test(q)) {
    return `Hello! I'm ${ASWIK.name}, developed by ${ASWIK.developer}. How can I help?`;
  }

  if (/who (made|created|developed) you|who made aswik|who created aswik/i.test(q)) {
    return `I am ASWIK AI, created and developed by ${ASWIK.developer}. ⚡`;
  }

  if (/about (the )?developer|who is aswik singh/i.test(q)) {
    return `ASWIK AI was created by ${ASWIK.developer}.`;
  }

  if (/vibgyor/.test(q)) {
    return "VIBGYOR stands for Violet, Indigo, Blue, Green, Yellow, Orange and Red.";
  }

  if (/\b(time|date|day)\b/.test(q) &&
      /\b(today|now|current|india|time|date|day)\b/.test(q)) {
    return `In India, today is ${formatIndiaDate(indiaNow())}. Current time: ${
      new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      }).format(new Date())
    } IST.`;
  }

  return null;
}

// ---------- Route the question ----------

async function handleQuestion(rawQuestion) {
  const question = rawQuestion.trim();
  if (!question) return;

  addMessage(question, "user");

  const immediate = instantAnswer(question);
  if (immediate) {
    addMessage(immediate, "assistant");
    return;
  }

  const loading = showTyping();

  try {
    if (
      /\bfestival(s)?\b/i.test(question) &&
      /\b(today|now|date|india|indian|happening)\b/i.test(question)
    ) {
      await getFestivalsForToday();
      return;
    }

    if (
      /\b(latest|today|current|recent|headlines|news|what is happening|what's happening)\b/i.test(question)
    ) {
      await getLatestNews(question);
      return;
    }

    // This website does not pretend to answer arbitrary questions
    // with a language model. Open a search for other queries.
    addMessage(
      "I don't have a generative AI model connected yet, so I won't pretend I've verified an answer. " +
      "You can search the web for reliable information below.",
      "assistant",
      [{
        label: "Search the web for this question ↗",
        url: `https://www.google.com/search?q=${encodeURIComponent(question)}`
      }]
    );
  } catch (error) {
    console.error("ASWIK retrieval error:", error);

    addMessage(
      "I couldn't reach a data source just now. The service may be unavailable or blocking the request. " +
      "I won't invent an answer. Try again later or open a web search.",
      "assistant",
      [{
        label: "Search the web ↗",
        url: `https://www.google.com/search?q=${encodeURIComponent(question)}`
      }]
    );
  } finally {
    removeTyping(loading);
  }
}

// ---------- Connect the existing chat controls ----------

function submitCurrentQuestion(event) {
  if (event) event.preventDefault();
  if (!messageInput) {
    console.error("ASWIK AI: couldn't find the message input element.");
    return;
  }

  const question = messageInput.value.trim();
  if (!question) return;

  messageInput.value = "";
  handleQuestion(question);
}

if (sendButton) {
  sendButton.addEventListener("click", submitCurrentQuestion);
}

if (messageInput) {
  const form = messageInput.closest("form");

  if (form) {
    form.addEventListener("submit", submitCurrentQuestion);
  } else {
    messageInput.addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey) {
        submitCurrentQuestion(event);
      }
    });
  }
}

// ---------- Live clock, if the page has a clock element ----------

function updateIndiaClock() {
  const clock = findElement([
    "#clock", "#liveClock", "#systemTime",
    ".clock", ".system-time", "[data-clock]"
  ]);

  if (!clock) return;

  clock.textContent = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  }).format(new Date()) + " IST";
}

updateIndiaClock();
setInterval(updateIndiaClock, 1000);

console.log("ASWIK AI retrieval engine loaded.");
console.log("Developer:", ASWIK.developer);
