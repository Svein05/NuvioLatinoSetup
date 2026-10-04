#!/usr/bin/env python3
"""
Nuvio Latino Setup - Web Visual Assets Pipeline
-----------------------------------------------
Generates cinematic visual assets for the web application from popular
Latin American TMDB movies (es-MX):
  1. assets/preview/hero-posters-backdrop.webp (Web Panoramic Backdrop, 2240x1200)
  2. assets/preview/incrustacion.png (Web OpenGraph / Discord Embed Banner, 1200x630)

Authentication:
  - TMDB API Key: Via environment variable TMDB_API_KEY (or TMBD_API_KEY) or CLI option --api-key.

Runs automatically on CI/CD during official releases to keep web assets fresh.
"""

import os
import sys
import math
import json
import logging
import argparse
import urllib.request
import urllib.error
from io import BytesIO
from typing import List, Dict, Optional, Tuple

from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageFilter

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("NuvioWebAssetPipeline")

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_WEB_BACKDROP = os.path.join(PROJECT_ROOT, "assets", "preview", "hero-posters-backdrop.webp")
DEFAULT_DISCORD_BANNER = os.path.join(PROJECT_ROOT, "assets", "preview", "incrustacion.png")

FONT_SERIF = os.path.join(PROJECT_ROOT, "assets", "fonts", "instrument-serif-latin.woff2")
FONT_SERIF_ITALIC = os.path.join(PROJECT_ROOT, "assets", "fonts", "instrument-serif-italic-latin.woff2")


def load_env_file() -> None:
    """Loads key-value pairs from .env file into os.environ if present."""
    env_paths = [
        os.path.join(PROJECT_ROOT, ".env"),
        os.path.join(PROJECT_ROOT, "scripts", ".env")
    ]
    for p in env_paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k, v = k.strip(), v.strip().strip("'\"")
                            if k not in os.environ:
                                os.environ[k] = v
            except Exception as err:
                logger.warning(f"Error reading .env at {p}: {err}")


def get_api_key(cli_arg: Optional[str] = None) -> str:
    """Retrieves TMDB API key from CLI argument, environment variable, or .env file."""
    load_env_file()
    key = cli_arg or os.getenv("TMDB_API_KEY") or os.getenv("TMBD_API_KEY")
    if not key or not key.strip():
        logger.error(
            "TMDB API key not found. Please provide --api-key or define TMDB_API_KEY/TMBD_API_KEY."
        )
        sys.exit(1)
    return key.strip()


def fetch_top_latin_movies(api_key: str, limit: int = 30) -> List[Dict[str, str]]:
    """Queries popular TMDB movies localized in Latin American Spanish (es-MX)."""
    movies: List[Dict[str, str]] = []
    page = 1
    headers = {"User-Agent": "NuvioWebAssetPipeline/1.0"}
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
                data = json.loads(response.read().decode("utf-8"))
                for m in data.get("results", []):
                    m_id = m.get("id")
                    if m_id and m_id not in seen_ids and m.get("poster_path") and len(movies) < limit:
                        seen_ids.add(m_id)
                        movies.append({
                            "title": m.get("title", "Desconocido"),
                            "poster_path": m.get("poster_path")
                        })
        except Exception as err:
            logger.warning(f"Error querying TMDB page {page}: {err}")
            break
        page += 1

    return movies


def download_image(url: str) -> Optional[Image.Image]:
    """Downloads an image from URL and returns a PIL RGB Image."""
    headers = {"User-Agent": "NuvioWebAssetPipeline/1.0"}
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=12) as response:
            return Image.open(BytesIO(response.read())).convert("RGB")
    except Exception as err:
        logger.warning(f"Failed to download image from {url}: {err}")
        return None


