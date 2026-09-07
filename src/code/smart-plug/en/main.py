# Project 7 — Smart Plug
# Arduino UNO Q  ·  python/main.py
#
# Bridges the web interface and the microcontroller.
# Both directions are in use here:
#   browser → Python → Bridge.call   → sketch   (commands)
#   sketch  → Bridge.notify → Python → browser  (timer-expired notification)

from arduino.app_utils import App, Bridge
from arduino.app_bricks.web_ui import WebUI

ui = WebUI()

# Kept so every newly connected browser can be brought up to date
state = {
    "relay": False,
    "color": {"r": 0, "g": 120, "b": 255},
    "brightness": 60,
    "timer": 0,          # minutes, 0 = no timer
}


def broadcast():
    """Send the current state to every connected browser."""
    ui.send_message("state", state)


def to_int(value, low, high, default):
    """
    Turns a value from the browser into a safe integer.

    A browser can send text, None, or a number outside the range. Without
    validating at the boundary, that value would go straight to the hardware.
    """
    try:
        number = int(value)
    except (TypeError, ValueError):
        return default
    return max(low, min(high, number))


# ───────────────── Commands from the browser ─────────────────

def set_relay(sid, data):
    on = bool(data.get("on", False))
    state["relay"] = on

    if not on:
        state["timer"] = 0        # Switching off by hand cancels the timer

    Bridge.call("set_relay", 1 if on else 0)
    broadcast()
    print(f"Relay: {'ON' if on else 'OFF'}")


def set_color(sid, data):
    r = to_int(data.get("r"), 0, 255, 0)
    g = to_int(data.get("g"), 0, 255, 120)
    b = to_int(data.get("b"), 0, 255, 255)

    state["color"] = {"r": r, "g": g, "b": b}

    Bridge.call("set_color", r, g, b)
    broadcast()


def set_brightness(sid, data):
    value = to_int(data.get("brightness"), 0, 255, 60)
    state["brightness"] = value

    Bridge.call("set_brightness", value)
    broadcast()


def set_timer(sid, data):
    minutes = to_int(data.get("minutes"), 0, 720, 0)   # 12 hours at most
    state["timer"] = minutes

    # Setting a timer should also switch the relay on — that is what a user expects
    if minutes > 0 and not state["relay"]:
        state["relay"] = True
        Bridge.call("set_relay", 1)

    Bridge.call("set_timer", minutes)
    broadcast()
    print(f"Timer: {minutes} minutes")


# ───────────────── Notification from the microcontroller ─────────────────

def relay_changed(state_value: int):
    """
    Called by the sketch when the timer expires and it switches the relay off
    on its own. Without this the web interface would still think it is on.
    """
    state["relay"] = bool(state_value)
    state["timer"] = 0
    broadcast()
    print("Timer expired, relay switched off")


def on_connect(sid):
    broadcast()
    print(f"Browser connected: {sid}")


# ───────────────── Wire the events up ─────────────────
ui.on_message("set_relay", set_relay)
ui.on_message("set_color", set_color)
ui.on_message("set_brightness", set_brightness)
ui.on_message("set_timer", set_timer)
ui.on_connect(on_connect)

# Receive the notification coming from the sketch
Bridge.provide("relay_changed", relay_changed)

print("Smart plug interface ready.")

App.run()
