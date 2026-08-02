#!/usr/bin/env python3
"""
Quantum Platform — One-Click Development Launcher (scripts/start_quantum.py)
Automatically detects LAN IP, starts FastAPI backend and Vite frontend, performs health checks,
displays mobile-ready URLs, and opens browser.
"""

import sys
import os
import time
import socket
import subprocess
import urllib.request
import webbrowser
import signal

def get_lan_ip() -> str:
    """Detect local active LAN IP address (e.g. 192.168.x.x)."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return '127.0.0.1'

def check_http_health(url: str, timeout: int = 1) -> bool:
    """Check if an HTTP endpoint returns 200 OK."""
    try:
        req = urllib.request.urlopen(url, timeout=timeout)
        return req.getcode() == 200
    except Exception:
        return False

def main():
    lan_ip = get_lan_ip()
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    backend_dir = os.path.join(project_root, "backend")

    print("\n" + "=" * 70)
    print(" 🚀 QUANTUM PLATFORM — ONE-CLICK DEVELOPMENT LAUNCHER (v1.0)")
    print("=" * 70)
    print(f" [+] Detected LAN IP : {lan_ip}")
    print(f" [+] Workspace Root  : {project_root}")
    print("=" * 70)

    processes = []

    def cleanup(signum=None, frame=None):
        print("\n [!] Shutting down Quantum Platform services...")
        for p in processes:
            try:
                p.terminate()
            except Exception:
                pass
        print(" [✓] All processes terminated. Goodbye!")
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    # 1. Start FastAPI Backend
    print("\n [1/4] Starting FastAPI Backend (0.0.0.0:8000)...")
    backend_cmd = [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
    backend_proc = subprocess.Popen(backend_cmd, cwd=backend_dir)
    processes.append(backend_proc)

    # Wait for Backend Health
    print("       Waiting for backend health check at http://localhost:8000/health...", end="", flush=True)
    backend_healthy = False
    for _ in range(30):
        if check_http_health("http://localhost:8000/health"):
            backend_healthy = True
            break
        time.sleep(0.5)
        print(".", end="", flush=True)

    if backend_healthy:
        print(" HEALTHY! ✅")
    else:
        print(" TIMEOUT (Proceeding anyway...) ⚠️")

    # 2. Start Vite Frontend
    print("\n [2/4] Starting Vite Frontend (0.0.0.0:5173)...")
    npm_bin = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_cmd = [npm_bin, "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
    frontend_proc = subprocess.Popen(frontend_cmd, cwd=project_root)
    processes.append(frontend_proc)

    # Wait for Frontend Health
    print("       Waiting for frontend health check at http://localhost:5173...", end="", flush=True)
    frontend_healthy = False
    for _ in range(30):
        if check_http_health("http://localhost:5173"):
            frontend_healthy = True
            break
        time.sleep(0.5)
        print(".", end="", flush=True)

    if frontend_healthy:
        print(" HEALTHY! ✅")
    else:
        print(" TIMEOUT (Proceeding anyway...) ⚠️")

    # 3. Print Connection Telemetry Banner
    desktop_url = "http://localhost:5173"
    mobile_url = f"http://{lan_ip}:5173"
    backend_url = f"http://{lan_ip}:8000"
    docs_url = f"http://{lan_ip}:8000/docs"

    print("\n" + "=" * 70)
    print(" 🎉 QUANTUM PLATFORM IS FULLY OPERATIONAL & READY FOR DEV!")
    print("=" * 70)
    print(f" 💻 Desktop Terminal : {desktop_url}")
    print(f" 📱 Mobile Terminal  : {mobile_url}")
    print(f" ⚙️ Backend API      : {backend_url}")
    print(f" 📑 Interactive Docs : {docs_url}")
    print("=" * 70)
    print(" [!] Press CTRL+C at any time to gracefully shutdown all services.")
    print("=" * 70 + "\n")

    # 4. Open Desktop Browser
    try:
        webbrowser.open(desktop_url)
    except Exception:
        pass

    # Keep script alive to monitor subprocesses
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        cleanup()

if __name__ == "__main__":
    main()
