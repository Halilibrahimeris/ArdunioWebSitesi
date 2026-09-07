# Project 8 — Live Sensor Dashboard
# Arduino UNO Q  ·  python/main.py
#
# This file does three jobs:
#   1. Receives readings from the microcontroller (Bridge)
#   2. Stores them in a time-series database (dbstorage_tsstore)
#   3. Broadcasts them live to every connected browser (web_ui)

import time
from collections import deque

from arduino.app_utils import App, Bridge
from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.dbstorage_tsstore import TimeSeriesStore

# ───────────────── Settings ─────────────────
# How many recent readings the browser shows.
# One reading every 2 seconds × 150 = the last 5 minutes.
HISTORY_SIZE = 150

ui = WebUI()

db = TimeSeriesStore()
db.start()

# ───────────────── In-memory history ─────────────────
# deque(maxlen=...) is a fixed-length list: adding a new item drops the oldest
# automatically. It is Python's equivalent of the ring buffer from project 4.
history = deque(maxlen=HISTORY_SIZE)

count = 0


def on_reading(temperature: float, humidity: float, light: int):
    """
    Called by the sketch for every reading.
    Registered with Bridge.provide, so the microcontroller can call it by name.
    """
    global count

    # ── Validate at the boundary ──
    # Broken data goes neither into the database nor onto the chart.
    if not (-40 <= temperature <= 80) or not (0 <= humidity <= 100):
        print(f"Skipped an invalid reading: {temperature} C, {humidity}%")
        return

    light = max(0, min(100, int(light)))

    record = {
        "t": round(temperature, 1),
        "h": round(humidity),
        "l": light,
        "time": time.strftime("%H:%M:%S"),
    }

    # ── 1. Store it permanently ──
    db.write_sample("temperature", temperature)
    db.write_sample("humidity", humidity)
    db.write_sample("light", light)

    # ── 2. Append to the in-memory history ──
    history.append(record)

    # ── 3. Broadcast to connected browsers ──
    # We send one reading and let the browser append it to its own chart.
    # Sending the whole history every time would be wasted traffic.
    ui.send_message("reading", record)

    count += 1
    if count % 10 == 0:
        print(f"{count} readings processed. Latest: {record['t']} C, {record['h']}%")


def on_connect(sid):
    """
    Send the whole history to a newly connected browser.

    Without this the user would open the page to an empty chart and wait two
    seconds for the first point to appear.
    """
    ui.send_message("history", {"records": list(history)})
    print(f"Browser connected: {sid} ({len(history)} records sent)")


def on_history_request(sid, data):
    """The browser asked for the history again (after a refresh, say)."""
    ui.send_message("history", {"records": list(history)})


# ───────────────── Wire everything up ─────────────────
Bridge.provide("reading", on_reading)

ui.on_connect(on_connect)
ui.on_message("request_history", on_history_request)

print("Live dashboard ready. Open it from any browser on the same WiFi network.")

App.run()
