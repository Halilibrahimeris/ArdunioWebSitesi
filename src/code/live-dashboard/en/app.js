// Project 8 — Live Sensor Dashboard interface
// Arduino UNO Q · assets/app.js
//
// The chart is drawn straight onto a canvas with no library at all, so the
// dashboard keeps working without an internet connection.

const canvas      = document.querySelector('#chart');
const ctx         = canvas.getContext('2d');
const connectionEl = document.querySelector('#connection');
const recordCount  = document.querySelector('#record-count');

const vTemperature = document.querySelector('#v-temperature');
const vHumidity    = document.querySelector('#v-humidity');
const vLight       = document.querySelector('#v-light');

const ui = new WebUI();

// The readings currently on screen
let records = [];
const MAX_RECORDS = 150;

// ───────────────── Chart settings ─────────────────
const SERIES = [
  { key: 't', colour: '#e0533f', name: 'Temperature' },
  { key: 'h', colour: '#0d8ce0', name: 'Humidity' },
  { key: 'l', colour: '#e0a91a', name: 'Light' },
];

// All three series share a 0-100 scale
const Y_MIN = 0;
const Y_MAX = 100;

const PAD = { top: 16, right: 16, bottom: 28, left: 36 };

// ───────────────── Keep the canvas sharp ─────────────────
// On high-density screens a CSS pixel is not a real pixel. Without this the
// chart looks blurry.
function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  canvas.width = width * ratio;
  canvas.height = height * ratio;

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  draw();
}

window.addEventListener('resize', resizeCanvas);

// ───────────────── Drawing ─────────────────

function draw() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  ctx.clearRect(0, 0, w, h);

  const plotW = w - PAD.left - PAD.right;
  const plotH = h - PAD.top - PAD.bottom;

  // ── Horizontal grid and Y axis labels ──
  ctx.strokeStyle = 'rgba(128,145,150,0.25)';
  ctx.fillStyle = 'rgba(128,145,150,0.9)';
  ctx.lineWidth = 1;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let value = Y_MIN; value <= Y_MAX; value += 25) {
    const py = PAD.top + plotH - ((value - Y_MIN) / (Y_MAX - Y_MIN)) * plotH;

    ctx.beginPath();
    ctx.moveTo(PAD.left, py);
    ctx.lineTo(PAD.left + plotW, py);
    ctx.stroke();

    ctx.fillText(String(value), PAD.left - 8, py);
  }

  // Stop here if there is not enough data yet
  if (records.length < 2) {
    ctx.textAlign = 'center';
    ctx.fillText('Waiting for readings…', w / 2, h / 2);
    return;
  }

  // ── One line per series ──
  const stepX = plotW / (MAX_RECORDS - 1);

  for (const series of SERIES) {
    ctx.beginPath();
    ctx.strokeStyle = series.colour;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';

    records.forEach((record, i) => {
      const value = Math.max(Y_MIN, Math.min(Y_MAX, record[series.key]));

      // Laid out from the right so the newest reading sits at the right edge
      const px = PAD.left + plotW - (records.length - 1 - i) * stepX;
      const py = PAD.top + plotH - ((value - Y_MIN) / (Y_MAX - Y_MIN)) * plotH;

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });

    ctx.stroke();
  }

  // ── X axis: the oldest and newest timestamps ──
  ctx.fillStyle = 'rgba(128,145,150,0.9)';
  ctx.textBaseline = 'top';

  ctx.textAlign = 'left';
  ctx.fillText(records[0].time, PAD.left, h - PAD.bottom + 8);

  ctx.textAlign = 'right';
  ctx.fillText(records[records.length - 1].time, PAD.left + plotW, h - PAD.bottom + 8);
}

// ───────────────── Current values ─────────────────

function updateCurrentValues(record) {
  vTemperature.textContent = record.t.toFixed(1);
  vHumidity.textContent = record.h;
  vLight.textContent = record.l;
}

// ───────────────── Messages from the board ─────────────────

// On connect the whole history arrives at once
ui.on_message('history', (data) => {
  records = data.records || [];

  if (records.length > 0) {
    updateCurrentValues(records[records.length - 1]);
  }

  recordCount.textContent = records.length;

  connectionEl.textContent = 'Connected to the board';
  connectionEl.className = 'status connected';

  draw();
});

// After that each new reading arrives on its own
ui.on_message('reading', (record) => {
  records.push(record);

  // Drop the oldest once we exceed the limit
  if (records.length > MAX_RECORDS) {
    records.shift();
  }

  updateCurrentValues(record);
  recordCount.textContent = records.length;
  draw();
});

// ───────────────── CSV download ─────────────────

document.querySelector('#download-csv').addEventListener('click', () => {
  if (records.length === 0) return;

  const lines = [
    'time,temperature_C,humidity_pct,light_pct',
    ...records.map((r) => `${r.time},${r.t},${r.h},${r.l}`),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'readings.csv';
  link.click();

  // Release the URL so the browser can reclaim the memory
  URL.revokeObjectURL(url);
});

// First draw
resizeCanvas();
