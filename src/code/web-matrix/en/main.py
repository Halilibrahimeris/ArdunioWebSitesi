# Project 6 — Write to the LED Matrix from the Web
# Arduino UNO Q  ·  python/main.py  (runs on the Linux side)
#
# What it does
#   Uses the web_ui brick to serve a web page. Cleans up the text that arrives
#   from the browser and forwards it to the microcontroller over Bridge.
#
# The chain runs like this:
#   browser → WebSocket → Python → Bridge → microcontroller → LED matrix

from arduino.app_utils import App, Bridge
from arduino.app_bricks.web_ui import WebUI

# ───────────────── Settings ─────────────────
MAX_LENGTH = 60          # A sensible upper bound for scrolling text
DEFAULT_TEXT = "HELLO"

# The 3x5 font in the sketch only knows these characters
ALLOWED = set("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .-!?:")

# ASCII equivalents for accented characters.
# Translating here is far cheaper than adding glyphs to the font.
ACCENT_MAP = str.maketrans({
    "Ç": "C", "ç": "C",
    "Ğ": "G", "ğ": "G",
    "İ": "I", "ı": "I",
    "Ö": "O", "ö": "O",
    "Ş": "S", "ş": "S",
    "Ü": "U", "ü": "U",
    "É": "E", "é": "E",
    "Á": "A", "á": "A",
    "Ñ": "N", "ñ": "N",
})

# ───────────────── State ─────────────────
# Kept so we can bring newly connected browsers up to date.
state = {
    "text": DEFAULT_TEXT,
    "brightness": 7,
    "speed": 90,
}

ui = WebUI()


def sanitise(raw: str) -> str:
    """
    Turns text from the browser into something the matrix can display.

    This is a SECURITY boundary: never trust what arrives from a browser as-is.
    A user can send 10,000 characters or symbols we have no glyph for.
    """
    text = str(raw).translate(ACCENT_MAP).upper()

    # Replace anything unsupported with a space
    text = "".join(ch if ch in ALLOWED else " " for ch in text)

    # Collapse runs of spaces and trim the ends
    text = " ".join(text.split())

    return text[:MAX_LENGTH]


# ───────────────── Messages from the browser ─────────────────

def set_text(sid, data):
    """The browser sent new text."""
    text = sanitise(data.get("text", ""))

    if not text:
        ui.send_message("error", {"message": "The text cannot be empty"})
        return

    state["text"] = text

    # Call show_text on the microcontroller.
    # This name must match Bridge.provide("show_text", ...) in the sketch.
    Bridge.call("show_text", text)

    # Tell every connected browser about the new state
    ui.send_message("state", state)
    print(f"Text now on the matrix: {text}")


def set_brightness(sid, data):
    """The brightness slider moved (0-7)."""
    try:
        value = int(data.get("brightness", 7))
    except (TypeError, ValueError):
        return

    value = max(0, min(7, value))
    state["brightness"] = value

    Bridge.call("set_brightness", value)
    ui.send_message("state", state)


def set_speed(sid, data):
    """The speed slider moved (milliseconds per column)."""
    try:
        value = int(data.get("speed", 90))
    except (TypeError, ValueError):
        return

    value = max(20, min(400, value))
    state["speed"] = value

    Bridge.call("set_speed", value)
    ui.send_message("state", state)


def on_connect(sid):
    """Bring a newly connected browser up to date."""
    ui.send_message("state", state)
    print(f"Browser connected: {sid}")


# ───────────────── Wire the events up ─────────────────
ui.on_message("set_text", set_text)
ui.on_message("set_brightness", set_brightness)
ui.on_message("set_speed", set_speed)
ui.on_connect(on_connect)

print("Web interface ready. Open it from any browser on the same WiFi network.")

App.run()
