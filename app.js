
'use strict';

// =============================================
// ASWIK AI — ACCURATE RETRIEVAL ENGINE
// Developer: Aswik Singh
// Free online sources; no AI API key required.
// =============================================

const chat = document.getElementById('chat');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

let busy = false;

const SOURCES = {
  webSearch: 'https://api.mwmbl.org/api/v2/search/?q=',
  newsSearch: 'https://ariverofnews.com/api/v1/search.json?q=',
  festival: 'https://indian-festival-api.vercel.app/api/festivals?date=',
  wikipediaSearch: 'https://en.wikipedia.org/w/rest.php/v1/search/page?q=',
  wikipediaSummary: 'https://en.wikipedia.org/api/rest_v1/page/summary/'
};

function indiaDateParts() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const values = {};
  parts.forEach(part => values[part.type] = part.value);
  return values;
}

function indiaDateISO() {
  const p = indiaDateParts();
  return `${p.year}-${p.month}-${p.day}`;
}

function readableIndiaDate() {
  return new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// =============================================
// 1. FAST, KNOWN ANSWERS
// =============================================

function instantBrain(input) {
  const q = input.toLowerCase()
    .replace(/[?!.,]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (/^(hi|hello|hey|hii+|heyy+|namaste|good morning|good afternoon|good evening)$/.test(q)) {
    return 'Hello! ⚡ I am ASWIK AI, created by Aswik Singh. What would you like to explore?';
  }

  if (/\b(who (made|created|developed|built) (you|aswik ai)|who is your (creator|developer)|who made aswik ai|who created aswik ai)\b/.test(q)) {
    return 'I was created and developed by Aswik Singh. ⚡';
  }

  if (/^(who are you|what are you|introduce yourself|tell me about yourself)$/.test(q)) {
    return 'I am ASWIK AI, created by Aswik Singh. I can answer some common questions and retrieve online information. I am not yet a generative AI model, so complex original answers may require better sources.';
  }

  if (/^(what can you do|help|your features|what are your features)$/.test(q)) {
    return 'I can answer common questions, calculate simple arithmetic, tell you the date and time in India, retrieve reference information, search the web, look up news and check a date-specific festival calendar.';
  }

  if (/\b(vibgyor|rainbow colours?|rainbow colors?)\b/.test(q)) {
    return 'VIBGYOR stands for Violet, Indigo, Blue, Green, Yellow, Orange and Red — the seven colours traditionally listed in a rainbow. 🌈';
  }

  if (/\b(today'?s date|current date|what date is it|what day is it|date today)\b/.test(q)) {
    return 'Today in India is ' + readableIndiaDate() + '. ⚡';
  }

  if (/\b(what time is it|current time|tell me the time|what is the time|what'?s the time|time right now)\b/.test(q)) {
    return 'The current time in India is ' +
      new Date().toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) + ' IST.';
  }

  const math = q.match(
    /^(?:(?:what is|calculate|solve)\s+)?(-?\d+(?:\.\d+)?)\s*([+\-*/×÷])\s*(-?\d+(?:\.\d+)?)$/
  );

  if (math) {
    const a = Number(math[1]);
    const b = Number(math[3]);
    const op = math[2];
    let result;

    if (op === '+') result = a + b;
    else if (op === '-') result = a - b;
    else if (op === '*' || op === '×') result = a * b;
    else if (op === '/' || op === '÷') {
      if (b === 0) return 'Division by zero is undefined.';
      result = a / b;
    }

    if (Number.isFinite(result)) {
      return 'The answer is ' + Number(result.toPrecision(12)) + '. ⚡';
    }
  }

  if (/^(thanks|thank you|thx|thank you so much)$/.test(q)) {
    return 'You are welcome! ⚡';
  }

  return null;
}

// =============================================
// 2. CLOCK
// =============================================

function updateClock() {
  const clock = document.getElementById('clock');
  if (!clock) return;

  clock.textContent = new Date().toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit'
  }) + ' IST';
}

updateClock();
setInterval(updateClock, 15000);

// =============================================
// 3. SAFE CHAT DISPLAY
// =============================================

function addMessage(text, who = 'user') {
  const row = document.createElement('div');
  row.className = 'message ' + who;

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = who === 'user' ? 'Y' : 'A';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  const heading = document.createElement('strong');
  heading.textContent = who === 'user' ? 'YOU' : 'ASWIK AI';

  const paragraph = document.createElement('p');
  paragraph.textContent = text;

  bubble.append(heading, paragraph);
  row.append(avatar, bubble);

  if (chat) {
    chat.append(row);
    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  return paragraph;
}

function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function addResults(headingText, results) {
  const row = document.createElement('div');
  row.className = 'message assistant';

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = 'A';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  const heading = document.createElement('strong');
  heading.textContent = 'ASWIK AI';

  const intro = document.createElement('p');
  intro.textContent = headingText;
  bubble.append(heading, intro);

  let shown = 0;

  for (const result of results) {
    if (shown >= 5) break;

    const href = safeHttpUrl(result.url || result.link);
    const titleText = result.title || result.name;

    if (!href || !titleText) continue;

    const item = document.createElement('div');
    item.style.marginTop = '12px';

    const link = document.createElement('a');
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = titleText;
    link.style.fontWeight = 'bold';

    item.append(link);

    const sourceText = result.source || result.publisher || '';
    const dateText = result.published || result.date || result.publishedAt || '';

    if (sourceText || dateText) {
      const meta = document.createElement('p');
      meta.textContent = [sourceText, dateText].filter(Boolean).join(' · ');
      meta.style.fontSize = '0.85em';
      item.append(meta);
    }

    const snippetText = result.snippet || result.description ||
      result.summary || result.content || '';

    if (snippetText) {
      const snippet = document.createElement('p');
      snippet.textContent = snippetText;
      item.append(snippet);
    }

    bubble.append(item);
    shown++;
  }

  if (!shown) {
    const empty = document.createElement('p');
    empty.textContent = 'No usable source links were returned.';
    bubble.append(empty);
  }

  row.append(avatar, bubble);

  if (chat) {
    chat.append(row);
    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// =============================================
// 4. REQUEST HELPER WITH TIMEOUT
// =============================================

async function fetchJson(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: 'omit'
    });

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

// =============================================
// 5. GENERAL WEB SEARCH
// =============================================

async function searchWebResults(query) {
  const url = SOURCES.webSearch + encodeURIComponent(query);
  const payload = await fetchJson(url);

  const items = Array.isArray(payload)
    ? payload
    : payload.results || payload.data || payload.items || [];

  return items.map(item => ({
    title: item.title || item.name || '',
    url: item.url || item.link || '',
    snippet: item.description || item.snippet || item.summary || item.content || '',
    source: item.source || item.domain || ''
  })).filter(item => item.title && item.url);
}

function googleFallback(query) {
  return [{
    title: 'Search Google for: ' + query,
    url: 'https://www.google.com/search?q=' + encodeURIComponent(query),
    snippet: 'Open Google to check more sources.'
  }];
}

// =============================================
// 6. CURRENT NEWS SEARCH
// =============================================

function isNewsQuestion(question) {
  return /\b(news|headlines|breaking|latest|happening in the world|world today|current events|today's events|today in the world|latest updates)\b/i.test(question);
}

async function searchNews(query) {
  const url = SOURCES.newsSearch + encodeURIComponent(query) +
    '&lang=en&from=' + encodeURIComponent(isoDaysAgo(3)) +
    '&to=' + encodeURIComponent(isoTodayUTC());

  const payload = await fetchJson(url, 12000);

  const items = Array.isArray(payload)
    ? payload
    : payload.results || payload.data || payload.items || payload.articles || [];

  return items.map(item => ({
    title: item.title || item.headline || '',
    url: item.url || item.link || item.href || '',
    snippet: item.summary || item.description || item.snippet || '',
    source: item.source || item.publisher || item.publication || '',
    published: formatNewsDate(item.pa || item.ts || item.fa ||
      item.publishedAt || item.published || item.date || '')
  })).filter(item => item.title && item.url);
}

function isoTodayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function isoDaysAgo(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function formatNewsDate(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  }) + ' IST';
}

async function answerNewsQuestion(question, status) {
  status.textContent = '⚡ Checking recent news sources...';

  try {
    let results = await searchNews(question);

    if (!results.length) {
      results = await searchNews('world news latest');
    }

    if (results.length) {
      status.textContent =
        'Here are recent news results. Check the publisher and publication date before relying on a story.';
      addResults('Recent news results from a news-focused source:', results);
      return;
    }
  } catch (error) {
    console.warn('ASWIK news search:', error);
  }

  status.textContent =
    'The news source did not return usable recent articles. Trying general web search...';

  try {
    const results = await searchWebResults(question);
    if (results.length) {
      addResults('Web results for your news question. Verify publication dates:', results);
      return;
    }
  } catch (error) {
    console.warn('ASWIK web search:', error);
  }

  addResults('I could not verify current news automatically. Open a live search:', googleFallback(question));
}

// =============================================
// 7. FESTIVAL LOOKUP BY ACTUAL DATE
// =============================================

function isFestivalQuestion(question) {
  return /\b(festival|festivals|holiday|holidays|tyohar|त्योहार|त्यौहार)\b/i.test(question) &&
    /\b(today|tonight|now|current|upcoming|next|date|india|indian|aaj|आज|which|what|is|are|kaun)\b/i.test(question);
}

function getFestivalList(payload) {
  if (Array.isArray(payload)) return payload;
  return payload.data || payload.festivals || payload.results || [];
}

function getFestivalDate(item) {
  return item.date || item.date_iso || item.date_2026 ||
    item.date_2027 || item.date_2028 || '';
}

async function searchFestivalsToday() {
  const date = indiaDateISO();
  const url = SOURCES.festival + encodeURIComponent(date);
  const payload = await fetchJson(url, 12000);
  const items = getFestivalList(payload);

  // The API supports a date filter. Still validate explicit dates where available.
  return items.filter(item => {
    const itemDate = getFestivalDate(item);
    return !itemDate || itemDate === date;
  });
}

async function answerFestivalQuestion(status) {
  const today = indiaDateISO();
  const readable = readableIndiaDate();

  status.textContent = '⚡ Checking the festival calendar for ' + readable + '...';

  try {
    const festivals = await searchFestivalsToday();

    if (festivals.length) {
      const names = festivals.map(item => {
        const region = Array.isArray(item.states) &&
          !item.states.includes('all')
          ? ' — regional observance (' + item.states.join(', ') + ')'
          : '';

        return (item.name || item.local_name || 'Festival') + region +
          (item.description ? '\n' + item.description : '');
      });

      status.textContent =
        'Festival calendar entries for ' + readable + ':\n\n' +
        names.join('\n\n') +
        '\n\nSource: Indian Festival API\n' +
        'Festival dates and regional observances can differ; confirm important dates locally.';

      return;
    }
  } catch (error) {
    console.warn('ASWIK festival calendar:', error);
  }

  status.textContent =
    'The date-specific calendar did not provide a verified festival for ' +
    readable + '. I will check current web results rather than guess.';

  try {
    const results = await searchWebResults(
      'Indian festivals on ' + readable + ' India festival calendar'
    );

    if (results.length) {
      addResults(
        'Possible festival sources for ' + readable +
        '. Verify the date and your region on the linked page:',
        results
      );
      return;
    }
  } catch (error) {
    console.warn('ASWIK festival web fallback:', error);
  }

  addResults('I could not verify a festival date. Check these live results:', googleFallback(
    'Indian festivals today ' + today
  ));
}

// =============================================
// 8. WIKIPEDIA REFERENCE LOOKUP
// =============================================

async function getWikipediaAnswer(question) {
  const searchTerm = question.trim()
    .replace(/^(what is|what are|who is|who was|explain|define|tell me about|can you explain)\s+/i, '')
    .replace(/[?!.,]+$/g, '')
    .trim();

  if (!searchTerm) return null;

  const url = SOURCES.wikipediaSearch +
    encodeURIComponent(searchTerm) + '&limit=5';

  const data = await fetchJson(url);
  const pages = data.pages || [];

  if (!pages.length) return null;

  const normalise = value => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim();

  const target = normalise(searchTerm);
  const selected = pages.find(page =>
    normalise(page.title) === target ||
    normalise(page.key) === target
  ) || pages[0];

  const title = selected.key || selected.title;
  const summaryUrl = SOURCES.wikipediaSummary +
    encodeURIComponent(title.replace(/ /g, '_'));

  const article = await fetchJson(summaryUrl);

  if (!article.extract ||
      article.type === 'disambiguation' ||
      article.type === 'not_found') {
    return null;
  }

  return {
    text: article.extract,
    title: article.title,
    url: article.content_urls?.desktop?.page ||
      'https://en.wikipedia.org/wiki/' +
      encodeURIComponent(title.replace(/ /g, '_'))
  };
}

// =============================================
// 9. MAIN MESSAGE ROUTER
// =============================================

async function sendMessage() {
  const value = messageInput ? messageInput.value.trim() : '';
  if (!value || busy) return;

  addMessage(value, 'user');
  if (messageInput) messageInput.value = '';

  busy = true;
  const status = addMessage('⚡ ASWIK is checking your question...', 'assistant');

  try {
    const instant = instantBrain(value);

    if (instant !== null) {
      status.textContent = instant;
      return;
    }

    if (isFestivalQuestion(value)) {
      await answerFestivalQuestion(status);
      return;
    }

    if (isNewsQuestion(value)) {
      await answerNewsQuestion(value, status);
      return;
    }

    status.textContent = '⚡ Searching relevant web sources...';

    try {
      const results = await searchWebResults(value);

      if (results.length) {
        status.textContent =
          'I found these web sources. Check the links to confirm the answer.';
        addResults('Search results for your question:', results);
        return;
      }
    } catch (error) {
      console.warn('ASWIK general search:', error);
    }

    status.textContent = '⚡ Checking Wikipedia for a reference answer...';

    try {
      const article = await getWikipediaAnswer(value);

      if (article) {
        status.textContent = article.text +
          '\n\nSource: Wikipedia — ' + article.title +
          '\n' + article.url;
        return;
      }
    } catch (error) {
      console.warn('ASWIK Wikipedia lookup:', error);
    }

    status.textContent =
      'I could not find a suitable answer from the sources available right now.';

    addResults('Try a broader live search:', googleFallback(value));
  } catch (error) {
    console.error('ASWIK AI error:', error);
    status.textContent =
      'An online source failed. Please check your connection and try again.';
  } finally {
    busy = false;
  }
}

// =============================================
// 10. LIVE SEARCH FORM
// =============================================

async function runSearchForm(query) {
  const q = query.trim();
  if (!q || busy) return;

  if (messageInput) messageInput.value = q;
  await sendMessage();
}

if (searchForm) {
  searchForm.addEventListener('submit', async event => {
    event.preventDefault();
    const query = searchInput ? searchInput.value : '';
    if (searchInput) searchInput.value = '';
    await runSearchForm(query);
  });
}

document.querySelectorAll('[data-query]').forEach(button => {
  button.addEventListener('click', () => {
    runSearchForm(button.dataset.query || '');
  });
});

if (sendBtn) sendBtn.addEventListener('click', sendMessage);

if (messageInput) {
  messageInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });
}

// =============================================
// 11. ABOUT DEVELOPER
// =============================================

const aboutDialog = document.getElementById('aboutDialog');
const aboutBtn = document.getElementById('aboutBtn');
const closeAbout = document.getElementById('closeAbout');

if (aboutDialog && aboutBtn) {
  aboutBtn.addEventListener('click', () => aboutDialog.showModal());
}

if (aboutDialog && closeAbout) {
  closeAbout.addEventListener('click', () => aboutDialog.close());
}

// =============================================
// 12. SERVICE WORKER
// =============================================

if ('serviceWorker' in navigator &&
    location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(error => {
      console.warn('Service worker registration failed:', error);
    });
  });
}
