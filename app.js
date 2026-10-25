
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
    'You are ASWIK AI, a helpful personal AI assistant created by Aswik Singh. ' +
    'Be friendly, accurate, and clear. Never claim to have live information ' +
    'unless it has actually been retrieved. Your knowledge may be outdated.'
}];

function updateClock() {
  const now = new Date();
  document.getElementById('clock').textContent =
    now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
}

updateClock();
setInterval(updateClock, 15000);

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

  row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return p;
}

function searchWeb(query) {
  const q = query.trim();
  if (!q) return;

  addMessage(q, 'user');
  addMessage(
    'Opening Google search results. Live search summaries are not ' +
    'connected to the AI yet.',
    'assistant'
  );

  window.open(
    'https://www.google.com/search?q=' + encodeURIComponent(q),
    '_blank',
    'noopener'
  );

  searchInput.value = '';
}

searchForm.addEventListener('submit', e => {
  e.preventDefault();
  searchWeb(searchInput.value);
});

document.querySelectorAll('[data-query]').forEach(btn => {
  btn.addEventListener('click', () => searchWeb(btn.dataset.query));
});

async function getEngine(status) {
  if (engine) return engine;

  if (!navigator.gpu) {
    throw new Error(
      'WebGPU is unavailable in this browser or on this device.'
    );
  }

  if (!enginePromise) {
    enginePromise = (async () => {
      status.textContent = 'Connecting to the AI engine...';

      const webllm = await import(
        'https://esm.run/@mlc-ai/web-llm'
      );

      return await webllm.CreateMLCEngine(MODEL_ID, {
        initProgressCallback: progress => {
          status.textContent =
            'Preparing AI model: ' +
            (progress.text || 'Please wait...');
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

async function sendMessage() {
  const value = messageInput.value.trim();
  if (!value || busy) return;

  addMessage(value, 'user');
  messageInput.value = '';
  busy = true;

  const status = addMessage('Starting ASWIK AI...', 'assistant');

  try {
    const ai = await getEngine(status);

    status.textContent = 'ASWIK AI is thinking...';

    conversation.push({ role: 'user', content: value });

    const result = await ai.chat.completions.create({
      messages: conversation.slice(-11),
      temperature: 0.7,
      max_tokens: 300
    });

    const answer =
      result.choices?.[0]?.message?.content?.trim() ||
      'I could not generate a response. Please try again.';

    conversation.push({ role: 'assistant', content: answer });
    status.textContent = answer;
  } catch (error) {
    console.error('ASWIK AI error:', error);

    status.textContent =
      'I could not start the AI. Please check your internet connection, ' +
      'available storage, and WebGPU compatibility, then try again. ' +
      'Technical detail: ' + (error.message || 'Unknown error');
  } finally {
    busy = false;
  }
}

document.getElementById('sendBtn').addEventListener('click', sendMessage);

messageInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

const aboutDialog = document.getElementById('aboutDialog');

document.getElementById('aboutBtn').addEventListener('click', () => {
  aboutDialog.showModal();
});

document.getElementById('closeAbout').addEventListener('click', () => {
  aboutDialog.close();
});

if ('serviceWorker' in navigator &&
    location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(error => {
      console.warn('Service worker registration failed:', error);
    });
  });
}
