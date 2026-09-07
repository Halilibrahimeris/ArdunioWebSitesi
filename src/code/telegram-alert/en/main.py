# Project 9 — Telegram Bot
# Arduino UNO Q  ·  python/main.py
#
# What it does
#   Runs a bot you can query over Telegram. It accumulates the motion events
#   the microcontroller reports and summarises them when you ask. It also
#   fetches the weather.
#
# A SECURITY NOTE
#   The bot token is NOT in this file, and must not be.
#   The telegram_bot brick reads it from the TELEGRAM_BOT_TOKEN environment
#   variable. Hardcode it and anyone you share the code with owns your bot.

import os
import time
from collections import deque

from arduino.app_utils import App, Bridge
from arduino.app_bricks.telegram_bot import TelegramBot, Sender, Message
from arduino.app_bricks.weather_forecast import WeatherForecast

# ───────────────── Settings ─────────────────

# The Telegram user IDs allowed to talk to your bot.
# Message @userinfobot on Telegram to find your own.
#
# Do NOT leave this list empty. Empty, and anyone who finds your bot's name
# can query the motion in your room.
ALLOWED_USERS = [
    123456789,   # ← put your own Telegram user ID here
]

# Default city for the weather
DEFAULT_CITY = os.environ.get("WEATHER_CITY", "London")

# How many motion events to keep in memory
HISTORY_SIZE = 100

# ───────────────── State ─────────────────
motion_history = deque(maxlen=HISTORY_SIZE)
started_at = time.time()

# ───────────────── Bricks ─────────────────
bot = TelegramBot(whitelist_user_ids=ALLOWED_USERS)
weather = WeatherForecast()


# ───────────────── From the microcontroller ─────────────────

def on_motion(value: int):
    """Called by the sketch whenever the PIR sensor triggers."""
    motion_history.append(time.time())
    print(f"Motion recorded. Total: {len(motion_history)}")


# ───────────────── Helpers ─────────────────

def humanise(seconds: float) -> str:
    """Turns 142 seconds into readable text like '2 minutes'."""
    seconds = int(seconds)

    if seconds < 60:
        return f"{seconds} seconds"
    if seconds < 3600:
        return f"{seconds // 60} minutes"
    if seconds < 86400:
        return f"{seconds // 3600} hours"
    return f"{seconds // 86400} days"


def motion_last_hour() -> int:
    now = time.time()
    return sum(1 for t in motion_history if now - t < 3600)


# ───────────────── Telegram commands ─────────────────

def command_start(sender: Sender, message: Message):
    sender.reply(
        f"Hello {sender.first_name}!\n\n"
        "I am running on an Arduino UNO Q and watching the motion in your room.\n\n"
        "Commands:\n"
        "/status - motion status\n"
        "/weather - the forecast\n"
        "/help - this list"
    )


def command_help(sender: Sender, message: Message):
    sender.reply(
        "Commands:\n\n"
        "/status - when motion last happened and how often\n"
        f"/weather - the forecast for {DEFAULT_CITY}\n"
        "/help - this list"
    )


def command_status(sender: Sender, message: Message):
    """Summarises the motion history."""
    uptime = humanise(time.time() - started_at)

    if not motion_history:
        sender.reply(
            "No motion detected yet.\n"
            f"I have been watching for {uptime}."
        )
        return

    since_last = time.time() - motion_history[-1]

    sender.reply(
        f"Last motion: {humanise(since_last)} ago\n"
        f"In the last hour: {motion_last_hour()} times\n"
        f"Total recorded: {len(motion_history)}\n"
        f"Uptime: {uptime}"
    )


def command_weather(sender: Sender, message: Message):
    """
    Fetches the forecast.

    This command needs the internet — the brick reaches an external service.
    Without a connection we tell the user rather than crashing.
    """
    # A user can type "/weather Berlin"
    parts = (message.text or "").split(maxsplit=1)
    city = parts[1].strip() if len(parts) > 1 else DEFAULT_CITY

    try:
        forecast = weather.get_forecast_by_city(city)
        sender.reply(f"{city}: {forecast.category}\n{forecast.description}")
    except Exception as error:
        # Network failure, unknown city, service down...
        print(f"Could not fetch the forecast: {error}")
        sender.reply(
            f"Could not get the forecast for {city}. "
            "Check the city name and make sure the board is online."
        )


def unknown_message(sender: Sender, message: Message):
    """Reply to anything that is not a command."""
    sender.reply("I did not understand that. Type /help to see the commands.")


# ───────────────── Registration ─────────────────
bot.add_command("start", command_start, "Start the bot")
bot.add_command("status", command_status, "Show the motion status")
bot.add_command("weather", command_weather, "Show the forecast")
bot.add_command("help", command_help, "List the commands")
bot.on_text(unknown_message)

Bridge.provide("motion", on_motion)

bot.start()

print("Telegram bot ready.")
print(f"Authorised users: {len(ALLOWED_USERS)}")

App.run()
