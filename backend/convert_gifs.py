"""
Script to convert GIF files to optimized WebM format.
"""
import os
import glob
import subprocess
import imageio_ffmpeg

ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
gif_dir = r"c:\Users\Andrea\body\body_web\src\assets\gifs"
gif_files = glob.glob(os.path.join(gif_dir, "*.gif"))

print(f"Encontrados {len(gif_files)} archivos GIF para convertir...")

for i, gif_path in enumerate(gif_files):
    webm_path = gif_path.rsplit(".", 1)[0] + ".webm"
    if os.path.exists(webm_path) and os.path.getsize(webm_path) > 0:
        print(f"[{i+1}/{len(gif_files)}] Saltando {os.path.basename(gif_path)}, ya existe y es válido.")
        continue
        
    print(f"[{i+1}/{len(gif_files)}] Convirtiendo {os.path.basename(gif_path)} a WebM...")
    
    cmd = [
        ffmpeg_exe,
        "-y",
        "-i", gif_path,
        "-c:v", "libvpx-vp9",
        "-b:v", "0",
        "-crf", "35", # Buena calidad, alto nivel de compresión
        "-an",        # Sin audio
        "-row-mt", "1", # Multithreading para acelerar
        "-loglevel", "error",
        webm_path
    ]
    
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error convirtiendo {os.path.basename(gif_path)}: {e}")

print("Eliminando GIFs originales...")
for gif_path in gif_files:
    webm_path = gif_path.rsplit(".", 1)[0] + ".webm"
    if os.path.exists(webm_path) and os.path.getsize(webm_path) > 0:
        os.remove(gif_path)

print("¡Conversión completada exitosamente!")
