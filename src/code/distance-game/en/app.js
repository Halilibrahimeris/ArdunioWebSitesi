// Project 6 — The game's logic
// Arduino UNO Q · assets/app.js
//
// The WebUI class comes from arduino.js. Its only job is exchanging messages
// with the Python side: send_message to send, on_message to listen.
//
// The game itself runs HERE, not on the board. The reason is simple: a real
// drawing loop only exists in the browser. The board's job is to measure, light
// LEDs and sound the buzzer — we never go to the board and back per frame.

const gameCanvas = document.querySelector('#game');
const chartCanvas = document.querySelector('#chart');
const startBtn = document.querySelector('#start');
const windowInput = document.querySelector('#window');
const playerInput = document.querySelector('#player');
const csvBtn = document.querySelector('#csv-download');

const scoreRows = document.querySelector('#score-rows');
const windowSummary = document.querySelector('#window-summary');

const windowValue = document.querySelector('#window-value');
const scoreEl = document.querySelector('#score');
const timeEl = document.querySelector('#time');
const roundEl = document.querySelector('#round');
const bestEl = document.querySelector('#best');
const connectionEl = document.querySelector('#connection');

const gameCtx = gameCanvas.getContext('2d');
const chartCtx = chartCanvas.getContext('2d');

const ui = new WebUI();

// ───────────────── Settings ─────────────────
// These two must match PLAY_MIN / PLAY_MAX in the sketch.
const PLAY_MIN = 5;
const PLAY_MAX = 60;

const GAME_MS = 60000;
const HOLD_MS = 2000; // Time you must stay in the band to win the round
const ZONE_START = 16; // cm — the band width in the first round
const ZONE_STEP = 2; // It narrows by this much every round
const ZONE_MIN = 6;
const POINT_EVERY_MS = 100; // 1 point per 100 ms spent in the band

const MAX_TRACE = 160; // How many readings the chart shows

const COLOUR_RAW = '#e0533f';
const COLOUR_AVERAGE = '#26b5ba';

// ───────────────── State ─────────────────
let lastRaw = PLAY_MAX;
let lastAverage = PLAY_MAX;
let trace = [];

let playing = false;
let remainingMs = GAME_MS;
let score = 0;
let round = 1;
let heldMs = 0;
let pointCarryMs = 0;

let targetNear = 0;
let targetFar = 0;

let lastFrame = 0;
let lastReadingAt = 0;

// The score table as it comes from the board
let scores = [];

