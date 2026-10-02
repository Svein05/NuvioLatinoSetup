#!/usr/bin/env python3
"""
Script de Actualización Automática del Backdrop Cinemático de Pósters Latinos
-----------------------------------------------------------------------------
Consulta la API oficial de TMDB para obtener las películas más populares
del momento con localización en Español Latino (es-MX), descarga sus carátulas
en alta resolución y genera un collage panorámico con patrón de ladrillo
(desplazamiento escalonado a la mitad de póster) y degradado atmosférico
para el fondo de la portada (assets/preview/hero-posters-backdrop.webp).

Uso rápido:
  python scripts/update_hero_backdrop.py

Opciones avanzadas:
  python scripts/update_hero_backdrop.py --limit 35 --quality 92
"""

import os
import sys
import json
import argparse
import urllib.request
from io import BytesIO

# Asegurar codificación UTF-8 en terminales Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

try:
    from PIL import Image, ImageDraw, ImageEnhance
except ImportError:
    print("❌ Error: Pillow no está instalado. Ejecuta: pip install pillow")
    sys.exit(1)

TMDB_API_KEY_DEFAULT = "6c3d291a158f4b314e08bd80909cffff"
DEFAULT_OUTPUT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "assets", "preview", "hero-posters-backdrop.webp"
)

def fetch_top_latin_movies(api_key, limit=30):
    """Obtiene las películas más populares en español latino desde TMDB."""
    movies = []
    page = 1
    headers = {"User-Agent": "NuvioLatinoSetup/1.3.0"}
    seen_ids = set()

    while len(movies) < limit and page <= 4:
        url = (
            f"https://api.themoviedb.org/3/movie/popular"
            f"?api_key={api_key}"
            f"&language=es-MX"
            f"&region=MX"
            f"&page={page}"
        )
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=12) as response:
                data = json.loads(response.read().decode('utf-8'))
                for m in data.get("results", []):
                    m_id = m.get("id")
                    if m_id and m_id not in seen_ids and m.get("poster_path") and len(movies) < limit:
                        seen_ids.add(m_id)
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
        with urllib.request.urlopen(req, timeout=12) as response:
            return Image.open(BytesIO(response.read())).convert("RGB")
    except Exception as e:
        print(f"⚠️ Fallo al descargar {url}: {e}")
        return None

