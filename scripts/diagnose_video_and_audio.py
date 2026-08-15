# d:\Trading07\scripts\diagnose_video_and_audio.py
import os
import sys
import subprocess

sys.path.append(r'C:\Users\bhavy\AppData\Roaming\Python\Python314\site-packages')
import imageio_ffmpeg

ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
ffprobe_exe = os.path.join(os.path.dirname(ffmpeg_exe), "ffprobe-win-x86_64-v7.1.exe")
if not os.path.exists(ffprobe_exe):
    # Try finding ffprobe in same dir or system
    ffprobe_exe = "ffprobe"

video_assets_dir = r"d:\Trading07\sales-package\video-assets"
mp4_path = r"d:\Trading07\sales-package\Quantum-Terminal-Buyer-Demo.mp4"

print("===========================================================")
print(" 1. DIAGNOSING CURRENT MP4 FILE WITH FFPROBE")
print("===========================================================")

if os.path.exists(mp4_path):
    print(f"File Path: {mp4_path}")
    print(f"File Size: {os.path.getsize(mp4_path)} bytes ({os.path.getsize(mp4_path)/(1024*1024):.2f} MB)")
    
    # Run ffprobe
    try:
        res = subprocess.run([ffmpeg_exe, "-i", mp4_path], capture_output=True, text=True)
        print("FFmpeg Probe Output:\n", res.stderr)
    except Exception as e:
        print("Probe error:", e)
else:
    print("MP4 path does not exist!")

print("\n===========================================================")
print(" 2. DIAGNOSING AUDIO FILES IN VIDEO-ASSETS")
print("===========================================================")

if os.path.exists(video_assets_dir):
    files = sorted(os.listdir(video_assets_dir))
    for f in files:
        if f.endswith(".wav") or f.endswith(".mp3"):
            fp = os.path.join(video_assets_dir, f)
            sz = os.path.getsize(fp)
            print(f"File: {f} ({sz} bytes)")
