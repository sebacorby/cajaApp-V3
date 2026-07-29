#!/usr/bin/env python3
"""Start only the CajaApp V3 backend in the foreground.

This helper intentionally does NOT detach the Node process. The Python process
remains the lifecycle owner so Ctrl+C and terminal shutdown do not leave a
hidden backend occupying port 11436.
"""

from __future__ import annotations

import os
import shutil
import socket
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
BACKEND_DIR = PROJECT_ROOT / "workspace" / "backend"
BACKEND_PORT = 11436


def port_is_busy(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.25)
        return sock.connect_ex(("127.0.0.1", port)) == 0


def main() -> int:
    if port_is_busy(BACKEND_PORT):
        print(
            f"ERROR: port {BACKEND_PORT} is already in use. "
            f"Stop the existing backend or run scripts/kill-port.bat {BACKEND_PORT}.",
            file=sys.stderr,
        )
        return 1

    node = shutil.which("node")
    if not node:
        print("ERROR: node was not found in PATH.", file=sys.stderr)
        return 1

    env = os.environ.copy()
    env["PORT"] = str(BACKEND_PORT)

    command = [
        node,
        "node_modules/tsx/dist/cli.mjs",
        "watch",
        "src/main.ts",
    ]

    try:
        return subprocess.call(
            command,
            cwd=str(BACKEND_DIR),
            env=env,
            stdin=None,
            stdout=None,
            stderr=None,
            shell=False,
        )
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
