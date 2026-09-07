// Project 10 — Assistant panel
// Arduino UNO Q · assets/app.js

const objectsEl   = document.querySelector('#objects');
const logEl       = document.querySelector('#log');
const listeningEl = document.querySelector('#listening-status');
const lastHeardEl = document.querySelector('#last-heard');
const connectionEl = document.querySelector('#connection');
const textInput   = document.querySelector('#text');

const ui = new WebUI();

// Icons shown at the start of each log line
const ICONS = {
  seen: '👁️',
  person: '🧍',
  heard: '🎤',
  answer: '🔈',
};

// ───────────────── Panel to board ─────────────────

document.querySelector('#ask').addEventListener('click', () => {
  ui.send_message('what_do_you_see', {});
});

function sayIt() {
  const text = textInput.value.trim();
  if (!text) return;

  ui.send_message('speak', { text });
  textInput.value = '';
}

document.querySelector('#say').addEventListener('click', sayIt);
textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sayIt();
});

// ───────────────── Board to panel ─────────────────

ui.on_message('state', (state) => {
  // Recognised objects
  const objects = state.objects || {};
  const names = Object.keys(objects);

  objectsEl.innerHTML = '';

  if (names.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'Nothing recognised yet';
    objectsEl.appendChild(li);
  } else {
    for (const name of names) {
      const li = document.createElement('li');

      const label = document.createElement('span');
      label.className = 'name';
      label.textContent = name;

      // Show the confidence as a bar
      const bar = document.createElement('span');
      bar.className = 'confidence';
      bar.style.width = `${Math.round(objects[name] * 100)}%`;
      bar.title = `${Math.round(objects[name] * 100)}% confident`;

      li.append(label, bar);
      objectsEl.appendChild(li);
    }
  }

  // Microphone status
  listeningEl.textContent = state.listening ? 'Listening…' : 'Idle';
  lastHeardEl.textContent = state.last_heard || '—';

  connectionEl.textContent = 'Connected to the board';
  connectionEl.className = 'status connected';
});

ui.on_message('log', (data) => {
  const records = data.records || [];

  logEl.innerHTML = '';

  // Newest event at the top
  for (const record of [...records].reverse()) {
    const li = document.createElement('li');
    li.className = record.kind;

    const icon = document.createElement('span');
    icon.className = 'icon';
    icon.textContent = ICONS[record.kind] || '•';

    const time = document.createElement('span');
    time.className = 'time';
    time.textContent = record.time;

    const text = document.createElement('span');
    text.className = 'text';
    text.textContent = record.text;

    li.append(icon, time, text);
    logEl.appendChild(li);
  }
});
