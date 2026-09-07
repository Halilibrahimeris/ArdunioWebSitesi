// Project 7 — Smart Plug interface logic
// Arduino UNO Q · assets/app.js

const relayBtn        = document.querySelector('#relay-btn');
const colourInput     = document.querySelector('#colour');
const brightnessInput = document.querySelector('#brightness');
const brightnessValue = document.querySelector('#brightness-value');
const timerEl         = document.querySelector('#timer-status');
const connectionEl    = document.querySelector('#connection');

const ui = new WebUI();

// The relay's last known state — pressing the button sends the opposite
let relayOn = false;

// ───────────────── Helpers ─────────────────

// "#0078ff" → { r: 0, g: 120, b: 255 }
function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

// { r, g, b } → "#0078ff"
function rgbToHex({ r, g, b }) {
  const two = (n) => n.toString(16).padStart(2, '0');
  return `#${two(r)}${two(g)}${two(b)}`;
}

// Sliders and colour pickers fire dozens of events a second; thin them out.
function debounce(fn, ms) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ───────────────── Relay ─────────────────

relayBtn.addEventListener('click', () => {
  // Send the OPPOSITE of the current state
  ui.send_message('set_relay', { on: !relayOn });
});

// ───────────────── Timer ─────────────────

document.querySelectorAll('.preset').forEach((btn) => {
  btn.addEventListener('click', () => {
    const minutes = Number(btn.dataset.minutes);
    ui.send_message('set_timer', { minutes });
  });
});

// ───────────────── Colour and brightness ─────────────────

const sendColour = debounce((hex) => {
  ui.send_message('set_color', hexToRgb(hex));
}, 100);

colourInput.addEventListener('input', () => sendColour(colourInput.value));

document.querySelectorAll('.swatch').forEach((btn) => {
  btn.addEventListener('click', () => {
    const hex = btn.dataset.colour;
    colourInput.value = hex;                     // Keep the picker in sync
    ui.send_message('set_color', hexToRgb(hex));
  });
});

const sendBrightness = debounce((value) => {
  ui.send_message('set_brightness', { brightness: value });
}, 100);

brightnessInput.addEventListener('input', () => {
  const value = Number(brightnessInput.value);
  brightnessValue.textContent = value;
  sendBrightness(value);
});

// ───────────────── State from the board ─────────────────

ui.on_message('state', (data) => {
  // Relay
  relayOn = data.relay;
  relayBtn.textContent = relayOn ? 'ON' : 'OFF';
  relayBtn.className = `big-button ${relayOn ? 'on' : 'off'}`;

  // Timer
  timerEl.textContent =
    data.timer > 0
      ? `Switches off in ${data.timer} minutes`
      : 'No timer set';

  // Colour and brightness
  colourInput.value = rgbToHex(data.color);
  brightnessInput.value = data.brightness;
  brightnessValue.textContent = data.brightness;

  connectionEl.textContent = 'Connected to the board';
  connectionEl.className = 'status connected';
});