// ───────────────── Sharpen the canvas ─────────────────
// On retina screens a CSS pixel and a real pixel are not the same.
// Without this the drawing looks blurry.
function resizeCanvas(canvas, ctx) {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * ratio;
  canvas.height = canvas.clientHeight * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function resizeAll() {
  resizeCanvas(gameCanvas, gameCtx);
  resizeCanvas(chartCanvas, chartCtx);
}

window.addEventListener('resize', resizeAll);

// ───────────────── Helpers ─────────────────

// Turns a distance into 0 (bottom) to 1 (top).
function height(cm) {
  const ratio = (cm - PLAY_MIN) / (PLAY_MAX - PLAY_MIN);
  return Math.min(1, Math.max(0, ratio));
}

// Around 16 readings a second arrive from the board. If it goes quiet for more
// than a second either the WiFi dropped or the app stopped — say so.
function checkConnection(now) {
  if (!lastReadingAt) return;

  const silence = now - lastReadingAt;

  if (silence > 1500 && connectionEl.className !== 'status error') {
    connectionEl.textContent = 'No data from the board';
    connectionEl.className = 'status error';
  }
}

function debounce(fn, ms) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ───────────────── Round handling ─────────────────

function zoneWidth() {
  return Math.max(ZONE_MIN, ZONE_START - (round - 1) * ZONE_STEP);
}

function startRound() {
  const width = zoneWidth();

  // The centre of the band has to stay inside the range; pushed against the
  // edges the player cannot reach it.
  const low = PLAY_MIN + width / 2 + 3;
  const high = PLAY_MAX - width / 2 - 3;
  const centre = low + Math.random() * (high - low);

  targetNear = centre - width / 2;
  targetFar = centre + width / 2;
  heldMs = 0;

  roundEl.textContent = round;

  // Tell the board about the target too: it will drive the LEDs and the
  // bracket on the matrix from its own readings, so we make no network round
  // trip per frame.
  ui.send_message('set_target', { near: targetNear, far: targetFar });
}

function startGame() {
  playing = true;
  score = 0;
  round = 1;
  remainingMs = GAME_MS;
  pointCarryMs = 0;

  scoreEl.textContent = '0';
  startBtn.textContent = 'STOP';
  startBtn.classList.remove('off');
  startBtn.classList.add('on');

  startRound();
}

function endGame() {
  playing = false;
  startBtn.textContent = 'START';
  startBtn.classList.remove('on');
  startBtn.classList.add('off');

  // The name goes along too, so it is clear who earned the score.
  ui.send_message('report_score', { score, round, name: playerInput.value });
  ui.send_message('clear_target', {});
}

// ───────────────── The player's name ─────────────────
// We remember the name in the browser so it does not have to be typed every
// game. That is only a convenience; the real record lives in the file on the board.
const NAME_KEY = 'uno-q:distance-game:player';

try {
  const saved = localStorage.getItem(NAME_KEY);
  if (saved) playerInput.value = saved;
} catch {
  /* Storage may be blocked in a private window; the game still works. */
}

playerInput.addEventListener('change', () => {
  try {
    localStorage.setItem(NAME_KEY, playerInput.value);
  } catch {
    /* Fine if it is not remembered. */
  }
});

startBtn.addEventListener('click', () => {
  if (playing) endGame();
  else startGame();
});

// ───────────────── Averaging window ─────────────────

// A slider being dragged fires dozens of events a second.
// Sending every one to the board is pointless; a small delay thins them out.
const sendWindow = debounce((value) => {
  ui.send_message('set_window', { window: value });
}, 120);

windowInput.addEventListener('input', () => {
  const value = Number(windowInput.value);
  windowValue.textContent = value;
  sendWindow(value);
});

// ───────────────── The game loop ─────────────────

function frame(now) {
  // When the tab goes to the background or the phone locks, the browser stops
  // drawing. On the way back seconds have passed; without a cap the balloon
  // teleports and the round ends in one go.
  const elapsed = Math.min(50, lastFrame ? now - lastFrame : 0);
  lastFrame = now;

  checkConnection(now);

  if (playing) {
    remainingMs -= elapsed;

    if (remainingMs <= 0) {
      remainingMs = 0;
      endGame();
    } else {
      // Points have to follow whichever value the balloon follows.
      const inZone = lastAverage >= targetNear && lastAverage <= targetFar;

      if (inZone) {
        heldMs += elapsed;
        pointCarryMs += elapsed;

        while (pointCarryMs >= POINT_EVERY_MS) {
          pointCarryMs -= POINT_EVERY_MS;
          score++;
        }

        if (heldMs >= HOLD_MS) {
          // Round won: let the board's buzzer celebrate, narrow the band
          ui.send_message('celebrate', {});
          score += 10;
          round++;
          startRound();
        }
      } else {
        heldMs = 0;
        pointCarryMs = 0;
      }

      scoreEl.textContent = score;
    }

    timeEl.textContent = Math.ceil(remainingMs / 1000);
  }

  drawGame();
  drawChart();

  requestAnimationFrame(frame);
}

// ───────────────── Draw the play area ─────────────────

function drawGame() {
  const w = gameCanvas.clientWidth;
  const h = gameCanvas.clientHeight;

  gameCtx.clearRect(0, 0, w, h);

  // Backdrop
  gameCtx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  gameCtx.fillRect(0, 0, w, h);

  // The target band
  if (playing) {
    const top = (1 - height(targetFar)) * h;
    const bottom = (1 - height(targetNear)) * h;

    // The band grows more solid as the time held in it runs out
    const fill = Math.min(1, heldMs / HOLD_MS);

    gameCtx.fillStyle = `rgba(38, 181, 186, ${0.14 + fill * 0.3})`;
    gameCtx.fillRect(0, top, w, bottom - top);

    gameCtx.strokeStyle = COLOUR_AVERAGE;
    gameCtx.lineWidth = 2;
    gameCtx.beginPath();
    gameCtx.moveTo(0, top);
    gameCtx.lineTo(w, top);
    gameCtx.moveTo(0, bottom);
    gameCtx.lineTo(w, bottom);
    gameCtx.stroke();
  }

  // Show where the raw reading is with a faint line.
  // With the window at 1 this line and the balloon sit on top of each other;
  // widen the window and you can see the balloon falling behind.
  const rawY = (1 - height(lastRaw)) * h;
  gameCtx.strokeStyle = 'rgba(224, 83, 63, 0.45)';
  gameCtx.lineWidth = 1;
  gameCtx.setLineDash([4, 4]);
  gameCtx.beginPath();
  gameCtx.moveTo(0, rawY);
  gameCtx.lineTo(w, rawY);
  gameCtx.stroke();
  gameCtx.setLineDash([]);

  // The balloon — NO SMOOTHING HERE.
  // Easing the balloon while drawing would have been easy, but then the raw
  // reading's jitter would be invisible. The balloon sits exactly on the last
  // value that came from the board; if it shakes, the data really is shaking.
  const balloonY = (1 - height(lastAverage)) * h;
  const balloonX = w / 2;

  gameCtx.fillStyle = '#ffd166';
  gameCtx.beginPath();
  gameCtx.ellipse(balloonX, balloonY, 16, 20, 0, 0, Math.PI * 2);
  gameCtx.fill();

  // The string
  gameCtx.strokeStyle = 'rgba(255, 209, 102, 0.5)';
  gameCtx.lineWidth = 1.5;
  gameCtx.beginPath();
  gameCtx.moveTo(balloonX, balloonY + 20);
  gameCtx.lineTo(balloonX, balloonY + 34);
  gameCtx.stroke();
}

// ───────────────── Draw the chart ─────────────────

function drawChart() {
  const w = chartCanvas.clientWidth;
  const h = chartCanvas.clientHeight;

  chartCtx.clearRect(0, 0, w, h);

  if (trace.length < 2) return;

  const stepX = w / (MAX_TRACE - 1);

  const draw = (key, colour, thickness) => {
    chartCtx.strokeStyle = colour;
    chartCtx.lineWidth = thickness;
    chartCtx.beginPath();

    trace.forEach((record, i) => {
      // Pin the newest reading to the right
      const px = w - (trace.length - 1 - i) * stepX;
      const py = (1 - height(record[key])) * h;

      if (i === 0) chartCtx.moveTo(px, py);
      else chartCtx.lineTo(px, py);
    });

    chartCtx.stroke();
  };

  draw('raw', COLOUR_RAW, 1);
  draw('average', COLOUR_AVERAGE, 2);
}

// ───────────────── The score table ─────────────────

function drawScores() {
  if (scores.length === 0) {
    scoreRows.innerHTML = '<tr class="empty"><td colspan="6">Finish a game and the first record is yours.</td></tr>';
    windowSummary.textContent = 'No games recorded yet.';
    return;
  }

  const myName = playerInput.value.trim();

  scoreRows.innerHTML = '';

  scores.forEach((record, i) => {
    const row = document.createElement('tr');
    if (myName && record.name === myName) row.className = 'mine';

    // We fill the cells with textContent. The player's name came from a
    // browser; with innerHTML the text you typed could run as HTML.
    [i + 1, record.name, record.score, record.round, record.window, record.time].forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    });

    scoreRows.appendChild(row);
  });

  drawWindowSummary();
}

