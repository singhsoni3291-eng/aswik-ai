
const chat = document.getElementById('chat');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const messageInput = document.getElementById('messageInput');

const MODEL_ID = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';

let engine = null;
let enginePromise = null;
let busy = false;

const conversation = [{
  role: 'system',
  content:
    'You are ASWIK AI, a helpful personal assistant created by Aswik Singh. ' +
    'Be friendly, accurate, and clear. Never invent live information. ' +
    'Admit uncertainty when you do not know an answer.'
}];

// -----------------------------------------
// ASWIK BRAIN LITE — INSTANT BRAIN
// -----------------------------------------

function instantBrain(input) {
  const q = input.trim().toLowerCase()
    .replace(/[?!.,]+$/g, '')
    .trim();

  // Greetings
  if (/^(hi|hello|hey|hii+|heyy+|namaste|good morning|good afternoon|good evening)( there)?$/.test(q)) {
    return 'Hello! ⚡ I am ASWIK AI, ready to help. What shall we do today?';
  }

  // Developer identity
  if (
    /\b(who (made|created|developed|built) you|who is your (creator|developer)|who made aswik ai|who created aswik ai)\b/.test(q)
  ) {
    return 'I was created and developed by Aswik Singh. ⚡ Welcome to ASWIK AI!';
  }

  if (
    /^(who are you|what are you|introduce yourself|tell me about yourself)$/.test(q)
  ) {
    return 'I am ASWIK AI, a personal assistant created by Aswik Singh. My Brain Lite system handles quick commands, with a compact language model available when your device supports it.';
  }

  // Capabilities
  if (/^(what can you do|help|your features|what are your features)$/.test(q)) {
    return 'I can answer quick questions, tell you the date and time, calculate simple arithmetic, and open web search results. When a compatible AI model is available, I can also handle more open-ended conversations.';
  }

  // Current date
  if (
    /\b(what is the date|what's the date|todays date|today's date|current date|what day is it)\b/.test(q)
  ) {
    return 'Today is ' + new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) + '.';
  }

  // Current time
  if (
    /\b(what time is it|current time|tell me the time|what is the time|what's the time)\b/.test(q)
  ) {
    return 'The current local time is ' + new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) + '.';
  }

  // Simple arithmetic: 12 + 5, 8 / 2, etc.
  const mathText = q.match(
    /^(?:(?:what is|calculate|solve)\s+)?(-?\d+(?:\.\d+)?)\s*([+\-*/×÷])\s*(-?\d+(?:\.\d+)?)\s*\??$/
  );

  if (mathText) {
    const a = Number(mathText[1]);
    const b = Number(mathText[3]);
    const op = mathText[2];
    let result;

    if (op === '+') result = a + b;
    if (op === '-') result = a - b;
    if (op === '* ' || op === '×' || op === '*') result = a * b;

    if (op === '/' || op === '÷') {
      if (b === 0) return 'Division by zero is undefined.';
      result = a / b;
    }

    if (Number.isFinite(result)) {
      return 'The answer is ' + Number(result.toPrecision(12)) + '.';
    }
  }

  // A friendly response to thanks
  if (/^(thanks|thank you|thx|thank you so much)$/.test(q)) {
    return 'You are welcome! ⚡ I am always ready to help.';
  }

  // Return null when this brain cannot answer confidently.
  return null;
}

// -----------------------------------------
// CLOCK
// -----------------------------------------

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

// -----------------------------------------
// CHAT DISPLAY
// -----------------------------------------

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
  chat.append(row);

  row.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest'
  });

  return p;
}

// -----------------------------------------
// WEB SEARCH
// -----------------------------------------

function searchWeb(query) {
  const q = query.trim();
  if (!q) return;

  addMessage(q, 'user');

  addMessage(
    'Opening Google results for your question. Check the search results for current information.',
    'assistant'
  );

  window.open(
    'https://www.google.com/search?q=' + encodeURIComponent(q),
    '_blank',
    'noopener'
  );

  searchInput.value = '';
}

searchForm.addEventListener('submit', event => {
  event.preventDefault();
  searchWeb(searchInput.value);
});

document.querySelectorAll('[data-query]').forEach(button => {
  button.addEventListener('click', () => {
    searchWeb(button.dataset.query);
  });
});

// -----------------------------------------
// COMPACT AI MODEL — OPTIONAL
// -----------------------------------------

async function getEngine(status) {
  if (engine) return engine;

  if (!navigator.gpu) {
    throw new Error('NO_WEBGPU');
  }

  if (!enginePromise) {
    enginePromise = (async () => {
      status.textContent = 'Loading compact AI engine...';

      const webllm = await import(
        'https://esm.run/@mlc-ai/web-llm'
      );

      return await webllm.CreateMLCEngine(MODEL_ID, {
        initProgressCallback: progress => {
          status.textContent =
            progress.text || 'Preparing the AI model...';
        }
      });
    })().then(result => {
      engine = result;
      return result;
    }).catch(error => {
      enginePromise = null;
      throw error;
    });
  }

  return enginePromise;
}

// -----------------------------------------
// MAIN BRAIN ROUTER
// -----------------------------------------

async function sendMessage() {
  const value = messageInput.value.trim();

  if (!value || busy) return;

  addMessage(value, 'user');
  messageInput.value = '';
  busy = true;

  const status = addMessage('ASWIK Brain Lite is checking...', 'assistant');

  try {
    // Layer 1: answer immediately without a GPU or model.
    const instantAnswer = instantBrain(value);

    if (instantAnswer !== null) {
      status.textContent = instantAnswer;
      return;
    }

    // Layer 2: use a compact model only if available.
    if (!navigator.gpu) {
      status.textContent =
        'My Instant Brain is working, but this question needs deeper ' +
        'language understanding. Your browser does not currently expose ' +
        'WebGPU, so the local model cannot start. Use Live Web Search ' +
        'above for more information.';

      return;
    }

    const ai = await getEngine(status);

    status.textContent = 'ASWIK AI is thinking...';

    conversation.push({
      role: 'user',
      content: value
    });

    const result = await ai.chat.completions.create({
      messages: [
        conversation[0],
        ...conversation.slice(-10)
      ],
      temperature: 0.6,
      max_tokens: 256
    });

    const answer =
      result.choices?.[0]?.message?.content?.trim() ||
      'I could not generate a response. Please try again.';

    conversation.push({
      role: 'assistant',
      content: answer
    });

    status.textContent = answer;

  } catch (error) {
    console.error('ASWIK AI error:', error);

    status.textContent =
      'ASWIK Instant Brain is still available for greetings, ' +
      'simple calculations, date, time, and developer questions. ' +
      'The compact AI model could not start on this device. ' +
      'Use Live Web Search for other questions.';
  } finally {
    busy = false;
  }
}

document.getElementById('sendBtn').addEventListener('click', sendMessage);

messageInput.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

// -----------------------------------------
// ABOUT DEVELOPER
// -----------------------------------------

const aboutDialog = document.getElementById('aboutDialog');

document.getElementById('aboutBtn').addEventListener('click', () => {
  aboutDialog.showModal();
});

document.getElementById('closeAbout').addEventListener('click', () => {
  aboutDialog.close();
});

// -----------------------------------------
// SERVICE WORKER
// -----------------------------------------

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
