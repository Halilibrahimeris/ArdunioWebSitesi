# Project 6 — Distance-Controlled Web Game
# Arduino UNO Q  ·  python/main.py  (runs on the Linux side)
#
# What does it do?
#   Opens a web server with the web_ui brick. It forwards every measurement
#   coming from the microcontroller to the browser, and validates every
#   command coming from the browser before passing it on.
#
# The chain runs both ways:
#   sensor → microcontroller → Bridge.notify → Python → WebSocket → browser
#   browser → WebSocket → Python → Bridge.call → microcontroller → LEDs/buzzer

import json
import time
from pathlib import Path

from arduino.app_utils import App, Bridge
from arduino.app_bricks.web_ui import WebUI

# ───────────────── Settings ─────────────────
# These must match PLAY_MIN / PLAY_MAX in the sketch.
PLAY_MIN = 5.0
PLAY_MAX = 60.0

WINDOW_MIN = 1
WINDOW_MAX = 9

# ───────────────── The score file ─────────────────
# If the scores only lived in `state` they would vanish every time the app
# restarted. A plain JSON file is enough here: readable, portable, and you
# reset it by deleting the file.
#
# Why not the dbstorage_tsstore brick? That brick is for time series — for
# NUMBERS arriving every second. A score record also carries text such as the
# player's name, and it is written once per game, not once per second. Pick
# the store that fits the shape of the data.
SCORE_FILE = Path(__file__).parent / "scores.json"
SCORE_LIMIT = 50   # At most this many records are kept in the file
NAME_LENGTH = 16

# ───────────────── State ─────────────────
# Kept so a browser that connects later also gets the current settings.
state = {
    "window": 5,
    "targetNear": 20.0,
    "targetFar": 30.0,
    "best": 0,
}

# The score list, sorted from highest to lowest
scores = []

ui = WebUI()


def broadcast():
    """Sends the current state to every connected browser."""
    ui.send_message("state", state)


def broadcast_scores():
    """Sends the score table to every connected browser."""
    ui.send_message("scores", {"records": scores})


# ───────────────── The score file ─────────────────


def load_scores():
    """Reads the scores into memory. Missing or broken file means we start empty."""
    global scores

    if not SCORE_FILE.exists():
        scores = []
        return

    try:
        with SCORE_FILE.open(encoding="utf-8") as f:
            data = json.load(f)
        # Somebody may have edited the file by hand; ignore anything unexpected.
        scores = data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError) as error:
        print(f"Could not read scores.json, starting with an empty list: {error}")
        scores = []


def save_scores():
    """
    Writes the list to the file.

    We write to a temporary file first and then move it into place, so that a
    crash halfway through never leaves us with half a JSON file.
    """
    temporary = SCORE_FILE.with_name(SCORE_FILE.name + ".tmp")
    try:
        with temporary.open("w", encoding="utf-8") as f:
            json.dump(scores, f, ensure_ascii=False, indent=2)
        temporary.replace(SCORE_FILE)
    except OSError as error:
        print(f"Could not write scores.json: {error}")


def clean_name(raw) -> str:
    """
    Makes the player's name safe to display.

    This is a SECURITY boundary too: never trust text from a browser as it
    stands. We drop invisible characters, cap the length, and name the
    nameless.
    """
    if not isinstance(raw, str):
        return "Guest"

    cleaned = "".join(ch for ch in raw if ch.isprintable()).strip()
    cleaned = " ".join(cleaned.split())      # Collapse runs of whitespace
    cleaned = cleaned[:NAME_LENGTH]

    return cleaned or "Guest"


def to_number(value, low, high, fallback):
    """
    Makes a number coming from the browser safe.

    This is a SECURITY boundary: never trust data from a browser as it stands.
    Anything that is not a number falls back, and numbers are clamped to range.
    """
    try:
        number = float(value)
    except (TypeError, ValueError):
        return fallback
    return max(low, min(high, number))


# ───────────────── Coming from the microcontroller ─────────────────


def on_reading(raw: float, average: float):
    """
    The sketch calls this on every measurement (~16 times a second).

    We do no maths here — the average was already taken in the ring buffer on
    the board, which is where the data is born. Python only carries it.
    """
    ui.send_message("reading", {"raw": round(raw, 1), "average": round(average, 1)})


# ───────────────── Coming from the browser ─────────────────


def set_target(sid, data):
    """A new round started: the bottom and top edge of the target band."""
    near = to_number(data.get("near"), PLAY_MIN, PLAY_MAX, state["targetNear"])
    far = to_number(data.get("far"), PLAY_MIN, PLAY_MAX, state["targetFar"])

    # Fix it if the browser sends them the wrong way round
    if far < near:
        near, far = far, near

    state["targetNear"] = near
    state["targetFar"] = far

    # We send millimetres to the board: 20.0 cm → 200.
    # Whole numbers remove every question about decimal formats on the bridge.
    Bridge.call("set_target", int(near * 10), int(far * 10))
    broadcast()


def clear_target(sid, data):
    """Game over: let the LEDs go dark and clear the bracket on the matrix."""
    Bridge.call("clear_target")


def set_window(sid, data):
    """The averaging window. 1 = no average, the raw reading itself."""
    window = int(to_number(data.get("window"), WINDOW_MIN, WINDOW_MAX, state["window"]))
    state["window"] = window
    Bridge.call("set_window", window)
    broadcast()


def celebrate(sid, data):
    """Target held: let the buzzer on the board play a short tune."""
    Bridge.call("beep_success")


def report_score(sid, data):
    """The game ended: add the score to the table, write the file, tell everyone."""
    score = int(to_number(data.get("score"), 0, 100000, 0))

    # Games that ended without a single point do not belong in the table
    if score <= 0:
        return

    record = {
        "name": clean_name(data.get("name")),
        "score": score,
        "round": int(to_number(data.get("round"), 1, 999, 1)),
        # Storing the window next to the score is what lets the table answer
        # "does averaging actually help?" with data instead of opinion.
        "window": state["window"],
        "time": time.strftime("%Y-%m-%d %H:%M"),
    }

    scores.append(record)
    scores.sort(key=lambda r: r["score"], reverse=True)
    del scores[SCORE_LIMIT:]     # Never let the list grow without bound

    save_scores()

    state["best"] = scores[0]["score"]
    print(f"Score saved: {record['name']} {score} points (window {record['window']})")

    broadcast()
    broadcast_scores()


def on_connect(sid):
    broadcast()
    broadcast_scores()

    # Python is the one owner of this setting. We push it to the board again so
    # the board and the browser never look at different windows — otherwise you
    # get the baffling "the green LED is on but I am not scoring" bug.
    Bridge.call("set_window", state["window"])

    print(f"Browser connected: {sid}")


# ───────────────── Wire up the events ─────────────────
ui.on_message("set_target", set_target)
ui.on_message("clear_target", clear_target)
ui.on_message("set_window", set_window)
ui.on_message("celebrate", celebrate)
ui.on_message("report_score", report_score)
ui.on_connect(on_connect)

# Receive the measurement from the sketch.
# This name must match Bridge.notify("reading", ...) in the sketch EXACTLY.
Bridge.provide("reading", on_reading)

# ───────────────── Bring back the saved scores ─────────────────
load_scores()
if scores:
    state["best"] = scores[0]["score"]

print(f"Score file: {SCORE_FILE}  ({len(scores)} records)")
print("Distance game interface ready.")

App.run()
