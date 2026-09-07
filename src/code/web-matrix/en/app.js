// Project 6 — The web interface's logic
// Arduino UNO Q · assets/app.js
//
// The WebUI class comes from arduino.js. Its only job is exchanging messages
// with the Python side: send_message to send, on_message to listen.

const textInput       = document.querySelector('#text');
const sendBtn         = document.querySelector('#send');
const brightnessInput = document.querySelector('#brightness');
const speedInput      = document.querySelector('#speed');

const brightnessValue = document.querySelector('#brightness-value');
const speedValue      = document.querySelector('#speed-value');
const currentText     = document.querySelector('#current-text');
const connectionEl    = document.querySelector('#connection');

const ui = new WebUI();

// ───────────────── Sent to Python ─────────────────

function sendText() {
  const text = textInput.value.trim();
  if (!text) return;

  // Caught by ui.on_message("set_text", ...) on the Python side
  ui.send_message('set_text', { text });
}

sendBtn.addEventListener('click', sendText);

// Pressing Enter sends too
textInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') sendText();
});

// Dragging a slider fires dozens of events a second. Sending every one of
// them to the board is wasteful, so we thin them out with a short delay.
function debounce(fn, ms) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

const sendBrightness = debounce((value) => {
  ui.send_message('set_brightness', { brightness: value });
}, 120);

const sendSpeed = debounce((value) => {
  ui.send_message('set_speed', { speed: value });
}, 120);

brightnessInput.addEventListener('input', () => {
  const value = Number(brightnessInput.value);
  brightnessValue.textContent = value;   // Update the label immediately
  sendBrightness(value);                 // Send to the board on a delay
});

speedInput.addEventListener('input', () => {
  const value = Number(speedInput.value);
  speedValue.textContent = value;
  sendSpeed(value);
});

// ───────────────── Received from Python ─────────────────

// The board sends the current state on connect and after every change, so
// two phones open at once stay in sync with each other.
ui.on_message('state', (data) => {
  currentText.textContent = data.text || '—';

  brightnessInput.value = data.brightness;
  brightnessValue.textContent = data.brightness;

  speedInput.value = data.speed;
  speedValue.textContent = data.speed;

  connectionEl.textContent = 'Connected to the board';
  connectionEl.className = 'status connected';
});

ui.on_message('error', (data) => {
  connectionEl.textContent = data.message;
  connectionEl.className = 'status error';
});
