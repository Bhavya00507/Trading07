# d:\Trading07\scripts\inspect_full_narration_track.py
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
wav_path = r"d:\Trading07\sales-package\video-assets\full_narration_track.wav"

if os.path.exists(wav_path):
    print(f"Inspecting WAV: {wav_path}")
    res = subprocess.run([ffmpeg_exe, "-i", wav_path], capture_output=True, text=True)
    print("FFmpeg probe:\n", res.stderr)
else:
    print("WAV file does not exist!")
