
'use strict';

// =============================================
// ASWIK AI — BRAIN LITE + LIVE WEB SEARCH
// Developer: Aswik Singh
// Free sources: Mwmbl, Wikipedia, Indian Festival API
// =============================================

const chat = document.getElementById('chat');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

let busy = false;

// =============================================
// 1. INSTANT BRAIN
// =============================================

function instantBrain(input) {
  const q = input.trim().toLowerCase()
    .replace(/\bthedate\b/g, 'the date')
    .replace(/[?!.,]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (/^(hi|hello|hey|hii+|heyy+|namaste|good morning|good afternoon|good evening)(\s+(there|from my pc|from my phone))?$/.test(q)) {
    return 'Hello! ⚡ I am ASWIK AI, created by Aswik Singh. What shall we explore today?';
  }

  if (/\b(who (made|created|developed|built) (you|aswik ai)|who is your (creator|developer)|who made aswik ai|who created aswik ai)\b/.test(q)) {
    return 'I was created and developed by Aswik Singh. ⚡ Welcome to ASWIK AI!';
  }

  if (/^(who are you|what are you|introduce yourself|tell me about yourself)$/.test(q)) {
    return 'I am ASWIK AI, a personal assistant created by Aswik Singh. I can answer quick questions and search online sources for information.';
  }

  if (/^(what can you do|help|your features|what are your features)$/.test(q)) {
    return 'I can answer common questions, calculate arithmetic, tell you the current date and time, search the web, retrieve Wikipedia information, and check a date-specific Indian festival source. I am still developing my generative reasoning abilities.';
  }

  // VIBGYOR / rainbow colours
  if (/\b(vibgyor|rainbow colours?|rainbow colors?)\b/.test(q) &&
      /\b(what|meaning|means|stand for|colours?|colors?|rainbow|explain|full form|is|are)\b/.test(q)) {
    return 'VIBGYOR is a mnemonic for the seven colours traditionally listed in a rainbow: Violet, Indigo, Blue, Green, Yellow, Orange and Red. 🌈';
  }

  if (/^(what is )?vibgyor$/.test(q)) {
    return 'VIBGYOR stands for Violet, Indigo, Blue, Green, Yellow, Orange and Red — the seven colours traditionally listed in a rainbow. 🌈';
  }

  // Current date in India
  if (/\b(today'?s date|current date|what date is it|what day is it|date today)\b/.test(q)) {
    return 'Today in India is ' + getIndiaDate().toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) + '. ⚡';
  }

  if (/\b(what time is it|current time|tell me the time|what is the time|what'?s the time|time right now)\b/.test(q)) {
    return 'The current time in India is ' +
      new Date().toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) + ' IST. ⚡';
  }

  const mathText = q.match(
    /^(?:(?:what is|calculate|solve)\s+)?(-?\d+(?:\.\d+)?)\s*([+\-*/×÷])\s*(-?\d+(?:\.\d+)?)$/
  );

  if (mathText) {
    const a = Number(mathText[1]);
    const b = Number(mathText[3]);
    const op = mathText[2];
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
    return 'You are welcome! ⚡ I am always ready to help.';
  }

  return null;
}

// =============================================
// 2. INDIA DATE AND LIVE CLOCK
// =============================================

function getIndiaDate() {
  // Create a date representing the current date in India.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const values = {};
  for (const part of parts) {
    values[part.type] = part.value;
  }

  return new Date(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    12, 0, 0
  );
}

function getIndiaDateString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

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
// 3. CHAT DISPLAY
// =============================================

function addMessage(text, who = 'user') {
  const row = document.createElement('div');
  row.className = 'message ' + who;

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = who === 'user' ? 'Y' : 'A';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  const title = document.createElement('strong');
  title.textContent = who === 'user' ? 'YOU' : 'ASWIK AI';

  const p = document.createElement('p');
  p.textContent = text;

  bubble.append(title, p);
  row.append(avatar, bubble);

  if (chat) {
    chat.append(row);
    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  return p;
}

// Safely display clickable web results inside the chat.
function addSearchResults(titleText, results) {
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
  intro.textContent = titleText;

  bubble.append(heading, intro);

  for (const result of results.slice(0, 5)) {
    if (!result.title || !result.url) continue;

    let safeUrl;
    try {
      safeUrl = new URL(result.url);
      if (!['https:', 'http:'].includes(safeUrl.protocol)) continue;
    } catch {
      continue;
    }

    const item = document.createElement('div');
    item.style.marginTop = '12px';

    const link = document.createElement('a');
    link.href = safeUrl.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = result.title;
    link.style.fontWeight = 'bold';

    const snippet = document.createElement('p');
    snippet.textContent = result.snippet || 'Open this source to read more.';
    snippet.style.marginTop = '4px';

    item.append(link, snippet);
    bubble.append(item);
  }

  row.append(avatar, bubble);

  if (chat) {
    chat.append(row);
    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// =============================================
// 4. LIVE WEB SEARCH — MWMBL
// =============================================

async function getWebResults(query) {
  const url =
    'https://api.mwmbl.org/api/v2/search/?q=' +
    encodeURIComponent(query);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Web search service returned ' + response.status);
  }

  const payload = await response.json();

  // Accept common response shapes so the UI can handle API changes.
  const rawResults = Array.isArray(payload)
    ? payload
    : (payload.results || payload.data || payload.items || []);

  return rawResults.map(item => ({
    title: item.title || item.name || '',
    url: item.url || item.link || '',
    snippet: item.description || item.snippet ||
      item.summary || item.content || ''
  })).filter(item => item.title && item.url);
}

function googleSearchUrl(query) {
  return 'https://www.google.com/search?q=' + encodeURIComponent(query);
}

async function searchWeb(query, showUserMessage = true) {
  const q = query.trim();
  if (!q) return;

  if (showUserMessage) addMessage(q, 'user');

  const status = addMessage('⚡ Searching the web...', 'assistant');

  try {
    const results = await getWebResults(q);

    if (results.length) {
      status.textContent = 'Found web results for: ' + q;
      addSearchResults('Here are relevant web results. Open a source to read the full page.', results);
    } else {
      status.textContent = 'The search service returned no usable results.';
    }

    // Keep Google available as a fallback.
    addSearchResults('Need more results? Try Google Search:', [{
      title: 'Search Google for: ' + q,
      url: googleSearchUrl(q),
      snippet: 'Opens Google in a new tab.'
    }]);
  } catch (error) {
    console.warn('ASWIK web search error:', error);

    status.textContent =
      'The live search service is unavailable right now. You can still search Google below.';

    addSearchResults('Fallback web search:', [{
      title: 'Search Google for: ' + q,
      url: googleSearchUrl(q),
      snippet: 'Open Google to see more search results.'
    }]);
  }
}

if (searchForm) {
  searchForm.addEventListener('submit', event => {
    event.preventDefault();
    searchWeb(searchInput ? searchInput.value : '');
    if (searchInput) searchInput.value = '';
  });
}

document.querySelectorAll('[data-query]').forEach(button => {
  button.addEventListener('click', () => {
    searchWeb(button.dataset.query || '');
  });
});

// =============================================
// 5. DATE-SPECIFIC INDIAN FESTIVAL LOOKUP
// =============================================

function isFestivalQuestion(question) {
  return /\b(festival|festivals|holiday|holidays|celebration|celebrations|tyohar|त्योहार|त्यौहार)\b/i.test(question) &&
    /\b(today|tonight|now|current|upcoming|next|date|india|indian|aaj|आज|kaun|which|what|is|are)\b/i.test(question);
}

async function getFestivalsForToday() {
  const date = getIndiaDateString();
  const url =
    'https://indian-festival-api.vercel.app/api/festivals?date=' +
    encodeURIComponent(date);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Festival source returned ' + response.status);
  }

  const payload = await response.json();
  const items = Array.isArray(payload)
    ? payload
    : (payload.data || payload.festivals || payload.results || []);

  // Only accept entries explicitly matching the date requested.
  const matches = items.filter(item => {
    const listedDate = item.date || item.date_2026 || item.date_iso;
    return listedDate === date;
  });

  return { date, matches };
}

async function answerFestivalQuestion() {
  const status = addMessage(
    '⚡ Checking the festival calendar for today in India...',
    'assistant'
  );

  try {
    const result = await getFestivalsForToday();
    const readableDate = getIndiaDate().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    if (result.matches.length) {
      const names = result.matches.map(item => {
        const description = item.description ? ' — ' + item.description : '';
        const region = Array.isArray(item.states) &&
          !item.states.includes('all')
          ? ' (regional)'
          : '';
        return (item.name || 'Festival') + region + description;
      });

      status.textContent =
        'Festival calendar entries for ' + readableDate + ':\n\n' +
        names.join('\n\n') +
        '\n\nSource: Indian Festival API\n' +
        'Please verify regional observances with a local calendar.';
      return;
    }

    status.textContent =
      'The festival calendar did not return a verified entry for ' +
      readableDate + '. That does NOT prove there are no festivals today. ' +
      'I will search the web for additional information.';

    const results = await getWebResults(
      'Indian festivals today ' + readableDate + ' India festival calendar'
    );

    if (results.length) {
      addSearchResults(
        'Web results for festivals on ' + readableDate + '. Check the dates and regional details in each source.',
        results
      );
    } else {
      addSearchResults('Search the web for current festival information:', [{
        title: 'Google: festivals in India on ' + readableDate,
        url: googleSearchUrl('Indian festivals today ' + readableDate),
        snippet: 'The date-specific calendar did not provide a confirmed entry.'
      }]);
    }
  } catch (error) {
    console.warn('ASWIK festival lookup error:', error);

    status.textContent =
      'I could not verify today’s festivals from the festival calendar. ' +
      'I will not guess a festival date. Check these current search results instead.';

    try {
      const results = await getWebResults(
        'Indian festivals today ' + getIndiaDateString() + ' India'
      );

      if (results.length) {
        addSearchResults(
          'Possible sources for today’s festival information. Verify the date and region:',
          results
        );
      } else {
        throw new Error('No usable search results');
      }
    } catch {
      addSearchResults('Open a live search for current festival information:', [{
        title: 'Search Google for festivals in India today',
        url: googleSearchUrl('Indian festivals today ' + getIndiaDateString()),
        snippet: 'Check current results and regional calendars.'
      }]);
    }
  }
}

// =============================================
// 6. WIKIPEDIA REFERENCE FALLBACK
// =============================================

async function getOnlineKnowledge(question) {
  try {
    const searchTerm = question
      .trim()
      .replace(
        /^(what is|what are|who is|who was|explain|define|tell me about|can you explain)\s+/i,
        ''
      )
      .replace(/[?!.,]+$/g, '')
      .trim();

    if (!searchTerm) return null;

    const searchUrl =
      'https://en.wikipedia.org/w/rest.php/v1/search/page?q=' +
      encodeURIComponent(searchTerm) + '&limit=5';

    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) throw new Error('Wikipedia search unavailable');

    const searchData = await searchResponse.json();
    const pages = searchData.pages || [];

    if (!pages.length) return null;

    // Prefer a close title match rather than blindly choosing the first page.
    const normalise = text => String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .trim();

    const wanted = normalise(searchTerm);
    const page = pages.find(item =>
      normalise(item.title) === wanted ||
      normalise(item.key) === wanted
    ) || pages[0];

    const title = page.key || page.title;
    const summaryUrl =
      'https://en.wikipedia.org/api/rest_v1/page/summary/' +
      encodeURIComponent(title.replace(/ /g, '_'));

    const summaryResponse = await fetch(summaryUrl);
    if (!summaryResponse.ok) return null;

    const article = await summaryResponse.json();

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
  } catch (error) {
    console.warn('ASWIK Wikipedia error:', error);
    return null;
  }
}

// =============================================
// 7. MAIN BRAIN ROUTER
// =============================================

async function sendMessage() {
  const value = messageInput ? messageInput.value.trim() : '';
  if (!value || busy) return;

  addMessage(value, 'user');
  if (messageInput) messageInput.value = '';

  busy = true;
  const status = addMessage('⚡ Brain Lite is thinking...', 'assistant');

  try {
    // Layer 1: Instant known answers.
    const instantAnswer = instantBrain(value);

    if (instantAnswer !== null) {
      status.textContent = instantAnswer;
      return;
    }

    // Layer 2: Current-date festival questions.
    if (isFestivalQuestion(value)) {
      // Remove the temporary status bubble before showing the festival answer.
      status.textContent = '⚡ Preparing the date-specific festival lookup...';
      await answerFestivalQuestion();
      return;
    }

    // Layer 3: Search the web for broader coverage.
    status.textContent = '⚡ Searching the web for relevant sources...';

    try {
      const results = await getWebResults(value);

      if (results.length) {
        status.textContent =
          'I found web results, but I cannot guarantee every snippet answers your question. Check the sources below.';

        addSearchResults('Relevant web results for your question:', results);
        return;
      }
    } catch (error) {
      console.warn('Web search fallback:', error);
    }

    // Layer 4: Wikipedia reference information if web search fails.
    status.textContent = '⚡ Checking Wikipedia reference information...';

    const article = await getOnlineKnowledge(value);

    if (article) {
      status.textContent = article.text + '\n\nSource: Wikipedia — ' +
        article.title + '\n' + article.url;
    } else {
      status.textContent =
        'I could not retrieve a reliable answer automatically. ' +
        'Try Live Web Search or use the Google link below.';
      addSearchResults('Search the web for your question:', [{
        title: 'Search Google for: ' + value,
        url: googleSearchUrl(value),
        snippet: 'Open Google to find more sources.'
      }]);
    }
  } catch (error) {
    console.error('ASWIK Brain Lite error:', error);
    status.textContent =
      'Something went wrong while processing your question. ' +
      'Please check your internet connection and try again.';
  } finally {
    busy = false;
  }
}

// =============================================
// 8. SEND BUTTON AND ENTER KEY
// =============================================

if (sendBtn) {
  sendBtn.addEventListener('click', sendMessage);
}

if (messageInput) {
  messageInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });
}

// =============================================
// 9. ABOUT DEVELOPER
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
// 10. SERVICE WORKER
// =============================================

if ('serviceWorker' in navigator &&
    location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(error => {
      console.warn('Service worker registration failed:', error);
    });
  });
}
