const chat = document.getElementById('chat');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const messageInput = document.getElementById('messageInput');

function updateClock(){
  const now = new Date();
  document.getElementById('clock').textContent = now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}
updateClock(); setInterval(updateClock, 15000);

function addMessage(text, who='user'){
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
  bubble.append(title, p); row.append(avatar, bubble); chat.append(row);
  row.scrollIntoView({behavior:'smooth', block:'nearest'});
}
function searchWeb(query){
  const q = query.trim();
  if(!q) return;
  addMessage(q, 'user');
  addMessage('Opening live web results for: "' + q + '". Review the sources in your browser. This starter does not yet summarize search results with a local language model.', 'assistant');
  const url = 'https://www.google.com/search?q=' + encodeURIComponent(q);
  window.open(url, '_blank', 'noopener');
  searchInput.value = '';
}
searchForm.addEventListener('submit', e => {e.preventDefault(); searchWeb(searchInput.value);});
document.querySelectorAll('[data-query]').forEach(btn => btn.addEventListener('click', () => searchWeb(btn.dataset.query)));
function sendMessage(){
  const value = messageInput.value.trim();
  if(!value) return;
  addMessage(value, 'user');
  addMessage('The chat interface is working, but a real AI model is not connected in this starter yet. Use Live Web Search above for current information. The next development step is integrating an on-device model.', 'assistant');
  messageInput.value = '';
}
document.getElementById('sendBtn').addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', e => {if(e.key === 'Enter' && !e.shiftKey){e.preventDefault();sendMessage();}});
const aboutDialog = document.getElementById('aboutDialog');
document.getElementById('aboutBtn').addEventListener('click', () => aboutDialog.showModal());
document.getElementById('closeAbout').addEventListener('click', () => aboutDialog.close());
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
