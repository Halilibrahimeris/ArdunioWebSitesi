# Project 10 — Seeing, Speaking Assistant
# Arduino UNO Q  ·  python/main.py
#
# What it does
#   1. Watches the camera continuously and records what it recognises
#   2. Listens on the microphone; when it hears a question like "what do you see"
#   3. Answers out loud through the speaker
#   4. Shows everything that happens in a web panel
#
# Four bricks run at once, each minding its own business. The only thing tying
# them together is the shared state below.

import time
from collections import deque

from arduino.app_utils import App, Bridge
from arduino.app_bricks.video_objectdetection import VideoObjectDetection
from arduino.app_bricks.asr import AutomaticSpeechRecognition
from arduino.app_bricks.tts import TextToSpeech
from arduino.app_bricks.web_ui import WebUI

# ───────────────── Settings ─────────────────

# Detection confidence: 0.4 means "only tell me if you are at least 40% sure".
# Lower it and it finds more things, but gets more of them wrong.
CONFIDENCE = 0.4

# A cooldown so the same object is not reported dozens of times a second
DEBOUNCE_SEC = 1.5

# How many seconds the microphone listens for on each pass
LISTEN_SECONDS = 5

# How many events the panel shows
LOG_SIZE = 40

# The words we look for to recognise a question.
# Speech recognition is never perfectly accurate, so we search for keywords
# rather than matching a whole sentence.
SEEING_WORDS = ["see", "seeing", "what is there", "look"]

# ───────────────── Shared state ─────────────────
# The one place all four bricks reach into.
state = {
    "objects": {},          # {"person": 0.87, "cup": 0.66}
    "last_seen": 0.0,       # timestamp
    "last_heard": "",       # the last sentence the microphone understood
    "listening": False,
}

log = deque(maxlen=LOG_SIZE)

# ───────────────── Bricks ─────────────────
camera = VideoObjectDetection(confidence=CONFIDENCE, debounce_sec=DEBOUNCE_SEC)
microphone = AutomaticSpeechRecognition()
voice = TextToSpeech()
ui = WebUI()


def add_to_log(kind: str, text: str):
    """Adds one line to the event log shown in the panel."""
    log.append({
        "kind": kind,
        "text": text,
        "time": time.strftime("%H:%M:%S"),
    })
    ui.send_message("log", {"records": list(log)})


# ───────────────── The camera ─────────────────

def objects_seen(detections: dict):
    """
    Called every time the camera recognises something.
    detections looks like: {"person": 0.87, "cup": 0.66}
    """
    if not detections:
        return

    rounded = {name: round(score, 2) for name, score in detections.items()}

    state["objects"] = rounded
    state["last_seen"] = time.time()

    ui.send_message("state", state)
    add_to_log("seen", ", ".join(rounded.keys()))


def person_seen():
    """
    Called when the "person" label appears. This callback takes no arguments.
    We centre the servo to pay attention.
    """
    Bridge.call("servo_centre")
    add_to_log("person", "Person detected")


camera.on_detect_all(objects_seen)
camera.on_detect("person", person_seen)


# ───────────────── Building an answer ─────────────────

def describe_view() -> str:
    """Builds a sentence out of what the camera last saw."""
    objects = state["objects"]

    # If nothing has been seen for a while, do not present stale data as current
    if not objects or (time.time() - state["last_seen"]) > 10:
        return "I cannot see anything I recognise right now."

    names = list(objects.keys())

    if len(names) == 1:
        return f"I can see a {names[0]}."

    return f"I can see {', '.join(names[:-1])} and {names[-1]}."


def speak(text: str):
    """Says something through the speaker and writes it to the panel."""
    print(f"Speaking: {text}")
    add_to_log("answer", text)
    voice.speak(text)


# ───────────────── The microphone loop ─────────────────

def listen():
    """
    App.run(user_loop=...) calls this function over and over.
    Each pass listens for five seconds and considers what it heard.
    """
    state["listening"] = True
    ui.send_message("state", state)

    try:
        heard = microphone.transcribe(duration=LISTEN_SECONDS)
    except Exception as error:
        # The microphone may have been unplugged; do not crash the app
        print(f"Could not read the microphone: {error}")
        time.sleep(2)
        return
    finally:
        state["listening"] = False

    if not heard or not heard.strip():
        return

    heard = heard.strip()
    state["last_heard"] = heard
    ui.send_message("state", state)
    add_to_log("heard", heard)

    lowered = heard.lower()

    if any(word in lowered for word in SEEING_WORDS):
        speak(describe_view())


# ───────────────── From the web panel ─────────────────

def panel_asked(sid, data):
    """The user pressed the "What do you see?" button in the panel."""
    speak(describe_view())


def panel_speak(sid, data):
    """The user typed something into the panel to be spoken."""
    text = str(data.get("text", "")).strip()[:200]
    if text:
        speak(text)


def on_connect(sid):
    ui.send_message("state", state)
    ui.send_message("log", {"records": list(log)})


ui.on_message("what_do_you_see", panel_asked)
ui.on_message("speak", panel_speak)
ui.on_connect(on_connect)


print("Assistant ready. The camera is watching and the microphone is listening.")
print(f"Confidence: {CONFIDENCE}, listen window: {LISTEN_SECONDS} s")

# Given a user_loop, App.run() calls that function repeatedly. The camera and
# web interface keep running in the background through their own callbacks.
App.run(user_loop=listen)
