
"use strict";

/* ==========================================
   ASWIK AI
   Developed by Aswik Singh
   Free information assistant — no API key
   Wikipedia + RSS News + Web Search
   ========================================== */

const CONFIG = {
  requestTimeout: 15000,
  newsProxy: "https://proxy.cors.dev/",
  wikipediaAPI: "https://en.wikipedia.org/w/rest.php/v1",
  wikipediaSummary: "https://en.wikipedia.org/api/rest_v1/page/summary/",
  newsFeeds: {
    india: [
      {
        name: "BBC India",
        url: "https://feeds.bbci.co.uk/news/world/asia/india/rss.xml"
      },
      {
        name: "BBC World",
        url: "https://feeds.bbci.co.uk/news/world/rss.xml"
      },
      {
        name: "Times of India",
        url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms"
      }
    ],
    world: [
      {
        name: "BBC World",
        url: "https://feeds.bbci.co.uk/news/world/rss.xml"
      },
      {
        name: "Al Jazeera",
        url: "https://www.aljazeera.com/xml/rss/all.xml"
      }
    ],
    technology: [
      {
        name: "BBC Technology",
        url: "https://feeds.bbci.co.uk/news/technology/rss.xml"
      },
      {
        name: "The Verge",
        url: "https://www.theverge.com/rss/index.xml"
      }
    ]
  }
};

const $ = (selector) => document.querySelector(selector);

const chat = $("#chat");
const messageInput = $("#messageInput");
const sendBtn = $("#sendBtn");
const searchForm = $("#searchForm");
const searchInput = $("#searchInput");
const aboutBtn = $("#aboutBtn");
const aboutDialog = $("#aboutDialog");
const closeAbout = $("#closeAbout");

let busy = false;

/* ---------- Safe chat UI ---------- */

function addMessage(role, text, links = []) {
  if (!chat) return;

  const message = document.createElement("div");
  message.className =
    `message ${role === "user" ? "user" : "assistant"}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "YOU" : "A";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const content = document.createElement("p");
  content.textContent = String(text || "");
  bubble.appendChild(content);

  if (Array.isArray(links) && links.length) {
    const linkList = document.createElement("div");
    linkList.className = "message-links";

    links.forEach((item) => {
      if (!item?.url || !item?.label) return;

      try {
        const url = new URL(item.url);

        if (!["https:", "http:"].includes(url.protocol)) return;

        const link = document.createElement("a");
        link.href = url.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = item.label;

        linkList.appendChild(link);
      } catch {
        // Ignore invalid URLs.
      }
    });

    if (linkList.childElementCount) {
      bubble.appendChild(linkList);
    }
  }

  message.append(avatar, bubble);
  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;

  return message;
}

function showTyping() {
  if (!chat) return null;

  const message = document.createElement("div");
  message.className = "message assistant typing-message";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "A";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = "ASWIK is searching and processing...";

  message.append(avatar, bubble);
  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;

  return message;
}

/* ---------- Network helpers ---------- */

async function fetchResponse(url, timeout = CONFIG.requestTimeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      credentials: "omit"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJSON(url) {
  const response = await fetchResponse(url);
  return response.json();
}

async function fetchText(url) {
  const response = await fetchResponse(url);
  return response.text();
}

/* ---------- India date and clock ---------- */

function formatIndiaDate() {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());
}

function getIndiaDateParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const result = {};

  parts.forEach((part) => {
    if (part.type !== "literal") result[part.type] = part.value;
  });

  return result;
}

function updateClock() {
  const clock = $("#clock");
  if (!clock) return;

  clock.textContent = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  }).format(new Date());
}

updateClock();
setInterval(updateClock, 1000);

/* ---------- Search links ---------- */

function googleSearch(query) {
  return "https://www.google.com/search?q=" +
    encodeURIComponent(query);
}

function searchLink(query, label = "Search the web") {
  return [{ label, url: googleSearch(query) }];
}

/* ---------- Wikipedia information engine ---------- */

function cleanText(text) {
  return String(text || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wikipediaArticleURL(title) {
  return "https://en.wikipedia.org/wiki/" +
    encodeURIComponent(String(title || "").replace(/ /g, "_"));
}

async function searchWikipedia(query, limit = 5) {
  const url = new URL(
    `${CONFIG.wikipediaAPI}/search/page`
  );

  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));

  const data = await fetchJSON(url.href);
  return Array.isArray(data.pages) ? data.pages : [];
}

async function getWikipediaSummary(title) {
  const url = CONFIG.wikipediaSummary +
    encodeURIComponent(String(title).replace(/ /g, "_"));

  return fetchJSON(url);
}

async function answerFromWikipedia(question) {
  const pages = await searchWikipedia(question, 5);

  if (!pages.length) return false;

  // Prefer the first matching search result.
  const best = pages[0];
  const title = best.title || best.key;

  let summary;

  try {
    summary = await getWikipediaSummary(title);
  } catch {
    // Use search-result description if the summary endpoint fails.
    summary = null;
  }

  const description = cleanText(
    summary?.extract ||
    best.description ||
    best.excerpt
  );

  const articleTitle = summary?.title || title;
  const articleURL = summary?.content_urls?.desktop?.page ||
    wikipediaArticleURL(title);

  if (!description) {
    addMessage(
      "assistant",
      `I found a Wikipedia article about ${articleTitle}, but couldn't retrieve its summary. Open the article to read more.`,
      [{ label: "Read on Wikipedia", url: articleURL }]
    );

    return true;
  }

  addMessage(
    "assistant",
    `${articleTitle}\n\n${description}\n\nThis summary is from Wikipedia. Open the article for more details.`,
    [
      { label: "Read full Wikipedia article", url: articleURL },
      {
        label: "Find more web sources",
        url: googleSearch(question)
      }
    ]
  );

  // Show other relevant results too.
  const otherPages = pages.slice(1, 4).map((page) => ({
    label: page.title || page.key,
    url: wikipediaArticleURL(page.title || page.key)
  }));

  if (otherPages.length) {
    addMessage("assistant", "Related information:", otherPages);
  }

  return true;
}

