#!/usr/bin/env python3
"""
CajaApp V3 - Dual Service Starter (Backend + Frontend)

Starts both the Fastify backend and Next.js frontend as subprocesses,
waits for each to be ready, and handles graceful shutdown on Ctrl+C.

Usage:
    python start-app.py

Requirements:
    - Node.js v24.18.0 (or compatible)
    - Python 3.11-3.14
    - npm packages installed in workspace/backend and workspace/frontend
"""

# Ensure ALL output goes to console (stderr) so it never gets swallowed
import sys
sys.stdout = sys.stderr

import subprocess
import time
import os
import signal
import urllib.request
import urllib.error
import traceback
import threading
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).parent.resolve()
BACKEND_DIR = PROJECT_ROOT / "workspace" / "backend"
FRONTEND_DIR = PROJECT_ROOT / "workspace" / "frontend"

BACKEND_PORT = 11436
FRONTEND_PORT = 11437

BACKEND_HEALTH_URL = f"http://127.0.0.1:{BACKEND_PORT}/health"
FRONTEND_URL = f"http://127.0.0.1:{FRONTEND_PORT}"
API_BASE_URL = f"http://127.0.0.1:{BACKEND_PORT}"

STARTUP_TIMEOUT_SECONDS = 180
POLL_INTERVAL_SECONDS = 2

# ---------------------------------------------------------------------------
# Console output helpers
# ---------------------------------------------------------------------------
def log_info(msg: str) -> None:
    print(f"\033[96m[INFO]\033[0m {msg}", flush=True)

def log_success(msg: str) -> None:
    print(f"\033[92m[OK]\033[0m {msg}", flush=True)

def log_warning(msg: str) -> None:
    print(f"\033[93m[WARN]\033[0m {msg}", flush=True)

def log_error(msg: str) -> None:
    print(f"\033[91m[ERROR]\033[0m {msg}", flush=True)

def log_step(msg: str) -> None:
    print(f"\n\033[95m{'=' * 60}\033[0m")
    print(f"\033[95m==> {msg}\033[0m")
    print(f"\033[95m{'=' * 60}\033[0m", flush=True)

# ---------------------------------------------------------------------------
# Process management
# ---------------------------------------------------------------------------
backend_process: subprocess.Popen | None = None
frontend_process: subprocess.Popen | None = None


def get_env_with_defaults() -> dict[str, str]:
    """Build the environment dict for subprocesses."""
    env = os.environ.copy()
    env["PORT"] = str(BACKEND_PORT)
    env["NEXT_PUBLIC_API_BASE_URL"] = API_BASE_URL
    return env


def terminate_process_tree(pid: int) -> None:
    """
    Gracefully terminate a process and all its children on Windows.
    Falls back to single-process termination on non-Windows.
    """
    if sys.platform == "win32":
        try:
            # Use taskkill to kill the process tree
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(pid)],
            )
        except Exception:
            log_warning(f"taskkill failed for PID {pid}: {traceback.format_exc()}")
            # Fallback: try to kill just the main process
            try:
                os.kill(pid, signal.SIGTERM)
            except (OSError, AttributeError):
                pass
    else:
        try:
            os.killpg(os.getpgid(pid), signal.SIGTERM)
        except (OSError, AttributeError):
            pass


def stop_services() -> None:
    """Stop both backend and frontend processes gracefully."""
    global backend_process, frontend_process

    log_step("Shutting down services")

    for name, proc in [("Frontend", frontend_process), ("Backend", backend_process)]:
        if proc is None:
            continue
        if proc.poll() is not None:
            log_info(f"{name} already stopped (exit code: {proc.returncode})")
        else:
            log_info(f"Stopping {name} (PID {proc.pid})...")
            try:
                terminate_process_tree(proc.pid)
                proc.wait(timeout=10)
                log_success(f"{name} stopped.")
            except subprocess.TimeoutExpired:
                log_warning(f"{name} did not stop gracefully, forcing...")
                try:
                    proc.kill()
                except Exception:
                    pass
            except Exception as e:
                log_warning(f"Error stopping {name}: {traceback.format_exc()}")


def signal_handler(signum, frame) -> None:
    """Handle Ctrl+C (SIGINT) gracefully."""
    log_warning("Interrupt received! Shutting down...")
    stop_services()
    sys.exit(0)


