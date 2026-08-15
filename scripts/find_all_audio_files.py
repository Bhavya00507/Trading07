# d:\Trading07\scripts\find_all_audio_files.py
import os

root_dir = r"d:\Trading07"
media_exts = {'.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.wma', '.webm', '.mov', '.mp4', '.mkv', '.avi'}

found_files = []

for root, dirs, files in os.walk(root_dir):
    # Skip node_modules, .git, venv
    if 'node_modules' in root or '.git' in root or 'venv' in root or '.pytest_cache' in root:
        continue
    for f in files:
        ext = os.path.splitext(f)[1].lower()
        if ext in media_exts:
            full_path = os.path.join(root, f)
            size_bytes = os.path.getsize(full_path)
            found_files.append((full_path, size_bytes))

print(f"Found {len(found_files)} media files across {root_dir}:")
for p, s in found_files:
    print(f"  [{s} B] {p}")