/* ---------- News retrieval ---------- */

function chooseNewsFeeds(question) {
  const q = question.toLowerCase();

  if (
    q.includes("technology") ||
    q.includes("technology news") ||
    q.includes("gadgets") ||
    q.includes("artificial intelligence") ||
    q.includes("tech news")
  ) {
    return CONFIG.newsFeeds.technology;
  }

  if (
    q.includes("world news") ||
    q.includes("international") ||
    q.includes("global news")
  ) {
    return CONFIG.newsFeeds.world;
  }

  return CONFIG.newsFeeds.india;
}

function parseRSS(xmlText, defaultSource, limit = 8) {
  const xml = new DOMParser().parseFromString(
    xmlText,
    "application/xml"
  );

  if (xml.querySelector("parsererror")) {
    throw new Error("Invalid RSS feed.");
  }

  return Array.from(xml.querySelectorAll("item, entry"))
    .map((item) => {
      const read = (selector) =>
        item.querySelector(selector)?.textContent?.trim() || "";

      const linkNode =
        item.querySelector('link[rel="alternate"]') ||
        item.querySelector("link");

      const link =
        linkNode?.getAttribute("href") ||
        linkNode?.textContent?.trim() ||
        "";

      return {
        title: read("title"),
        link,
        date: read("pubDate") || read("published") || read("updated"),
        source: read("source") || defaultSource,
        summary: read("description") || read("summary")
      };
    })
    .filter((item) => {
      try {
        return item.title &&
          ["https:", "http:"].includes(new URL(item.link).protocol);
      } catch {
        return false;
      }
    })
    .slice(0, limit);
}

async function fetchNewsFeed(feed) {
  // Public proxy allows browser access to RSS feeds that block CORS.
  const proxyURL = CONFIG.newsProxy + feed.url;

  const xml = await fetchText(proxyURL);

  return parseRSS(xml, feed.name, 8);
}

async function getNews(question) {
  const feeds = chooseNewsFeeds(question);

  // Try all feeds together; retain results from whichever succeed.
  const results = await Promise.allSettled(
    feeds.map(fetchNewsFeed)
  );

  let headlines = [];

  results.forEach((result) => {
    if (result.status === "fulfilled") {
      headlines.push(...result.value);
    } else {
      console.warn("A news source failed:", result.reason);
    }
  });

  // Remove duplicate links and titles.
  const seen = new Set();

  headlines = headlines.filter((item) => {
    const key = item.link || item.title;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });

  if (!headlines.length) {
    addMessage(
      "assistant",
      "I couldn't load the news feeds right now. The public feed service or a news source may be temporarily unavailable. You can still search current headlines."
    );

    addMessage("assistant", "Open current news:", [
      {
        label: "Google News — India",
        url: "https://news.google.com/?hl=en-IN&gl=IN&ceid=IN:en"
      },
      {
        label: "Hindustan Times",
        url: "https://www.hindustantimes.com/india-news"
      },
      {
        label: "Times of India",
        url: "https://timesofindia.indiatimes.com/india"
      }
    ]);

    return;
  }

  // Newest first when publication dates are available.
  headlines.sort((a, b) => {
    const dateA = Date.parse(a.date) || 0;
    const dateB = Date.parse(b.date) || 0;
    return dateB - dateA;
  });

  addMessage(
    "assistant",
    `Here are the latest headlines I could retrieve (${formatIndiaDate()}). These are live feed results, not AI-verified reports.`
  );

  headlines.slice(0, 10).forEach((item, index) => {
    let details = `${index + 1}. ${item.title}`;

    if (item.source) details += `\nSource: ${item.source}`;

    if (item.date) {
      const date = new Date(item.date);

      if (!Number.isNaN(date.getTime())) {
        details += "\nPublished: " +
          new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            dateStyle: "medium",
            timeStyle: "short"
          }).format(date) + " IST";
      }
    }

    const links = [
      { label: "Read original report", url: item.link }
    ];

    addMessage("assistant", details, links);
  });

  addMessage(
    "assistant",
    "For developing stories, open the original report and check its publication time. News feeds may not include the full article."
  );
}

