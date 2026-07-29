#!/usr/bin/env python3
"""CajaApp V3 - controlled local launcher.

Starts backend and frontend without detached child processes, executes the
idempotent legacy projection rowId repair before the backend starts, verifies
ports up front and owns the complete child-process lifecycle.
"""

from __future__ import annotations

import atexit
import os
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
BACKEND_DIR = PROJECT_ROOT / "workspace" / "backend"
FRONTEND_DIR = PROJECT_ROOT / "workspace" / "frontend"
BACKEND_PORT = 11436
FRONTEND_PORT = 11437
BACKEND_HEALTH_URL = f"http://127.0.0.1:{BACKEND_PORT}/health"
FRONTEND_URL = f"http://127.0.0.1:{FRONTEND_PORT}"
API_BASE_URL = f"http://127.0.0.1:{BACKEND_PORT}"
STARTUP_TIMEOUT_SECONDS = 180
POLL_INTERVAL_SECONDS = 1.0

backend_process: subprocess.Popen[bytes] | None = None
frontend_process: subprocess.Popen[bytes] | None = None
_stopping = False


def log(level: str, message: str) -> None:
    print(f"[{level}] {message}", file=sys.stderr, flush=True)


def node_executable() -> str:
    node = shutil.which("node")
    if not node:
        raise RuntimeError("Node.js was not found in PATH.")
    return node


def port_is_busy(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.25)
        return sock.connect_ex(("127.0.0.1", port)) == 0


def assert_ports_available() -> None:
    busy = [port for port in (BACKEND_PORT, FRONTEND_PORT) if port_is_busy(port)]
    if busy:
        ports = ", ".join(str(port) for port in busy)
        raise RuntimeError(
            f"Required port(s) already in use: {ports}. "
            f"Stop the existing CajaApp process or run scripts/kill-port.bat PORT."
        )


def child_popen_kwargs() -> dict[str, object]:
    if sys.platform == "win32":
        return {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP}
    return {"start_new_session": True}


def terminate_process_tree(process: subprocess.Popen[bytes] | None, name: str) -> None:
    if process is None or process.poll() is not None:
        return

    log("INFO", f"Stopping {name} (PID {process.pid})...")
    try:
        if sys.platform == "win32":
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(process.pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
        else:
            os.killpg(os.getpgid(process.pid), signal.SIGTERM)
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()
    except ProcessLookupError:
        pass
    except Exception as error:
        log("WARN", f"Could not stop {name} cleanly: {error}")


def stop_services() -> None:
    global _stopping
    if _stopping:
        return
    _stopping = True
    terminate_process_tree(frontend_process, "frontend")
    terminate_process_tree(backend_process, "backend")


def handle_signal(signum: int, _frame: object) -> None:
    log("INFO", f"Signal {signum} received; shutting down CajaApp V3.")
    stop_services()
    raise SystemExit(0)


def register_signal_handlers() -> None:
    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)
    if sys.platform == "win32" and hasattr(signal, "SIGBREAK"):
        signal.signal(signal.SIGBREAK, handle_signal)
    atexit.register(stop_services)


def run_legacy_projection_repair(node: str) -> None:
    command = [
        node,
        "node_modules/tsx/dist/cli.mjs",
        "src/scripts/repair-legacy-projection-rowids.ts",
    ]
    log("INFO", "Checking legacy installment projection references...")
    result = subprocess.run(
        command,
        cwd=str(BACKEND_DIR),
        env=os.environ.copy(),
        stdin=subprocess.DEVNULL,
        stdout=None,
        stderr=None,
        shell=False,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(
            "Legacy projection repair failed. Startup was stopped before serving financial data."
        )


def start_backend(node: str) -> subprocess.Popen[bytes]:
    env = os.environ.copy()
    env["PORT"] = str(BACKEND_PORT)
    command = [node, "node_modules/tsx/dist/cli.mjs", "watch", "src/main.ts"]
    process = subprocess.Popen(
        command,
        cwd=str(BACKEND_DIR),
        env=env,
        stdin=subprocess.DEVNULL,
        stdout=None,
        stderr=None,
        shell=False,
        **child_popen_kwargs(),
    )
    log("INFO", f"Backend started with PID {process.pid}.")
    return process


def start_frontend(node: str) -> subprocess.Popen[bytes]:
    env = os.environ.copy()
    env["NEXT_PUBLIC_API_BASE_URL"] = API_BASE_URL
    command = [node, "node_modules/next/dist/bin/next", "dev", "-p", str(FRONTEND_PORT)]
    process = subprocess.Popen(
        command,
        cwd=str(FRONTEND_DIR),
        env=env,
        stdin=subprocess.DEVNULL,
        stdout=None,
        stderr=None,
        shell=False,
        **child_popen_kwargs(),
    )
    log("INFO", f"Frontend started with PID {process.pid}.")
    return process


def wait_for_url(
    url: str,
    process: subprocess.Popen[bytes],
    service_name: str,
) -> None:
    deadline = time.monotonic() + STARTUP_TIMEOUT_SECONDS
    while time.monotonic() < deadline:
        return_code = process.poll()
        if return_code is not None:
            raise RuntimeError(f"{service_name} exited during startup with code {return_code}.")
        try:
            request = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(request, timeout=3) as response:
                if 200 <= response.status < 500:
                    log("OK", f"{service_name} ready at {url} (HTTP {response.status}).")
                    return
        except urllib.error.HTTPError as error:
            if 200 <= error.code < 500:
                log("OK", f"{service_name} ready at {url} (HTTP {error.code}).")
                return
        except (urllib.error.URLError, TimeoutError):
            pass
        time.sleep(POLL_INTERVAL_SECONDS)
    raise RuntimeError(f"{service_name} did not become ready within {STARTUP_TIMEOUT_SECONDS}s.")


def monitor_services() -> int:
    assert backend_process is not None
    assert frontend_process is not None
    while True:
        backend_code = backend_process.poll()
        frontend_code = frontend_process.poll()
        if backend_code is not None:
            raise RuntimeError(f"Backend stopped unexpectedly with code {backend_code}.")
        if frontend_code is not None:
            raise RuntimeError(f"Frontend stopped unexpectedly with code {frontend_code}.")
        time.sleep(1)


def main() -> int:
    global backend_process, frontend_process

    register_signal_handlers()
    try:
        if not BACKEND_DIR.is_dir() or not FRONTEND_DIR.is_dir():
            raise RuntimeError(f"Invalid CajaApp V3 root: {PROJECT_ROOT}")

        node = node_executable()
        assert_ports_available()
        run_legacy_projection_repair(node)

        backend_process = start_backend(node)
        wait_for_url(BACKEND_HEALTH_URL, backend_process, "Backend")

        frontend_process = start_frontend(node)
        wait_for_url(FRONTEND_URL, frontend_process, "Frontend")

        log("OK", f"CajaApp V3 ready: frontend={FRONTEND_URL} backend={API_BASE_URL}")
        log("INFO", "Press Ctrl+C to stop both services.")
        return monitor_services()
    except KeyboardInterrupt:
        return 130
    except Exception as error:
        log("ERROR", str(error))
        return 1
    finally:
        stop_services()


if __name__ == "__main__":
    raise SystemExit(main())
