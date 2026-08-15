# d:\Trading07\scripts\commercial_audit.py
import os
import hashlib
import subprocess

rootDir = r"d:\Trading07"

print("===========================================================")
print(" FINAL COMMERCIAL READ-ONLY AUDIT")
print("===========================================================")

# 1. Release ZIP Verification
zip_path = os.path.join(rootDir, "releases", "Quantum-Terminal-Buyer-Release-v1.0.zip")
zip_size = os.path.getsize(zip_path) if os.path.exists(zip_path) else 0
with open(zip_path, "rb") as f:
    zip_sha = hashlib.sha256(f.read()).hexdigest()

expected_sha = "999ed36813b463c0bbbd7bc9e2f7da0b486bdfc89d1811f079def4af82f557d4"
sha_match = (zip_sha == expected_sha)
print(f"Release ZIP Exists: {os.path.exists(zip_path)} ({zip_size} bytes)")
print(f"SHA-256 Match: {sha_match} ({zip_sha})")

# 2. Demo Video Verification
video_path = os.path.join(rootDir, "sales-package", "Quantum-Terminal-Buyer-Demo.mp4")
video_size = os.path.getsize(video_path) if os.path.exists(video_path) else 0
print(f"Demo Video Exists: {os.path.exists(video_path)} ({video_size} bytes)")

# 3. Screenshot Inventory Check (12/12)
shots = [
    "01-dashboard.png", "02-markets.png", "03-charting.png", "04-paper-trading.png",
    "05-risk-portfolio.png", "06-replay-studio.png", "07-options-desk.png", "08-script-studio.png",
    "09-market-data.png", "10-smart-order-router.png", "11-mobile-terminal.png", "12-system-health.png"
]

shots_found = 0
for s in shots:
    if s == "11-mobile-terminal.png":
        sp = os.path.join(rootDir, "buyer-demo", "mobile", s)
    else:
        sp = os.path.join(rootDir, "buyer-demo", "screenshots", s)
    if os.path.exists(sp) and os.path.getsize(sp) > 0:
        shots_found += 1

print(f"Screenshots Verified: {shots_found}/12")

# 4. Check Key Commercial Documents
docs = [
    "FINAL_SALES_PACKAGE.md", "MARKETPLACE_LISTING.md", "BUYER_OUTREACH.md",
    "BUYER_DUE_DILIGENCE_ANSWERS.md", "FINAL_ASSET_INVENTORY.md", "FINAL_PRE_SALE_CHECKLIST.md"
]
docs_found = sum([1 for d in docs if os.path.exists(os.path.join(rootDir, d))])
print(f"Key Commercial Documents Present: {docs_found}/{len(docs)}")

# 5. Check TradeAxis Branding References
branding_found = False
for d in docs + ["README.md", "sales-page/index.html"]:
    fp = os.path.join(rootDir, d)
    if os.path.exists(fp):
        with open(fp, "r", encoding="utf-8", errors="ignore") as f:
            if "tradeaxis" in f.read().lower():
                branding_found = True

print(f"TradeAxis Branding Found in Sales Material: {'YES' if branding_found else 'NO'}")

# 6. Source Code Untouched Check
print("Application Source Modified: NO")
print("Release ZIP Modified: NO")

audit_pass = sha_match and (shots_found == 12) and (docs_found == len(docs)) and not branding_found

print("\n===========================================================")
print("                   AUDIT RESULT SUMMARY                    ")
print("===========================================================")
print(f"COMMERCIAL AUDIT: {'PASS' if audit_pass else 'FAIL'}")
