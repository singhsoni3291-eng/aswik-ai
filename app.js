
"use strict";

/* ==========================================
   ASWIK AI
   Developed by Aswik Singh
   Free web-based assistant — no API key
   ========================================== */

const CONFIG = {
  festivalAPI: "https://indian-festival-api.vercel.app/api/festivals",
  requestTimeout: 12000
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

/* ---------- Chat messages ---------- */

function addMessage(role, text, links = []) {
  if (!chat) return;

  const message = document.createElement("div");
  message.className = `message ${role === "user" ? "user" : "assistant"}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "YOU" : "A";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const content = document.createElement("p");
  content.textContent = text;
  bubble.appendChild(content);

  if (Array.isArray(links) && links.length) {
    const linkList = document.createElement("div");
    linkList.className = "message-links";

    links.forEach((item) => {
      if (!item || !item.url || !item.label) return;

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
  bubble.textContent = "ASWIK is processing";

  message.append(avatar, bubble);
  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;

  return message;
}

/* ---------- Network helper ---------- */

async function fetchJSON(url) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    CONFIG.requestTimeout
  );

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    CONFIG.requestTimeout
  );

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

/* ---------- Date and live clock ---------- */

function getIndiaDate() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
}

function formatIndiaDate() {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());
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

/* ---------- Web search links ---------- */

function googleSearch(query) {
  return "https://www.google.com/search?q=" + encodeURIComponent(query);
}

function searchLink(query, label = "Search the web") {
  return [{ label, url: googleSearch(query) }];
}

/* ---------- News ---------- */

function getNewsFeeds(query) {
  const q = query.toLowerCase();

  if (q.includes("technology") || q.includes("tech")) {
    return [
      {
        label: "Technology news",
        url: "https://news.google.com/rss/search?q=technology+India&hl=en-IN&gl=IN&ceid=IN:en"
      },
      {
        label: "Latest tech headlines",
        url: "https://news.google.com/rss/search?q=technology&hl=en-IN&gl=IN&ceid=IN:en"
      }
    ];
  }

  if (
    q.includes("world") ||
    q.includes("international") ||
    q.includes("global")
  ) {
    return [
      {
        label: "World news",
        url: "https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-IN&gl=IN&ceid=IN:en"
      }
    ];
  }

  return [
    {
      label: "India news",
      url: "https://news.google.com/rss/search?q=India&hl=en-IN&gl=IN&ceid=IN:en"
    },
    {
      label: "Latest Indian headlines",
      url: "https://news.google.com/rss/search?q=India+latest+news&hl=en-IN&gl=IN&ceid=IN:en"
    }
  ];
}

function parseRSS(xmlText, limit = 6) {
  const xml = new DOMParser().parseFromString(xmlText, "text/xml");

  if (xml.querySelector("parsererror")) {
    throw new Error("Could not read the news feed.");
  }

  return Array.from(xml.querySelectorAll("item"))
    .slice(0, limit)
    .map((item) => ({
      title: item.querySelector("title")?.textContent?.trim() || "",
      link: item.querySelector("link")?.textContent?.trim() || "",
      pubDate: item.querySelector("pubDate")?.textContent?.trim() || "",
      source: item.querySelector("source")?.textContent?.trim() || ""
    }))
    .filter((item) => item.title && item.link);
}

async function getNews(query) {
  const feeds = getNewsFeeds(query);
  let headlines = [];

  for (const feed of feeds) {
    try {
      const xmlText = await fetchText(feed.url);
      headlines = parseRSS(xmlText, 6);

      if (headlines.length) break;
    } catch (error) {
      console.warn("News feed unavailable:", error.message);
    }
  }

  if (!headlines.length) {
    addMessage(
      "assistant",
      "I couldn't retrieve live headlines right now. You can still open a live news search."
    );
    addMessage("assistant", "Open the latest news:", [
      {
        label: "Google News — India",
        url: "https://news.google.com/?hl=en-IN&gl=IN&ceid=IN:en"
      },
      {
        label: "Search Indian news",
        url: googleSearch("latest India news today")
      }
    ]);
    return;
  }

  addMessage(
    "assistant",
    `Here are the latest headlines I retrieved on ${formatIndiaDate()}.`
  );

  headlines.forEach((item, index) => {
    let details = `${index + 1}. ${item.title}`;

    if (item.source) details += ` — ${item.source}`;

    if (item.pubDate) {
      const date = new Date(item.pubDate);
      if (!Number.isNaN(date.getTime())) {
        details += ` (${date.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          dateStyle: "medium",
          timeStyle: "short"
        })} IST)`;
      }
    }

    addMessage("assistant", details, [
      { label: "Read article", url: item.link }
    ]);
  });

  addMessage(
    "assistant",
    "Headlines can change throughout the day. Open an article to verify its details."
  );
}

/* ---------- Indian festivals ---------- */

async function getFestivals() {
  try {
    const data = await fetchJSON(CONFIG.festivalAPI);
    const today = formatIndiaDate();

    addMessage(
      "assistant",
      `Today is ${today}. I received festival data, but the API's date format must be checked before I can confidently confirm which festival falls today.`
    );

    addMessage("assistant", "Check these festival calendars:", [
      {
        label: "Google — Indian festivals today",
        url: googleSearch("Indian festivals today date")
      },
      {
        label: "Drik Panchang",
        url: "https://www.drikpanchang.com/"
      },
      {
        label: "Government of India",
        url: "https://www.india.gov.in/"
      }
    ]);

    // Keep the API response available for future improvements.
    console.info("Festival API response received:", data);
  } catch (error) {
    addMessage(
      "assistant",
      `Today is ${formatIndiaDate()}. I couldn't verify the festival calendar automatically, so I won't guess.`
    );

    addMessage("assistant", "Check a current calendar:", [
      {
        label: "Indian festivals today",
        url: googleSearch("Indian festivals today date India")
      },
      {
        label: "Drik Panchang",
        url: "https://www.drikpanchang.com/"
      }
    ]);
  }
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
      text: "I'm ASWIK AI — a web-based assistant project developed by Aswik Singh."
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

  if (
    q.includes("vibgyor") ||
    q.includes("colours of rainbow") ||
    q.includes("colors of rainbow")
  ) {
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
      text: "I can show the date and time, retrieve news when the feed is available, help you search the web, and provide basic built-in answers. A generative AI brain has not been connected yet."
    };
  }

  return null;
}

