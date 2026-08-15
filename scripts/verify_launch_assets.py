# d:\Trading07\scripts\verify_launch_assets.py
import os
import hashlib

rootDir = r"d:\Trading07"

files_to_check = [
    os.path.join(rootDir, "releases", "Quantum-Terminal-Buyer-Release-v1.0.zip"),
    os.path.join(rootDir, "sales-package", "Quantum-Terminal-Buyer-Demo.mp4"),
    os.path.join(rootDir, "sales-package", "01_BUYER_PITCH.md"),
    os.path.join(rootDir, "sales-package", "02_FEATURE_OVERVIEW.md"),
    os.path.join(rootDir, "sales-package", "03_TECHNICAL_STACK.md"),
    os.path.join(rootDir, "sales-package", "04_PROTOTYPE_VS_PRODUCTION.md"),
    os.path.join(rootDir, "sales-package", "05_WHAT_BUYER_RECEIVES.md"),
    os.path.join(rootDir, "sales-package", "08_FAQ.md"),
    os.path.join(rootDir, "sales-package", "11_ONE_PAGE_EXECUTIVE_SUMMARY.md"),
    os.path.join(rootDir, "sales-package", "12_RELEASE_VERIFICATION.md"),
    os.path.join(rootDir, "sales-package", "VIDEO_VERIFICATION.md"),
    os.path.join(rootDir, "sales-package", "VIDEO_AUDIO_SOURCE.md"),
    os.path.join(rootDir, "Quantum-Terminal-Buyer-Package", "README.md"),
    os.path.join(rootDir, "Quantum-Terminal-Buyer-Package", "BUYER_HANDOFF.md"),
    os.path.join(rootDir, "Quantum-Terminal-Buyer-Package", "FEATURE_MATRIX.md"),
    os.path.join(rootDir, "Quantum-Terminal-Buyer-Package", "KNOWN_LIMITATIONS.md"),
    os.path.join(rootDir, "Quantum-Terminal-Buyer-Package", "RELEASE_MANIFEST.md"),
    os.path.join(rootDir, "Quantum-Terminal-Buyer-Package", "LICENSE.txt"),
    os.path.join(rootDir, "Quantum-Terminal-Buyer-Package", ".env.example"),
]

print("===========================================================")
print(" VERIFYING LAUNCH ASSET PATHS AND CHECKSUMS")
print("===========================================================")

all_exist = True
for fp in files_to_check:
    if os.path.exists(fp):
        sz = os.path.getsize(fp)
        with open(fp, "rb") as f:
            h = hashlib.sha256(f.read()).hexdigest()
        print(f"[EXISTS] {os.path.relpath(fp, rootDir)} | {sz} bytes | SHA256: {h[:16]}...")
    else:
        print(f"[MISSING] {os.path.relpath(fp, rootDir)}")
        all_exist = False

print(f"\nAll Files Exist: {all_exist}")
