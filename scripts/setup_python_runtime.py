"""
setup_python_runtime.py
Downloads a portable Python embeddable package and installs all backend
dependencies into it. Run this once before electron-builder packaging.

Usage:  python scripts/setup_python_runtime.py
Output: backend/python-runtime/  (committed as extraResources)
"""

import subprocess
import sys
import os
import zipfile
import shutil
import urllib.request
import urllib.error
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
PYTHON_VERSION = "3.11.9"          # Last stable 3.11 – embeddable works perfectly
PYTHON_EMBED_URL = (
    f"https://www.python.org/ftp/python/{PYTHON_VERSION}/"
    f"python-{PYTHON_VERSION}-embed-amd64.zip"
)
PIP_URL  = "https://bootstrap.pypa.io/get-pip.py"

ROOT      = Path(__file__).parent.parent          # d:/Trading07
BACKEND   = ROOT / "backend"
RUNTIME   = BACKEND / "python-runtime"
ZIP_FILE  = ROOT / f"python-{PYTHON_VERSION}-embed-amd64.zip"
REQS      = BACKEND / "requirements.txt"

# ---------------------------------------------------------------------------
def download(url: str, dest: Path) -> None:
    if dest.exists():
        print(f"  [skip] {dest.name} already exists")
        return
    print(f"  Downloading {url} ...")
    try:
        urllib.request.urlretrieve(url, dest)
        print(f"  Saved -> {dest}")
    except urllib.error.URLError as e:
        print(f"  ERROR: {e}")
        sys.exit(1)

def run(*cmd, cwd=None, env=None):
    print(f"  > {' '.join(str(c) for c in cmd)}")
    result = subprocess.run(cmd, cwd=cwd, env=env,
                             capture_output=True, text=True)
    if result.stdout.strip():
        print(result.stdout.strip())
    if result.stderr.strip():
        print(result.stderr.strip())
    if result.returncode != 0:
        print(f"  ERROR: exit {result.returncode}")
        sys.exit(result.returncode)

# ---------------------------------------------------------------------------
print("=== Step 1: Clean and create runtime directory ===")
if RUNTIME.exists():
    shutil.rmtree(RUNTIME)
RUNTIME.mkdir(parents=True)

print(f"=== Step 2: Download Python {PYTHON_VERSION} embeddable ===")
download(PYTHON_EMBED_URL, ZIP_FILE)

print("=== Step 3: Extract embeddable ===")
with zipfile.ZipFile(ZIP_FILE, "r") as zf:
    zf.extractall(RUNTIME)
print(f"  Extracted to {RUNTIME}")

# ---------------------------------------------------------------------------
# Enable site-packages: the embeddable zip ships with a ._pth file that has
# "import site" commented out — uncommenting it enables pip-installed packages.
# ---------------------------------------------------------------------------
print("=== Step 4: Enable site-packages in embeddable ===")
PTH_GLOB = list(RUNTIME.glob("python3*._pth"))
if not PTH_GLOB:
    PTH_GLOB = list(RUNTIME.glob("python*._pth"))
if not PTH_GLOB:
    print("  WARNING: no ._pth file found — may need manual intervention")
else:
    pth_file = PTH_GLOB[0]
    content  = pth_file.read_text(encoding="utf-8")
    new_content = content.replace("#import site", "import site") \
                          .replace("# import site", "import site")
    if "import site" not in new_content:
        new_content += "\nimport site\n"
    pth_file.write_text(new_content, encoding="utf-8")
    print(f"  Patched {pth_file.name}")

# ---------------------------------------------------------------------------
print("=== Step 5: Download get-pip.py ===")
PIP_SCRIPT = RUNTIME / "get-pip.py"
download(PIP_URL, PIP_SCRIPT)

print("=== Step 6: Install pip into embeddable ===")
python_exe = RUNTIME / "python.exe"
run(python_exe, PIP_SCRIPT, "--no-warn-script-location")

print("=== Step 7: Install backend requirements ===")
pip_exe = RUNTIME / "Scripts" / "pip.exe"
if not pip_exe.exists():
    # Fallback: python -m pip
    run(python_exe, "-m", "pip", "install",
        "--no-warn-script-location",
        "-r", REQS)
else:
    run(pip_exe, "install",
        "--no-warn-script-location",
        "-r", REQS)

# Also install aiosqlite (required by SQLAlchemy async with SQLite)
if pip_exe.exists():
    run(pip_exe, "install", "--no-warn-script-location", "aiosqlite")
else:
    run(python_exe, "-m", "pip", "install", "aiosqlite")

print("=== Step 8: Verify uvicorn ===")
uvicorn_exe = RUNTIME / "Scripts" / "uvicorn.exe"
run(python_exe, "-m", "uvicorn", "--version")

print()
print(f"[OK] Python runtime ready at: {RUNTIME}")
print(f"   python.exe : {python_exe}")
print(f"   uvicorn    : {uvicorn_exe}")
print()
print("Next step: npm run electron:build")
