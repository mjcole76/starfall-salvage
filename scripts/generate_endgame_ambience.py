#!/usr/bin/env python3
"""
Seamless 30s endgame bed: urgent pulse, light ticks, alarm tint (ffmpeg).
All partials satisfy f*30 ∈ Z for clean PCM period. No commas in expr (lavfi).
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPR_FILE = Path(__file__).with_name("endgame_loop_expr.txt")
OUT = ROOT / "public" / "audio" / "mission_endgame_loop.ogg"


def main() -> int:
    expr = EXPR_FILE.read_text(encoding="utf-8").strip()
    if "," in expr:
        print("Error: comma in expr breaks lavfi", file=sys.stderr)
        return 1
    src = f"aevalsrc=sample_rate=44100:duration=30:exprs={expr}"
    OUT.parent.mkdir(parents=True, exist_ok=True)
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
            "highpass=f=45,lowpass=f=3400,volume=-5dB,alimiter=limit=0.93",
            "-ac",
            "1",
            "-c:a",
            "libopus",
            "-b:a",
            "64k",
            "-compression_level",
            "10",
            str(OUT),
        ],
        check=True,
    )
    print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KiB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