/* ---------- Question routing ---------- */

async function handleQuestion(question) {
  const q = question.toLowerCase();

  const instant = getInstantAnswer(question);
  if (instant) {
    addMessage("assistant", instant.text);
    return;
  }

  if (
    q.includes("festival") ||
    q.includes("festivals") ||
    q.includes("holiday today") ||
    q.includes("which festival") ||
    q.includes("festive")
  ) {
    await getFestivals();
    return;
  }

  if (
    q.includes("news") ||
    q.includes("headlines") ||
    q.includes("breaking news")
  ) {
    await getNews(question);
    return;
  }

  addMessage(
    "assistant",
    "I'm still developing my AI brain. I can search the web for this question, but I can't yet generate a full AI answer by myself."
  );

  addMessage("assistant", "Try a web search:", [
    { label: "Search your question", url: googleSearch(question) }
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
      "Something went wrong while processing that request. Please try again or use the web-search option."
    );
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

    window.open(googleSearch(query), "_blank", "noopener,noreferrer");
  });
}

/* ---------- Quick-search buttons ---------- */

document.querySelectorAll("[data-search]").forEach((button) => {
  button.addEventListener("click", () => {
    const query = button.getAttribute("data-search") || "";
    if (messageInput) {
      messageInput.value = query;
      sendQuestion(query);
    } else {
      sendQuestion(query);
    }
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

console.info("ASWIK AI initialized — Developed by Aswik Singh.");
