"""Build Draw & Guess audio from the CC0 recordings listed in AUDIO_SOURCES.md.

Requires ffmpeg. Source files are downloaded on demand; no generated tones are used.
"""

from __future__ import annotations

from array import array
from pathlib import Path
import subprocess
import tempfile
import urllib.request
import wave
import zipfile


RATE = 24_000
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/sounds/draw-guess"
CACHE = Path(tempfile.gettempdir()) / "friemi-draw-guess-audio-sources"
BASE = "https://opengameart.org/sites/default/files/"
def source(name: str) -> Path:
    path = CACHE / name
    if not path.exists():
        request = urllib.request.Request(BASE + name, headers={"User-Agent": "FriemiDrawGuess/1.0"})
        with urllib.request.urlopen(request, timeout=30) as response:
            path.write_bytes(response.read())
    return path


def pcm(name: str) -> list[float]:
    if name.startswith("squeak"):
        with zipfile.ZipFile(source("squeak_toy.zip")) as archive:
            raw = archive.read(f"squeak toy/squeak toy - {name}")
        input_args = ["-f", "wav", "-i", "pipe:0"]
    else:
        raw = None
        input_args = ["-i", str(source(name))]
    command = ["ffmpeg", "-v", "error", *input_args, "-af", "highpass=f=120,lowpass=f=9000", "-ar", str(RATE), "-ac", "1", "-f", "s16le", "pipe:1"]
    data = subprocess.run(command, input=raw, stdout=subprocess.PIPE, check=True).stdout
    samples = array("h")
    samples.frombytes(data)
    return [value / 32768 for value in samples]


def render(name: str, layers: list[tuple[str, float, float, float | None]]) -> None:
    decoded = [(pcm(file), delay, gain, limit) for file, delay, gain, limit in layers]
    length = max(int(delay * RATE) + min(len(samples), int(limit * RATE) if limit else len(samples)) for samples, delay, _, limit in decoded)
    output = [0.0] * length
    for samples, delay, gain, limit in decoded:
        count = min(len(samples), int(limit * RATE) if limit else len(samples))
        offset = int(delay * RATE)
        for index in range(count):
            # Short fades remove clicks while leaving the original recording intact.
            fade = min(1.0, index / (RATE * .006), (count - index) / (RATE * .04))
            output[offset + index] += samples[index] * gain * max(0, fade)
    peak = max((abs(value) for value in output), default=1)
    target_peak = .34 if name == "wrong" else .5
    scale = min(10, target_peak / peak) if peak else 1
    samples = array("h", (int(max(-1, min(1, value * scale)) * 32767) for value in output))
    with wave.open(str(OUT / f"{name}.wav"), "wb") as target:
        target.setnchannels(1)
        target.setsampwidth(2)
        target.setframerate(RATE)
        target.writeframes(samples.tobytes())


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    render("cat", [("cat_mewfood.wav", 0, .9, 1.0)])
    render("purr", [("cat_mewpurr.wav", 0, .82, 1.4)])
    render("secret", [("squeak2.wav", 0, .7, None), ("pop8.wav", .30, .45, None)])
    render("ready", [("pop5.wav", 0, .8, None), ("pop2.wav", .15, .55, None)])
    render("start", [("squeak1.wav", 0, .56, None), ("pop9.wav", .21, .48, None)])
    render("correct", [("bell.wav", 0, .8, 1.5), ("pop5.wav", .12, .26, None)])
    render("wrong", [("squeak5.wav", 0, .48, None)])
    render("score", [("pleasing-bell.wav", 0, .8, None), ("pop6.wav", .12, .32, None)])
    render("next", [("pop3.wav", 0, .7, None), ("pop6.wav", .16, .63, None)])
    render("finish", [("winfretless_0.ogg", 0, .72, 3.75)])

    silence = b"\0\0" * int(RATE * .26)
    with wave.open(str(OUT / "demo.wav"), "wb") as target:
        target.setnchannels(1)
        target.setsampwidth(2)
        target.setframerate(RATE)
        for cue in ("cat", "purr", "secret", "ready", "start", "correct", "wrong", "score", "next", "finish"):
            with wave.open(str(OUT / f"{cue}.wav"), "rb") as item:
                target.writeframes(item.readframes(item.getnframes()))
            target.writeframes(silence)

    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(source("HappyClappyLoop.wav")), "-codec:a", "libmp3lame", "-b:a", "96k", str(OUT / "music.mp3")], check=True)


if __name__ == "__main__":
    main()
