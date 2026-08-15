# d:\Trading07\scripts\reencode_universal_windows_mp4.py
import os
import sys
import subprocess

sys.path.append(r'C:\Users\bhavy\AppData\Roaming\Python\Python314\site-packages')
sys.path.append(r'C:\Users\bhavy\AppData\Local\Python\pythoncore-3.11-64\Lib\site-packages')
try:
    import imageio_ffmpeg  # type: ignore
except ImportError:
    imageio_ffmpeg = None  # type: ignore

ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
print(f"[FFMPEG] Using binary at: {ffmpeg_exe}")

salesDir = r"d:\Trading07\sales-package"
videoAssetsDir = os.path.join(salesDir, "video-assets")

main_mp4 = os.path.join(salesDir, "Quantum-Terminal-Buyer-Demo.mp4")
win_mp4 = os.path.join(salesDir, "Quantum-Terminal-Buyer-Demo-Windows-Compatible.mp4")
final_wav = os.path.join(videoAssetsDir, "human_narration_final.wav")

temp_main = os.path.join(salesDir, "temp_render_baseline.mp4")

if os.path.exists(temp_main):
    try: os.unlink(temp_main)
    except Exception: pass

print("[ENCODE] Re-encoding video with H.264 Baseline Profile + AAC-LC 44.1kHz Stereo for 100% universal Windows compatibility...")

# Encode using H.264 Baseline Profile Level 3.1 + AAC-LC 44.1kHz Stereo + Faststart
cmd = [
    ffmpeg_exe, "-y",
    "-i", main_mp4,
    "-c:v", "libx264",
    "-profile:v", "baseline",
    "-level", "3.1",
    "-pix_fmt", "yuv420p",
    "-preset", "slow",
    "-crf", "22",
    "-c:a", "aac",
    "-ar", "44100",
    "-ac", "2",
    "-b:a", "128k",
    "-movflags", "+faststart",
    temp_main
]

res = subprocess.run(cmd, capture_output=True, text=True)
if res.returncode == 0 and os.path.exists(temp_main):
    print(f"[SUCCESS] Encoded {temp_main} ({os.path.getsize(temp_main)/(1024*1024):.2f} MB)")
    
    # Replace main_mp4 and win_mp4
    if os.path.exists(main_mp4): os.unlink(main_mp4)
    if os.path.exists(win_mp4): os.unlink(win_mp4)
    
    import shutil
    shutil.copyfile(temp_main, main_mp4)
    shutil.copyfile(temp_main, win_mp4)
    os.unlink(temp_main)
    print(f"[SAVED] Updated {main_mp4} and {win_mp4}")
else:
    print("[ERROR] FFmpeg re-encoding failed!")
    print(res.stderr)
