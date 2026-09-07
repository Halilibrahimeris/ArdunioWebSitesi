# Project 5 — Data Logger
# Arduino UNO Q  ·  python/main.py  (runs on the Linux side, on the QRB2210)
#
# What it does
#   Receives sensor readings from the microcontroller, writes them into a
#   time-series database and also keeps a human-readable CSV file.
#
# The idea here: the microcontroller MEASURES, Linux STORES.
# The two talk over Bridge.

import csv
import time
from pathlib import Path

from arduino.app_utils import App, Bridge
from arduino.app_bricks.dbstorage_tsstore import TimeSeriesStore

# ───────────────── Database ─────────────────
# Thanks to the brick we never install a database or create a table.
db = TimeSeriesStore()
db.start()

# ───────────────── CSV file ─────────────────
# A database is convenient for programs, but if you want to open the data in
# a spreadsheet a plain CSV is easiest. We keep both.
CSV_PATH = Path(__file__).parent / "readings.csv"

# Write the header row if the file does not exist yet
if not CSV_PATH.exists():
    with CSV_PATH.open("w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerow(["time", "temperature_C", "humidity_pct", "light_raw"])

# How many readings have we stored?
sample_count = 0


def store_reading(temperature: float, humidity: float, light: int):
    """
    Called by the sketch.

    Because it is registered with Bridge.provide(), the microcontroller can
    call it by name. The parameters arrive in the order the sketch sent them.
    """
    global sample_count

    # ── Validate what arrived ──
    # A failing sensor can send nonsense. Storing junk data is worse than
    # storing nothing at all.
    if not (-40 <= temperature <= 80):
        print(f"Skipped an invalid temperature: {temperature}")
        return
    if not (0 <= humidity <= 100):
        print(f"Skipped an invalid humidity: {humidity}")
        return

    # ── Write to the database ──
    db.write_sample("temperature", temperature)
    db.write_sample("humidity", humidity)
    db.write_sample("light", light)

    # ── Append to the CSV ──
    stamp = time.strftime("%Y-%m-%d %H:%M:%S")
    with CSV_PATH.open("a", newline="", encoding="utf-8") as f:
        csv.writer(f).writerow([stamp, f"{temperature:.1f}", f"{humidity:.0f}", light])

    sample_count += 1
    print(f"[{sample_count:4d}] {stamp}  {temperature:.1f}°C  {humidity:.0f}%  light={light}")


def print_last_values():
    """Reads the most recently stored values back out of the database."""
    last_temperature = db.read_last_sample("temperature")
    last_humidity = db.read_last_sample("humidity")
    print(f"Last record in the database -> temperature: {last_temperature}, humidity: {last_humidity}")


# ───────────────── Register with Bridge ─────────────────
# The string here ("store_reading") must match the one in the sketch's
# Bridge.notify call EXACTLY. A typo produces no error message at all —
# simply nothing happens.
Bridge.provide("store_reading", store_reading)

print("Data logger ready. Waiting for readings from the microcontroller...")
print(f"CSV file: {CSV_PATH}")

# Blocks here until the app is stopped
App.run()
