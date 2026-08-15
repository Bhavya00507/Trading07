# d:\Trading07\scripts\search_user_system_for_narration.py
import os

search_dirs = [
    r"C:\Users\bhavy\Downloads",
    r"C:\Users\bhavy\Desktop",
    r"C:\Users\bhavy\Documents",
    r"C:\Users\bhavy\Music",
    r"C:\Users\bhavy\Videos",
    r"C:\Users\bhavy\.gemini",
]

media_exts = {'.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.wma', '.webm', '.mov', '.mp4', '.mkv', '.avi'}

found = []

for sdir in search_dirs:
    if os.path.exists(sdir):
        for root, dirs, files in os.walk(sdir):
            if 'node_modules' in root or '.git' in root or 'AppData' in root:
                continue
            for f in files:
                ext = os.path.splitext(f)[1].lower()
                if ext in media_exts:
                    fp = os.path.join(root, f)
                    try:
                        sz = os.path.getsize(fp)
                        if 'narration' in f.lower() or 'human' in f.lower() or 'voice' in f.lower() or 'demo' in f.lower() or 'audio' in f.lower() or 'recording' in f.lower():
                            found.append((fp, sz))
                    except Exception:
                        pass

print(f"Search complete. Found {len(found)} candidate narration/voice files:")
for p, s in found:
    print(f"  [{s} B] {p}")