// The real point of the table: telling you with data whether averaging helps.
function drawWindowSummary() {
  const raw = scores.filter((r) => r.window === 1);
  const averaged = scores.filter((r) => r.window > 1);

  const mean = (list) => Math.round(list.reduce((total, r) => total + r.score, 0) / list.length);

  if (raw.length === 0 || averaged.length === 0) {
    windowSummary.textContent =
      `${scores.length} games recorded. Try both modes — the table will tell you which one scores higher.`;
    return;
  }

  windowSummary.textContent =
    `Raw readings (window 1): ${raw.length} games, ${mean(raw)} points on average · ` +
    `Averaged (window 2+): ${averaged.length} games, ${mean(averaged)} points on average.`;
}

csvBtn.addEventListener('click', () => {
  if (scores.length === 0) return;

  const lines = [
    'rank,player,score,round,window,time',
    // A name can contain a comma; quote it and double any quotes inside.
    ...scores.map((r, i) => `${i + 1},"${String(r.name).replace(/"/g, '""')}",${r.score},${r.round},${r.window},${r.time}`),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'scores.csv';
  link.click();

  // Release the address so the browser can free the memory
  URL.revokeObjectURL(url);
});

// ───────────────── Messages from the board ─────────────────

// About 16 readings a second arrive. Each one is a single sample; the browser
// keeps the history in its own ring buffer.
ui.on_message('reading', (data) => {
  lastRaw = data.raw;
  lastAverage = data.average;
  lastReadingAt = performance.now();

  trace.push(data);
  if (trace.length > MAX_TRACE) trace.shift();

  connectionEl.textContent = 'Connected to the board';
  connectionEl.className = 'status connected';
});

// The whole table arrives once on connect, then again after every new score.
ui.on_message('scores', (data) => {
  scores = data.records || [];
  drawScores();
});

ui.on_message('state', (data) => {
  bestEl.textContent = data.best;

  windowInput.value = data.window;
  windowValue.textContent = data.window;

  connectionEl.textContent = 'Connected to the board';
  connectionEl.className = 'status connected';
});

// ───────────────── Start ─────────────────
resizeAll();
requestAnimationFrame(frame);
