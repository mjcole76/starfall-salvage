#!/usr/bin/env python3
"""
Regenerate seamless mission bed (48s). All partials complete integer cycles in 48s
so PCM loops sample-accurate. Outputs OGG Opus for the game; optional WAV.

Requires: ffmpeg on PATH
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPR_FILE = Path(__file__).with_name("mission_loop_expr.txt")
OUT_DIR = ROOT / "public" / "audio"


def main() -> int:
    expr = EXPR_FILE.read_text(encoding="utf-8").strip()
    if "," in expr:
        print("Error: comma in expr breaks lavfi parsing; use x*x instead of pow(x,2)", file=sys.stderr)
        return 1
    src = f"aevalsrc=sample_rate=44100:duration=48:exprs={expr}"
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ogg = OUT_DIR / "mission_ambience_loop.ogg"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            src,
            "-af",
            "highpass=f=42,lowpass=f=3000,volume=-6dB,alimiter=limit=0.92",
            "-ac",
            "1",
            "-c:a",
            "libopus",
            "-b:a",
            "56k",
            "-compression_level",
            "10",
            str(ogg),
        ],
        check=True,
    )
    print(f"Wrote {ogg} ({ogg.stat().st_size // 1024} KiB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