def render_brick_canvas(movies: List[Dict[str, str]], limit: int = 30) -> Optional[Image.Image]:
    """
    Renders high-resolution posters in running bond (brick) arrangement.
    Poster dimensions: 320x480 (2:3 aspect ratio).
    Total width: 7 * 320 = 2240 px. Total height: 3 * 480 = 1440 px.
    """
    poster_w, poster_h = 320, 480
    cols_base = 7
    total_w = cols_base * poster_w
    rows = 3
    total_h = rows * poster_h

    canvas = Image.new("RGB", (total_w, total_h), (8, 9, 12))
    cached_images: List[Tuple[str, Image.Image]] = []

    logger.info(f"Downloading up to {limit} movie posters in high resolution...")
    for m in movies:
        img_url = f"https://image.tmdb.org/t/p/w500{m['poster_path']}"
        img = download_image(img_url)
        if img:
            resized = img.resize((poster_w, poster_h), Image.Resampling.LANCZOS)
            cached_images.append((m["title"], resized))
            logger.info(f"  [{len(cached_images)}] {m['title']}")
        if len(cached_images) >= limit:
            break

    if not cached_images:
        logger.error("No movie poster images could be downloaded.")
        return None

    img_cursor = 0
    num_cached = len(cached_images)

    for row in range(rows):
        y = row * poster_h
        is_odd = (row % 2 == 1)

        if is_odd:
            start_x = -(poster_w // 2)
            cols_in_row = cols_base + 1
        else:
            start_x = 0
            cols_in_row = cols_base

        for col in range(cols_in_row):
            x = start_x + (col * poster_w)
            title, p_img = cached_images[img_cursor % num_cached]
            img_cursor += 1
            canvas.paste(p_img, (x, y))

    logger.info(f"Brick wall mosaic assembled successfully ({total_w}x{total_h} px).")
    return canvas


def generate_web_hero_backdrop(canvas: Image.Image, output_path: str, quality: int = 90) -> bool:
    """Generates the panoramic WebP background for the web application hero section."""
    target_canvas_h = 1200
    total_w, _ = canvas.size
    cropped = canvas.crop((0, 0, total_w, target_canvas_h))

    enhancer = ImageEnhance.Color(cropped)
    enhanced = enhancer.enhance(1.08)

    # Atmospheric gradient fade toward background #08090c
    gradient = Image.new("RGBA", (total_w, target_canvas_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(gradient)

    fade_start = int(target_canvas_h * 0.38)
    for y in range(fade_start, target_canvas_h):
        t = (y - fade_start) / (target_canvas_h - fade_start)
        alpha = int(255 * (t ** 1.75))
        draw.line([(0, y), (total_w, y)], fill=(8, 9, 12, alpha))

    # Soft top veil
    for y in range(0, int(target_canvas_h * 0.12)):
        t = 1.0 - (y / (target_canvas_h * 0.12))
        alpha = int(60 * t)
        draw.line([(0, y), (total_w, y)], fill=(8, 9, 12, alpha))

    final_rgba = enhanced.convert("RGBA")
    final_rgba.alpha_composite(gradient)
    final_rgb = final_rgba.convert("RGB")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    final_rgb.save(output_path, "WEBP", quality=quality, method=6)
    size_kb = os.path.getsize(output_path) // 1024
    logger.info(f"Web hero backdrop saved: {output_path} ({size_kb} KB)")
    return True


def generate_discord_embed_banner(canvas: Image.Image, output_path: str) -> bool:
    """Generates OpenGraph / Discord embed banner (1200x630 px) with centered typography."""
    target_w, target_h = 1200, 630
    canvas_w, canvas_h = canvas.size

    crop_h = int(canvas_w * (target_h / target_w))
    crop_y = max(0, (canvas_h - crop_h) // 2)
    banner_raw = canvas.crop((0, crop_y, canvas_w, min(canvas_h, crop_y + crop_h)))
    banner = banner_raw.resize((target_w, target_h), Image.Resampling.LANCZOS).convert("RGBA")

    enhancer = ImageEnhance.Color(banner)
    banner = enhancer.enhance(1.05)

    # Atmospheric vignette
    small_w, small_h = 240, 126
    vignette_small = Image.new("L", (small_w, small_h))
    cx, cy = small_w / 2.0, small_h / 2.0
    pixels = vignette_small.load()
    for y in range(small_h):
        for x in range(small_w):
            dx = (x - cx) / cx
            dy = (y - cy) / cy
            d = math.sqrt(dx * dx * 0.75 + dy * dy * 1.25)
            alpha = int(105 + 85 * min(1.0, max(0.0, d)))
            pixels[x, y] = alpha

    vignette = vignette_small.resize((target_w, target_h), Image.Resampling.BILINEAR)
    dark_overlay = Image.new("RGBA", (target_w, target_h), (8, 9, 12, 0))
    dark_overlay.putalpha(vignette)
    composed = Image.alpha_composite(banner, dark_overlay)

    font1 = ImageFont.truetype(FONT_SERIF, 66)
    font2 = ImageFont.truetype(FONT_SERIF_ITALIC, 76)

    text1 = "Transforma tu Nuvio con"
    text2 = "Metadatos y Colecciones Latinas"

    draw = ImageDraw.Draw(composed)
    bbox1 = draw.textbbox((0, 0), text1, font=font1)
    w1, h1 = bbox1[2] - bbox1[0], bbox1[3] - bbox1[1]

    bbox2 = draw.textbbox((0, 0), text2, font=font2)
    w2, h2 = bbox2[2] - bbox2[0], bbox2[3] - bbox2[1]

    spacing = 14
    total_text_h = h1 + spacing + h2
    start_y = (target_h - total_text_h) // 2

    x1 = (target_w - w1) // 2 - bbox1[0]
    y1 = start_y - bbox1[1]

    x2 = (target_w - w2) // 2 - bbox2[0]
    y2 = start_y + h1 + spacing - bbox2[1]

    # Multilayer drop shadow for contrast
    shadow = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    offsets = [
        (0, 4), (0, -2), (3, 0), (-3, 0),
        (2, 3), (-2, 3), (2, -2), (-2, -2),
        (0, 2), (0, -1), (1, 1), (-1, 1)
    ]
    for ox, oy in offsets:
        sdraw.text((x1 + ox, y1 + oy), text1, font=font1, fill=(0, 0, 0, 160))
        sdraw.text((x2 + ox, y2 + oy), text2, font=font2, fill=(0, 0, 0, 180))

    shadow_blurred = shadow.filter(ImageFilter.GaussianBlur(radius=3))
    composed = Image.alpha_composite(composed, shadow_blurred)

    draw_fg = ImageDraw.Draw(composed)
    draw_fg.text((x1, y1), text1, font=font1, fill=(255, 255, 255, 255))
    draw_fg.text((x2, y2), text2, font=font2, fill=(255, 212, 121, 255))

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    composed.convert("RGB").save(output_path, "PNG", optimize=True)
    size_kb = os.path.getsize(output_path) // 1024
    logger.info(f"Discord embed banner saved: {output_path} ({size_kb} KB)")
    return True


def run_pipeline(
    api_key: str,
    limit: int = 30,
    quality: int = 90,
    web_backdrop_path: str = DEFAULT_WEB_BACKDROP,
    discord_banner_path: str = DEFAULT_DISCORD_BANNER
) -> bool:
    """Executes web asset generation."""
    logger.info("Starting web visual assets pipeline...")

    movies = fetch_top_latin_movies(api_key, limit=limit)
    if not movies:
        logger.error("No movies retrieved from TMDB. Aborting.")
        return False
    logger.info(f"Retrieved {len(movies)} unique movies with poster paths.")

    canvas = render_brick_canvas(movies, limit=limit)
    if not canvas:
        logger.error("Failed to render brick mosaic canvas.")
        return False

    if not generate_web_hero_backdrop(canvas, web_backdrop_path, quality=quality):
        return False

    if not generate_discord_embed_banner(canvas, discord_banner_path):
        return False

    logger.info("Web assets generated successfully.")
    return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Nuvio Setup web visual asset pipeline (Hero Backdrop & Embed Banner)",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument("--api-key", default=None, help="TheMovieDatabase (TMDB) API Key")
    parser.add_argument("--limit", type=int, default=30, help="Number of unique movies to download")
    parser.add_argument("--quality", type=int, default=90, help="WebP compression quality (1-100)")
    parser.add_argument("--web-backdrop", default=DEFAULT_WEB_BACKDROP, help="Path for web backdrop WebP")
    parser.add_argument("--discord-banner", default=DEFAULT_DISCORD_BANNER, help="Path for Discord OpenGraph PNG")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    api_key = get_api_key(args.api_key)

    success = run_pipeline(
        api_key=api_key,
        limit=args.limit,
        quality=args.quality,
        web_backdrop_path=args.web_backdrop,
        discord_banner_path=args.discord_banner
    )

    if success:
        logger.info("Pipeline completed with exit status 0.")
        sys.exit(0)
    else:
        logger.error("Pipeline failed with exit status 1.")
        sys.exit(1)


if __name__ == "__main__":
    main()
