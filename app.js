
'use strict';

// =============================================
// ASWIK AI — BRAIN LITE
// Developer: Aswik Singh
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

  // Greetings
  if (/^(hi|hello|hey|hii+|heyy+|namaste|good morning|good afternoon|good evening)(\s+(there|from my pc|from my phone))?$/.test(q)) {
    return 'Hello! ⚡ I am ASWIK AI, ready to help. What shall we do today?';
  }

  // Developer identity
  if (/\b(who (made|created|developed|built) (you|aswik ai)|who is your (creator|developer)|who made aswik ai|who created aswik ai)\b/.test(q)) {
    return 'I was created and developed by Aswik Singh. ⚡ Welcome to ASWIK AI!';
  }

  // Identity
  if (/^(who are you|what are you|introduce yourself|tell me about yourself)$/.test(q)) {
    return 'I am ASWIK AI, a personal assistant created by Aswik Singh. My Brain Lite system answers quick questions and retrieves free online reference information.';
  }

  // Capabilities
  if (/^(what can you do|help|your features|what are your features)$/.test(q)) {
    return 'I can answer quick questions, tell you the date and time, calculate simple arithmetic, retrieve Wikipedia information, and open Google search results.';
  }

  // Current date
  if (
    (/\b(date|day)\b/.test(q) &&
      /\b(what|today|date|day|is|tell|current|the)\b/.test(q)) ||
    /\b(today's date|todays date|current date|what day is it)\b/.test(q)
  ) {
    return 'Today is ' + new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) + '. ⚡';
  }

  // Current time
  if (/\b(what time is it|current time|tell me the time|what is the time|what's the time|time right now)\b/.test(q)) {
    return 'The current local time is ' +
      new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) + '. ⚡';
  }

  // Simple arithmetic
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

  // Thanks
  if (/^(thanks|thank you|thx|thank you so much)$/.test(q)) {
    return 'You are welcome! ⚡ I am always ready to help.';
  }

  return null;
}

// =============================================
// 2. LIVE CLOCK
// =============================================

function updateClock() {
  const clock = document.getElementById('clock');
  if (!clock) return;

  clock.textContent = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
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
    row.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  }

  return p;
}

// =============================================
// 4. GOOGLE WEB SEARCH
// =============================================

function searchWeb(query) {
  const q = query.trim();
  if (!q) return;

  addMessage(q, 'user');

  addMessage(
    'Opening Google results for your question. Check the results for current information.',
    'assistant'
  );

  window.open(
    'https://www.google.com/search?q=' + encodeURIComponent(q),
    '_blank',
    'noopener'
  );

  if (searchInput) searchInput.value = '';
}

if (searchForm) {
  searchForm.addEventListener('submit', event => {
    event.preventDefault();
    searchWeb(searchInput ? searchInput.value : '');
  });
}

document.querySelectorAll('[data-query]').forEach(button => {
  button.addEventListener('click', () => {
    searchWeb(button.dataset.query || '');
  });
});

// =============================================
// 5. FREE ONLINE KNOWLEDGE — WIKIPEDIA
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
      encodeURIComponent(searchTerm) +
      '&limit=3';

    const searchResponse = await fetch(searchUrl);

    if (!searchResponse.ok) {
      throw new Error('Wikipedia search unavailable');
    }

    const searchData = await searchResponse.json();
    const pages = searchData.pages || [];

    if (pages.length === 0) return null;

    for (const page of pages) {
      const title = page.key || page.title;

      const summaryUrl =
        'https://en.wikipedia.org/api/rest_v1/page/summary/' +
        encodeURIComponent(title.replace(/ /g, '_'));

      const summaryResponse = await fetch(summaryUrl);

      if (!summaryResponse.ok) continue;

      const article = await summaryResponse.json();

      if (
        !article.extract ||
        article.type === 'disambiguation' ||
        article.type === 'not_found'
      ) {
        continue;
      }

      const source =
        article.content_urls?.desktop?.page ||
        'https://en.wikipedia.org/wiki/' +
        encodeURIComponent(title.replace(/ /g, '_'));

      return article.extract +
        '\n\nSource: Wikipedia — ' + article.title +
        '\n' + source;
    }

    return null;
  } catch (error) {
    console.warn('ASWIK online knowledge error:', error);
    return null;
  }
}

// =============================================
// 6. MAIN BRAIN ROUTER — BRAIN LITE IS THE BOSS
// =============================================

async function sendMessage() {
  const value = messageInput ? messageInput.value.trim() : '';

  if (!value || busy) return;

  addMessage(value, 'user');

  if (messageInput) messageInput.value = '';

  busy = true;

  const status = addMessage(
    '⚡ Brain Lite is thinking...',
    'assistant'
  );

  try {
    // Layer 1: Brain Lite handles known questions.
    const instantAnswer = instantBrain(value);

    if (instantAnswer !== null) {
      status.textContent = instantAnswer;
      return;
    }

    // Layer 2: Free online reference information.
    status.textContent = '⚡ Searching online knowledge...';

    const onlineAnswer = await getOnlineKnowledge(value);

    if (onlineAnswer) {
      status.textContent = onlineAnswer;
    } else {
      status.textContent =
        'I could not find a suitable Wikipedia article for that question. ' +
        'Try rephrasing it or use Live Web Search for more results.';
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
// 7. SEND BUTTON AND ENTER KEY
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
// 8. ABOUT DEVELOPER
// =============================================

const aboutDialog = document.getElementById('aboutDialog');
const aboutBtn = document.getElementById('aboutBtn');
const closeAbout = document.getElementById('closeAbout');

if (aboutDialog && aboutBtn) {
  aboutBtn.addEventListener('click', () => {
    aboutDialog.showModal();
  });
}

if (aboutDialog && closeAbout) {
  closeAbout.addEventListener('click', () => {
    aboutDialog.close();
  });
}

// =============================================
// 9. SERVICE WORKER
// =============================================

if (
  'serviceWorker' in navigator &&
  location.protocol.startsWith('http')
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(error => {
      console.warn('Service worker registration failed:', error);
    });
  });
}
