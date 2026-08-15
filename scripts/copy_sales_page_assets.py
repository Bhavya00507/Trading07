# d:\Trading07\scripts\copy_sales_page_assets.py
import os
import shutil

rootDir = r"d:\Trading07"
salesPageAssets = os.path.join(rootDir, "sales-page", "assets")
screenshotsDest = os.path.join(salesPageAssets, "screenshots")

os.makedirs(screenshotsDest, exist_ok=True)

# 1. Copy Video
src_video = os.path.join(rootDir, "sales-package", "Quantum-Terminal-Buyer-Demo.mp4")
dst_video = os.path.join(salesPageAssets, "Quantum-Terminal-Buyer-Demo.mp4")

if os.path.exists(src_video):
    shutil.copyfile(src_video, dst_video)
    print(f"[COPIED VIDEO] {dst_video} ({os.path.getsize(dst_video)/(1024*1024):.2f} MB)")
else:
    print(f"[ERROR] Source video missing: {src_video}")

# 2. Copy 12 Screenshots
shots = [
    ("01-dashboard.png", os.path.join(rootDir, "buyer-demo", "screenshots", "01-dashboard.png")),
    ("02-markets.png", os.path.join(rootDir, "buyer-demo", "screenshots", "02-markets.png")),
    ("03-charting.png", os.path.join(rootDir, "buyer-demo", "screenshots", "03-charting.png")),
    ("04-paper-trading.png", os.path.join(rootDir, "buyer-demo", "screenshots", "04-paper-trading.png")),
    ("05-risk-portfolio.png", os.path.join(rootDir, "buyer-demo", "screenshots", "05-risk-portfolio.png")),
    ("06-replay-studio.png", os.path.join(rootDir, "buyer-demo", "screenshots", "06-replay-studio.png")),
    ("07-options-desk.png", os.path.join(rootDir, "buyer-demo", "screenshots", "07-options-desk.png")),
    ("08-script-studio.png", os.path.join(rootDir, "buyer-demo", "screenshots", "08-script-studio.png")),
    ("09-market-data.png", os.path.join(rootDir, "buyer-demo", "screenshots", "09-market-data.png")),
    ("10-smart-order-router.png", os.path.join(rootDir, "buyer-demo", "screenshots", "10-smart-order-router.png")),
    ("11-mobile-terminal.png", os.path.join(rootDir, "buyer-demo", "mobile", "11-mobile-terminal.png")),
    ("12-system-health.png", os.path.join(rootDir, "buyer-demo", "screenshots", "12-system-health.png")),
]

copied_count = 0
for fname, src in shots:
    dst = os.path.join(screenshotsDest, fname)
    if os.path.exists(src):
        shutil.copyfile(src, dst)
        copied_count += 1
        print(f"  [COPIED SCREENSHOT {copied_count}/12] {fname}")
    else:
        print(f"  [ERROR] Missing screenshot: {src}")

print(f"\nCompleted copying {copied_count}/12 screenshots to {screenshotsDest}")
