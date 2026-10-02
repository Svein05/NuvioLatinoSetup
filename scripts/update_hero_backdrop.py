#!/usr/bin/env python3
"""
Script de Actualización Automática del Backdrop Cinemático de Pósters Latinos
-----------------------------------------------------------------------------
Consulta la API oficial de TMDB para obtener el Top 28 de películas más populares
del momento con localización en Español Latino (es-MX), descarga sus carátulas
en alta resolución y genera un collage panorámico con degradado atmosférico
para el fondo de la portada (assets/preview/hero-posters-backdrop.webp).

Uso:
  python scripts/update_hero_backdrop.py
"""

import os
import sys
import json
import urllib.request
from io import BytesIO

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
except ImportError:
    print("❌ Error: Pillow no está instalado. Ejecuta: pip install pillow")
    sys.exit(1)

TMDB_API_KEY = "6c3d291a158f4b314e08bd80909cffff"
OUTPUT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "preview", "hero-posters-backdrop.webp")

def fetch_top_latin_movies(limit=28):
    """Obtiene las películas más populares en español latino desde TMDB."""
    movies = []
    page = 1
    headers = {"User-Agent": "NuvioLatinoSetup/1.3.0"}
    
    while len(movies) < limit and page <= 3:
        url = (
            f"https://api.themoviedb.org/3/movie/popular"
            f"?api_key={TMDB_API_KEY}"
            f"&language=es-MX"
            f"&region=MX"
            f"&page={page}"
        )
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode('utf-8'))
                for m in data.get("results", []):
                    if m.get("poster_path") and len(movies) < limit:
                        movies.append({
                            "title": m.get("title"),
                            "poster_path": m.get("poster_path")
                        })
        except Exception as e:
            print(f"⚠️ Error consultando página {page} de TMDB: {e}")
            break
        page += 1

    return movies

def download_image(url):
    """Descarga una imagen y la devuelve como objeto PIL Image."""
    headers = {"User-Agent": "NuvioLatinoSetup/1.3.0"}
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            return Image.open(BytesIO(response.read())).convert("RGB")
    except Exception as e:
        print(f"⚠️ Fallo al descargar {url}: {e}")
        return None

def build_backdrop():
    print("🎬 Obteniendo las películas más populares del momento en Español Latino...")
    movies = fetch_top_latin_movies(28)
    print(f"✓ {len(movies)} películas obtenidas.")

    # Dimensiones del mosaico (7 columnas x 4 filas = 28 posters)
    cols = 7
    rows = 4
    poster_w = 320
    poster_h = 480
    total_w = cols * poster_w  # 2240 px
    total_h = rows * poster_h  # 1920 px -> luego recortamos a 1200 px para ratio panorámico
    target_canvas_h = 1200

    print("📥 Descargando pósters y componiendo lienzo panorámico...")
    canvas = Image.new("RGB", (total_w, total_h), (8, 9, 12))

    idx = 0
    for row in range(rows):
        for col in range(cols):
            if idx >= len(movies):
                break
            m = movies[idx]
            img_url = f"https://image.tmdb.org/t/p/w500{m['poster_path']}"
            p_img = download_image(img_url)
            if p_img:
                p_img = p_img.resize((poster_w, poster_h), Image.Resampling.LANCZOS)
                canvas.paste(p_img, (col * poster_w, row * poster_h))
                print(f"  [{idx+1}/{len(movies)}] {m['title']}")
            idx += 1

    # Recortar a 2240 x 1200 desde el inicio superior
    cropped = canvas.crop((0, 0, total_w, target_canvas_h))

    # Realzar contraste y saturación sutilmente estilo cine
    enhancer = ImageEnhance.Color(cropped)
    cropped = enhancer.enhance(1.08)

    # Crear degradado de fundido inferior hacia el fondo oficial #08090c
    print("🎨 Aplicando gradiente atmosférico hacia #08090c...")
    gradient = Image.new("RGBA", (total_w, target_canvas_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(gradient)

    fade_start = int(target_canvas_h * 0.40)  # Desde el 40% de la altura
    for y in range(fade_start, target_canvas_h):
        t = (y - fade_start) / (target_canvas_h - fade_start)
        # Curva suave (ease-in)
        alpha = int(255 * (t ** 1.8))
        draw.line([(0, y), (total_w, y)], fill=(8, 9, 12, alpha))

    # Velo tenue superior para no deslumbrar en el borde más alto
    for y in range(0, int(target_canvas_h * 0.15)):
        t = 1.0 - (y / (target_canvas_h * 0.15))
        alpha = int(70 * t)
        draw.line([(0, y), (total_w, y)], fill=(8, 9, 12, alpha))

    # Componer degradado sobre la imagen
    final_rgba = cropped.convert("RGBA")
    final_rgba.alpha_composite(gradient)
    final_rgb = final_rgba.convert("RGB")

    # Asegurar que el directorio de destino exista
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    print(f"💾 Guardando imagen en: {OUTPUT_PATH}...")
    final_rgb.save(OUTPUT_PATH, "WEBP", quality=90, method=6)
    size_kb = os.path.getsize(OUTPUT_PATH) // 1024
    print(f"✅ ¡Backdrop generado exitosamente! ({size_kb} KB)")

if __name__ == '__main__':
    build_backdrop()