# ---------------------------------------------------------------------------
# Health check utilities
# ---------------------------------------------------------------------------
def wait_for_url(url: str, timeout_seconds: int, service_name: str) -> bool:
    """
    Poll a URL until it returns a non-5xx response or timeout is reached.
    Returns True if the service is ready, False otherwise.
    """
    deadline = time.time() + timeout_seconds
    log_info(f"Waiting for {service_name} to be ready at {url}...")

    while time.time() < deadline:
        try:
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=5) as resp:
                status = resp.getcode()
                if 200 <= status < 500:
                    log_success(f"{service_name} is ready (HTTP {status})")
                    return True
        except urllib.error.HTTPError as e:
            # Some servers return 404 or 401 even when running
            if 200 <= e.code < 500:
                log_success(f"{service_name} is ready (HTTP {e.code})")
                return True
            log_info(f"{service_name} returned HTTP {e.code}, retrying...")
        except urllib.error.URLError as e:
            log_info(f"{service_name} not ready yet: {e.reason}")
        except Exception as e:
            log_info(f"{service_name} not ready yet: {e}")

        time.sleep(POLL_INTERVAL_SECONDS)

    log_error(f"{service_name} did not become ready within {timeout_seconds} seconds")
    return False


# ---------------------------------------------------------------------------
# Service starters
# ---------------------------------------------------------------------------
def start_backend() -> bool:
    """Start the Fastify backend server."""
    global backend_process

    log_step("Starting Backend")

    if not BACKEND_DIR.exists():
        log_error(f"=====> STARTUP ERROR")
        log_error(f"Backend directory not found: {BACKEND_DIR}")
        log_error("Traceback:")
        for line in traceback.format_exc().strip().splitlines():
            log_error(f"  {line}")
        return False

    node_exe = shutil_which("node") or "node"
    log_info(f"Using Node: {node_exe}")

    cmd = [node_exe, "node_modules/tsx/dist/cli.mjs", "watch", "src/main.ts"]

    try:
        # Do NOT pipe stdout/stderr - let them go directly to console
        # Use shell=False to avoid cmd.exe interpreting bash scripts
        backend_process = subprocess.Popen(
            cmd,
            cwd=str(BACKEND_DIR),
            env=get_env_with_defaults(),
            stdout=None,   # Go to console directly
            stderr=None,   # Go to console directly
            stdin=subprocess.DEVNULL,
            shell=False,
        )
    except FileNotFoundError as e:
        log_error(f"=====> STARTUP ERROR")
        log_error(f"Backend command not found: {cmd[0]}")
        log_error("Traceback:")
        for line in traceback.format_exc().strip().splitlines():
            log_error(f"  {line}")
        return False
    except Exception as e:
        log_error(f"=====> STARTUP ERROR")
        log_error(f"Failed to start backend")
        log_error(f"Exception: {e}")
        log_error(f"Command: {' '.join(cmd)}")
        log_error(f"Working directory: {BACKEND_DIR}")
        log_error("Traceback:")
        for line in traceback.format_exc().strip().splitlines():
            log_error(f"  {line}")
        return False

    log_info(f"Backend started with PID {backend_process.pid}")
    log_info(f"Command: {' '.join(cmd)}")

    return True


def start_frontend() -> bool:
    """Start the Next.js frontend server."""
    global frontend_process

    log_step("Starting Frontend")

    if not FRONTEND_DIR.exists():
        log_error(f"=====> STARTUP ERROR")
        log_error(f"Frontend directory not found: {FRONTEND_DIR}")
        log_error("Traceback:")
        for line in traceback.format_exc().strip().splitlines():
            log_error(f"  {line}")
        return False

    node_exe = shutil_which("node") or "node"
    log_info(f"Using Node: {node_exe}")

    cmd = [node_exe, "node_modules/next/dist/bin/next", "dev", "-p", str(FRONTEND_PORT)]

    try:
        # Do NOT pipe stdout/stderr - let them go directly to console
        # Use shell=False to avoid cmd.exe interpreting bash scripts
        frontend_process = subprocess.Popen(
            cmd,
            cwd=str(FRONTEND_DIR),
            env=get_env_with_defaults(),
            stdout=None,   # Go to console directly
            stderr=None,   # Go to console directly
            stdin=subprocess.DEVNULL,
            shell=False,
        )
    except FileNotFoundError as e:
        log_error(f"=====> STARTUP ERROR")
        log_error(f"Frontend command not found: {cmd[0]}")
        log_error("Traceback:")
        for line in traceback.format_exc().strip().splitlines():
            log_error(f"  {line}")
        return False
    except Exception as e:
        log_error(f"=====> STARTUP ERROR")
        log_error(f"Failed to start frontend")
        log_error(f"Exception: {e}")
        log_error(f"Command: {' '.join(cmd)}")
        log_error(f"Working directory: {FRONTEND_DIR}")
        log_error("Traceback:")
        for line in traceback.format_exc().strip().splitlines():
            log_error(f"  {line}")
        return False

    log_info(f"Frontend started with PID {frontend_process.pid}")
    log_info(f"Command: {' '.join(cmd)}")

    return True