def build_backdrop(api_key=TMDB_API_KEY_DEFAULT, limit=30, output_path=DEFAULT_OUTPUT_PATH, quality=90):
    """
    Construye el backdrop cinemático con patrón de ladrillo (running bond).
    Cada fila impar está desplazada exactamente a la mitad del ancho de un póster
    (offset = poster_w // 2), de modo que debajo de cada póster coinciden
    las mitades de dos pósters contiguos.
    """
    print("=" * 65)
    print("🎬 ACTUALIZADOR DEL BACKDROP CINEMÁTICO (PATRÓN DE LADRILLO)")
    print("=" * 65)
    print(f"📡 Consultando películas más populares en Español Latino (es-MX)...")

    movies = fetch_top_latin_movies(api_key, limit=limit)
    if not movies:
        print("❌ Error: No se obtuvieron películas de TMDB. Verifica tu conexión o API key.")
        return False

    print(f"✓ Se obtuvieron {len(movies)} películas únicas con póster disponible.")

    # Geometría del mosaico panorámico
    # Relación de aspecto 2:3 clásica para pósters
    poster_w = 320
    poster_h = 480
    cols_base = 7
    total_w = cols_base * poster_w  # 2240 px
    rows = 3
    target_canvas_h = 1200
    total_h = rows * poster_h       # 1440 px (se recortará a 1200 px)

    print(f"🧱 Componiendo mosaico en aparejo de ladrillo ({total_w}x{target_canvas_h} px)...")
    canvas = Image.new("RGB", (total_w, total_h), (8, 9, 12))

    # Descargar imágenes únicas en caché en memoria
    cached_images = []
    print("📥 Descargando pósters en alta resolución:")
    for idx, m in enumerate(movies):
        img_url = f"https://image.tmdb.org/t/p/w500{m['poster_path']}"
        img = download_image(img_url)
        if img:
            resized = img.resize((poster_w, poster_h), Image.Resampling.LANCZOS)
            cached_images.append((m['title'], resized))
            print(f"  [{len(cached_images)}] {m['title']}")
        if len(cached_images) >= limit:
            break

    if not cached_images:
        print("❌ Error: No se pudo descargar ninguna imagen de póster.")
        return False

    # Distribución en filas tipo ladrillo
    # Fila par (0, 2): Inicia en x = 0 (7 pósters por fila)
    # Fila impar (1): Inicia en x = - (poster_w // 2) (8 pósters por fila, cubriendo de -160 a 2400)
    img_cursor = 0
    num_cached = len(cached_images)

    for row in range(rows):
        y = row * poster_h
        is_odd = (row % 2 == 1)
        
        if is_odd:
            # Desplazamiento de ladrillo: mitad de póster a la izquierda
            start_x = -(poster_w // 2)
            cols_in_row = cols_base + 1
        else:
            start_x = 0
            cols_in_row = cols_base

        for col in range(cols_in_row):
            x = start_x + (col * poster_w)
            title, p_img = cached_images[img_cursor % num_cached]
            img_cursor += 1

            # Pegar el póster en la posición calculada
            canvas.paste(p_img, (x, y))

    # Recortar a dimensiones exactas 2240 x 1200 desde el inicio superior
    cropped = canvas.crop((0, 0, total_w, target_canvas_h))

    # Realzar sutilmente saturación y contraste cinematográfico
    enhancer = ImageEnhance.Color(cropped)
    cropped = enhancer.enhance(1.08)

    # Crear degradado atmosférico suave hacia el color de fondo oficial #08090c
    print("🎨 Aplicando gradiente atmosférico hacia el fondo #08090c...")
    gradient = Image.new("RGBA", (total_w, target_canvas_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(gradient)

    fade_start = int(target_canvas_h * 0.38)
    for y in range(fade_start, target_canvas_h):
        t = (y - fade_start) / (target_canvas_h - fade_start)
        alpha = int(255 * (t ** 1.75))
        draw.line([(0, y), (total_w, y)], fill=(8, 9, 12, alpha))

    # Velo suave superior para suavizar el borde más alto
    for y in range(0, int(target_canvas_h * 0.12)):
        t = 1.0 - (y / (target_canvas_h * 0.12))
        alpha = int(60 * t)
        draw.line([(0, y), (total_w, y)], fill=(8, 9, 12, alpha))

    # Componer degradado sobre la imagen
    final_rgba = cropped.convert("RGBA")
    final_rgba.alpha_composite(gradient)
    final_rgb = final_rgba.convert("RGB")

    # Asegurar que el directorio de destino exista
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    print(f"💾 Guardando imagen en: {output_path}...")
    final_rgb.save(output_path, "WEBP", quality=quality, method=6)
    size_kb = os.path.getsize(output_path) // 1024
    print(f"✅ ¡Backdrop cinemático en ladrillo generado exitosamente! ({size_kb} KB)")
    print("=" * 65)
    return True

def parse_args():
    parser = argparse.ArgumentParser(
        description="Actualiza el backdrop cinemático de películas populares en Español Latino para NuvioSetup.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument("--api-key", default=TMDB_API_KEY_DEFAULT, help="Clave API de TheMovieDatabase (TMDB)")
    parser.add_argument("--limit", type=int, default=30, help="Cantidad de películas únicas a consultar")
    parser.add_argument("--output", default=DEFAULT_OUTPUT_PATH, help="Ruta de guardado de la imagen WebP")
    parser.add_argument("--quality", type=int, default=90, help="Calidad de compresión WebP (1-100)")
    return parser.parse_args()

if __name__ == '__main__':
    args = parse_args()
    build_backdrop(
        api_key=args.api_key,
        limit=args.limit,
        output_path=args.output,
        quality=args.quality
    )
