#!/usr/bin/env python3
"""Build local DDZ voice clips and original short effects; never used at runtime.

In an isolated Python environment install kokoro==0.9.4, misaki[zh]==0.9.4,
soundfile, numpy and scipy. Download the pinned models listed in AUDIO_SOURCES.md
to MODEL_DIR/{zh,multi}; model weights are deliberately excluded from the repo.
Usage: python generate-doudizhu-audio.py --models MODEL_DIR [--voices] [--effects]
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

RATE = 24000
OUTPUT = Path(__file__).resolve().parents[1] / "public/sounds/doudizhu"
PHRASES = {
    "zh-CN": {"pass": "不出！", "straight": "顺子！", "pairs": "连对！",
              "airplane": "飞机！", "rocket": "王炸！", "bomb": "炸弹！"},
    "en": {"pass": "Pass!", "straight": "Straight!", "pairs": "Pair run!",
           "airplane": "Airplane!", "rocket": "Rocket!", "bomb": "Bomb!"},
    "fr": {"pass": "Je passe !", "straight": "Suite !", "pairs": "Suite de paires !",
           "airplane": "Avion !", "rocket": "Fusée !", "bomb": "Bombe !"},
}


def save(relative, audio, peak=0.355):
    audio = np.asarray(audio, dtype=np.float64)
    audio -= audio.mean()
    amplitude = np.abs(audio).max()
    if amplitude < 1e-6:
        raise ValueError(f"Silent audio: {relative}")
    audio *= peak / amplitude
    edge = min(160, len(audio) // 10)
    audio[:edge] *= np.linspace(0, 1, edge)
    audio[-edge:] *= np.linspace(1, 0, edge)
    path = OUTPUT / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(path, audio, RATE, subtype="PCM_16")
    return {"file": relative, "duration": round(len(audio) / RATE, 4),
            "peakDbfs": round(20 * np.log10(np.abs(audio).max()), 2),
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}


def effects():
    """Seeded synthesis: paper/wood transients, plucks and soft air; no samples."""
    rng = np.random.default_rng(20261016)
    result = []
    for kind, duration in [("pass", .23), ("straight", .95), ("pairs", 1.02),
                           ("airplane", 1.2), ("rocket", 1.3), ("bomb", .82)]:
        t = np.arange(round(duration * RATE)) / RATE
        y = np.zeros_like(t)
        noise = sosfilt(butter(2, 2600, fs=RATE, output="sos"), rng.normal(size=len(t)))

        def note(start, frequency, gain=.2, decay=.12):
            age = np.maximum(0, t - start)
            envelope = (t >= start) * (1 - np.exp(-age * 800)) * np.exp(-age / decay)
            return gain * envelope * (np.sin(2*np.pi*frequency*age) + .22*np.sin(4*np.pi*frequency*age))

        # A restrained tactile onset joins the accepted card placement.
        y += .045 * noise * np.exp(-t / .026)
        if kind == "pass":
            y += note(0, 380, .3, .045) + note(.055, 230, .13, .045)
        elif kind == "straight":
            for i, frequency in enumerate([392, 440, 494, 587, 659, 784]):
                y += note(i * .105, frequency, .19, .10)
        elif kind == "pairs":
            for i, frequency in enumerate([330, 392, 494, 587]):
                y += note(i * .17, frequency, .16, .10)
                y += note(i * .17 + .055, frequency * 1.5, .13, .10)
        elif kind == "airplane":
            envelope = np.sin(np.pi * np.minimum(t/duration, 1)) ** 1.6
            y += .22 * noise * envelope * (1 + .18*np.sin(2*np.pi*14*t))
            y += .055 * np.sin(2*np.pi*(140*t + 210*t*t)) * envelope
            y += note(.34, 660, .10, .23)
        elif kind == "rocket":
            rise = np.minimum(t/.31, 1) * np.exp(-np.maximum(0, t-.31)/.27)
            y += .15 * noise * rise
            y += .065*np.sin(2*np.pi*(100*t+390*t*t))*rise
            y += note(.32, 82, .22, .12) + note(.32, 164, .12, .11)
            for i, frequency in enumerate([523, 659, 784, 1046]):
                y += note(.37+i*.12, frequency, .13, .15)
        else:
            y += note(.08, 85, .3, .10) + note(.08, 170, .14, .08)
            y += .16 * noise * (t >= .08) * np.exp(-np.maximum(t-.08, 0)/.08)
            y += note(.24, 392, .075, .14)
        y *= np.minimum(1, (duration-t)/.05)
        result.append({"kind": kind, "source": "Original deterministic synthesis", **save(f"{kind}.wav", y)})
    return result


def voices(models):
    import torch
    from kokoro import KModel, KPipeline
    torch.set_num_threads(2)
    torch.manual_seed(20261016)
    results = []
    specifications = [
        ("zh", "hexgrad/Kokoro-82M-v1.1-zh", "kokoro-v1_1-zh.pth", [("zh-CN", "z", "zf_001", 1.13)]),
        ("multi", "hexgrad/Kokoro-82M", "kokoro-v1_0.pth", [("en", "a", "af_heart", 1.12), ("fr", "f", "ff_siwis", 1.15)]),
    ]
    for folder, repo, weights, languages in specifications:
        model_dir = models / folder
        model = KModel(repo_id=repo, config=str(model_dir / "config.json"), model=str(model_dir / weights)).to("cpu").eval()
        for locale, language, voice, speed in languages:
            pipeline = KPipeline(lang_code=language, repo_id=repo, model=model)
            for kind, text in PHRASES[locale].items():
                with torch.inference_mode():
                    outputs = list(pipeline(text, voice=str(model_dir / "voices" / f"{voice}.pt"), speed=speed))
                audio = np.concatenate([item.audio.numpy() for item in outputs])
                # Preserve consonants with a 15ms margin, remove synthesis padding.
                active = np.flatnonzero(np.abs(audio) > .004)
                if not len(active):
                    raise ValueError(f"Empty speech: {locale} {text}")
                audio = audio[max(0, active[0]-360):min(len(audio), active[-1]+720)]
                audio = sosfilt(butter(2, 75, btype="highpass", fs=RATE, output="sos"), audio)
                item = {"kind": kind, "locale": locale, "text": text, "voice": voice,
                        "model": repo, "speed": speed,
                        "phonemes": " ".join(item.phonemes for item in outputs),
                        **save(f"voice/{locale}/{kind}.wav", audio, peak=.70)}
                print(json.dumps(item, ensure_ascii=False), flush=True)
                results.append(item)
        del model
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--models", type=Path, default=Path("/tmp/friemi-ddz-audio-models"))
    parser.add_argument("--voices", action="store_true")
    parser.add_argument("--effects", action="store_true")
    args = parser.parse_args()
    manifest_path = OUTPUT / "audio-manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {"sampleRate": RATE}
    if args.effects:
        manifest["effects"] = effects()
    if args.voices:
        manifest["voices"] = voices(args.models)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