/* ---------- Festivals and holiday information ---------- */

async function getFestivalInformation(question) {
  const q = question.toLowerCase();
  const parts = getIndiaDateParts();
  const year = Number(parts.year);

  const asksDiwali =
    q.includes("diwali") ||
    q.includes("deepavali");

  const asksHoli = q.includes("holi");
  const asksChristmas = q.includes("christmas");
  const asksEid = q.includes("eid");
  const asksDate =
    q.includes("when") ||
    q.includes("date") ||
    q.includes("this year") ||
    q.includes("which day");

  if (asksDiwali || asksHoli || asksChristmas || asksEid) {
    const festival = asksDiwali
      ? "Diwali"
      : asksHoli
      ? "Holi"
      : asksChristmas
      ? "Christmas"
      : "Eid";

    // Use live search results for dates that depend on the lunar calendar.
    const query =
      `${festival} date ${year} India official calendar`;

    addMessage(
      "assistant",
      `I'll check current sources for ${festival} in ${year}. Lunar-calendar festivals can vary by regional calendar and observance.`
    );

    try {
      const pages = await searchWikipedia(query, 3);

      const links = [
        {
          label: "Search current festival dates",
          url: googleSearch(query)
        },
        {
          label: "Drik Panchang festival calendar",
          url: "https://www.drikpanchang.com/"
        },
        {
          label: "Government of India",
          url: "https://www.india.gov.in/"
        }
      ];

      if (pages.length) {
        const title = pages[0].title || pages[0].key;

        links.unshift({
          label: `Wikipedia: ${title}`,
          url: wikipediaArticleURL(title)
        });
      }

      addMessage(
        "assistant",
        `I found the topic, but I don't have a verified festival-calendar date from this lookup alone. Please check a current calendar before relying on the date.`,
        links
      );
    } catch {
      addMessage(
        "assistant",
        `I couldn't verify the ${festival} date for ${year} automatically. I won't guess a date.`,
        [
          {
            label: "Search festival date",
            url: googleSearch(query)
          },
          {
            label: "Drik Panchang",
            url: "https://www.drikpanchang.com/"
          }
        ]
      );
    }

    return;
  }

  addMessage(
    "assistant",
    `Today is ${formatIndiaDate()}. I couldn't verify today's festival from a live calendar, so I won't guess.`
  );

  addMessage("assistant", "Check a current calendar:", [
    {
      label: "Indian festivals today",
      url: googleSearch(
        `Indian festivals today ${formatIndiaDate()}`
      )
    },
    {
      label: "Drik Panchang",
      url: "https://www.drikpanchang.com/"
    }
  ]);
}

/* ---------- Instant answers ---------- */

