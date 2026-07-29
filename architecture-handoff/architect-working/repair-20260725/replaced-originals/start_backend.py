import subprocess
import os

backend_dir = r"C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3\workspace\backend"
log_path = r"C:\Users\javie\AppData\Local\Temp\opencode\backend.log"

with open(log_path, "w") as log_file:
    proc = subprocess.Popen(
        ["node", "node_modules/tsx/dist/cli.mjs", "watch", "src/main.ts"],
        cwd=backend_dir,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP,
    )
    print(f"Started backend with PID {proc.pid}")