def shutil_which(cmd: str) -> str | None:
    """Find cmd in PATH, similar to shutil.which (added in Python 3.3)."""
    import shutil
    return shutil.which(cmd)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    print("")
    print("\033[95m" + "=" * 60 + "\033[0m")
    print("\033[95m  CajaApp V3 - Starting Backend & Frontend\033[0m")
    print("\033[95m" + "=" * 60 + "\033[0m")
    print(f"  Project root : {PROJECT_ROOT}")
    print(f"  Backend dir  : {BACKEND_DIR}")
    print(f"  Backend port : {BACKEND_PORT}")
    print(f"  Frontend dir : {FRONTEND_DIR}")
    print(f"  Frontend port: {FRONTEND_PORT}")
    print("\033[95m" + "=" * 60 + "\033[0m", flush=True)

    # Register Ctrl+C handler
    if sys.platform == "win32":
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    else:
        signal.signal(signal.SIGINT, signal_handler)

    # Check directories exist
    for name, path in [("Backend", BACKEND_DIR), ("Frontend", FRONTEND_DIR)]:
        if not path.exists():
            log_error(f"=====> STARTUP ERROR")
            log_error(f"{name} directory not found: {path}")
            log_error("Traceback:")
            for line in traceback.format_exc().strip().splitlines():
                log_error(f"  {line}")
            return 1

    # Start backend
    if not start_backend():
        stop_services()
        return 1

    # Wait for backend to be ready
    if not wait_for_url(BACKEND_HEALTH_URL, STARTUP_TIMEOUT_SECONDS, "Backend"):
        log_error(f"=====> STARTUP ERROR")
        log_error("Backend failed to start within the timeout period.")
        log_error(f"Check logs in: {BACKEND_DIR}")
        stop_services()
        return 1

    # Start frontend
    if not start_frontend():
        stop_services()
        return 1

    # Wait for frontend to be ready
    if not wait_for_url(FRONTEND_URL, STARTUP_TIMEOUT_SECONDS, "Frontend"):
        log_error(f"=====> STARTUP ERROR")
        log_error("Frontend failed to start within the timeout period.")
        log_error(f"Check logs in: {FRONTEND_DIR}")
        stop_services()
        return 1

    # All good!
    log_step("CajaApp V3 is running!")
    print("")
    print(f"  \033[92mFrontend:\033[0m {FRONTEND_URL}")
    print(f"  \033[92mBackend:\033[0m  {API_BASE_URL}")
    print(f"  \033[92mHealth:\033[0m   {BACKEND_HEALTH_URL}")
    print("")
    log_info("Press Ctrl+C to stop both services.")
    print("")

    # Monitor processes
    try:
        while True:
            for name, proc in [("Backend", backend_process), ("Frontend", frontend_process)]:
                if proc is not None and proc.poll() is not None:
                    log_warning(f"{name} has exited unexpectedly (code: {proc.returncode})")
            time.sleep(5)
    except KeyboardInterrupt:
        pass
    finally:
        stop_services()

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        print("\033[91m" + "=" * 60 + "\033[0m", file=sys.stderr)
        print("\033[91m=====> STARTUP ERROR - UNCAUGHT EXCEPTION\033[0m", file=sys.stderr)
        print("\033[91m" + "=" * 60 + "\033[0m", file=sys.stderr)
        print("Traceback:", file=sys.stderr)
        traceback.print_exc()
        sys.exit(1)