function getInstantAnswer(question) {
  const q = question.toLowerCase().trim();

  if (/^(hi|hello|hey|hii|hiii|namaste|namaskar)[!. ]*$/.test(q)) {
    return {
      text: "Hello! ⚡ I'm ASWIK AI, your personal digital assistant. What shall we explore today?"
    };
  }

  if (
    q.includes("who made you") ||
    q.includes("who created you") ||
    q.includes("who developed you") ||
    q.includes("your developer") ||
    q.includes("about developer")
  ) {
    return {
      text: "I am ASWIK AI, created and developed by Aswik Singh. ⚡"
    };
  }

  if (
    q.includes("what is your name") ||
    q.includes("who are you")
  ) {
    return {
      text: "I'm ASWIK AI — a web-based assistant developed by Aswik Singh."
    };
  }

  if (
    q.includes("today's date") ||
    q.includes("todays date") ||
    q === "date" ||
    q.includes("what date is it") ||
    q.includes("current date")
  ) {
    return {
      text: `Today's date in India is ${formatIndiaDate()}.`
    };
  }

  if (
    q.includes("current time") ||
    q.includes("what time is it") ||
    q === "time"
  ) {
    return {
      text: `The current time in India is ${new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      }).format(new Date())}.`
    };
  }

  if (q.includes("vibgyor") || q.includes("colours of rainbow") ||
      q.includes("colors of rainbow")) {
    return {
      text: "VIBGYOR stands for Violet, Indigo, Blue, Green, Yellow, Orange and Red."
    };
  }

  if (
    q.includes("what can you do") ||
    q.includes("your features") ||
    q.includes("help me")
  ) {
    return {
      text: "I can retrieve Wikipedia summaries, search related articles, retrieve news headlines from RSS feeds, show the current Indian date and time, and open web searches. I'm still a retrieval-based assistant; a generative AI model has not been connected yet."
    };
  }

  return null;
}

/* ---------- Question router ---------- */

async function handleQuestion(question) {
  const q = question.toLowerCase().trim();

  // Handle greetings, identity, clock and other exact answers first.
  const instant = getInstantAnswer(question);

  if (instant) {
    addMessage("assistant", instant.text);
    return;
  }

  // News requests.
  if (
    /\b(news|headlines|breaking news|latest updates)\b/.test(q)
  ) {
    await getNews(question);
    return;
  }

  // Festival requests should not be answered with an unrelated article.
  if (
    /\b(festival|festivals|diwali|deepavali|holi|eid|christmas)\b/.test(q) ||
    q.includes("holiday today") ||
    q.includes("which festival") ||
    q.includes("festival date")
  ) {
    await getFestivalInformation(question);
    return;
  }

  // For all other questions, retrieve information from Wikipedia.
  try {
    const found = await answerFromWikipedia(question);

    if (found) return;
  } catch (error) {
    console.warn("Wikipedia lookup failed:", error);
  }

  // If Wikipedia fails, still attempt a general web search.
  addMessage(
    "assistant",
    "I couldn't retrieve a suitable Wikipedia summary for that question. You can search the web for more information."
  );

  addMessage("assistant", "Explore other sources:", [
    {
      label: "Search Google",
      url: googleSearch(question)
    },
    {
      label: "Search Wikipedia",
      url: "https://en.wikipedia.org/w/index.php?search=" +
        encodeURIComponent(question)
    }
  ]);
}

/* ---------- Send and process ---------- */

async function sendQuestion(rawQuestion) {
  const question = String(rawQuestion || "").trim();

  if (!question || busy) return;

  busy = true;

  if (messageInput) messageInput.value = "";
  if (sendBtn) sendBtn.disabled = true;

  addMessage("user", question);

  const typing = showTyping();

  try {
    await handleQuestion(question);
  } catch (error) {
    console.error("ASWIK AI error:", error);

    addMessage(
      "assistant",
      "Something went wrong while retrieving information. Please check your internet connection and try again."
    );

    addMessage("assistant", "Try searching directly:", [
      { label: "Search your question", url: googleSearch(question) }
    ]);
  } finally {
    if (typing) typing.remove();

    busy = false;

    if (sendBtn) sendBtn.disabled = false;
    if (messageInput) messageInput.focus();
  }
}

if (sendBtn) {
  sendBtn.addEventListener("click", () => {
    sendQuestion(messageInput?.value || "");
  });
}

if (messageInput) {
  messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendQuestion(messageInput.value);
    }
  });
}

/* ---------- Search form ---------- */

if (searchForm) {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const query = searchInput?.value.trim();
    if (!query) return;

    window.open(
      googleSearch(query),
      "_blank",
      "noopener,noreferrer"
    );
  });
}

/* ---------- Quick-search buttons ---------- */

document.querySelectorAll("[data-search]").forEach((button) => {
  button.addEventListener("click", () => {
    const query = button.getAttribute("data-search") || "";
    sendQuestion(query);
  });
});

/* ---------- About Developer dialog ---------- */

if (aboutBtn && aboutDialog) {
  aboutBtn.addEventListener("click", () => {
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

if (aboutDialog) {
  aboutDialog.addEventListener("click", (event) => {
    if (event.target === aboutDialog) {
      if (typeof aboutDialog.close === "function") {
        aboutDialog.close();
      } else {
        aboutDialog.removeAttribute("open");
      }
    }
  });
}

console.info(
  "ASWIK AI initialized — Developed by Aswik Singh."
);
