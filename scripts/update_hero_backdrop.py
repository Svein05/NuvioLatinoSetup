#!/usr/bin/env python3
"""
Nuvio Latino Setup - Asset Generation and TMDB Sync Pipeline
------------------------------------------------------------
Generates cinematic visual assets from popular Latin American TMDB movies:
  1. assets/preview/hero-posters-backdrop.webp (Web Panoramic Backdrop, 2240x1200)
  2. assets/preview/incrustacion.png (Web OpenGraph / Discord Embed Banner, 1200x630)
  3. assets/preview/github-social-preview.png (GitHub Social Preview Banner, 1280x640)

Authentication:
  - TMDB API Key: Via environment variable TMDB_API_KEY or CLI option --api-key.
  - GitHub metadata: Public API queries with User-Agent header (supports GITHUB_TOKEN if present).

Exit codes:
  - 0: Successful execution.
  - 1: Configuration, network, or image processing error.
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
from typing import List, Dict, Optional, Tuple, Any

from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageFilter

# Configure standard structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("NuvioAssetPipeline")

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_WEB_BACKDROP = os.path.join(PROJECT_ROOT, "assets", "preview", "hero-posters-backdrop.webp")
DEFAULT_DISCORD_BANNER = os.path.join(PROJECT_ROOT, "assets", "preview", "incrustacion.png")
DEFAULT_GITHUB_PREVIEW = os.path.join(PROJECT_ROOT, "assets", "preview", "github-social-preview.png")
DEFAULT_LOCAL_LOGO = os.path.join(PROJECT_ROOT, "assets", "logo", "logo.jpg")

FONT_SERIF = os.path.join(PROJECT_ROOT, "assets", "fonts", "instrument-serif-latin.woff2")
FONT_SERIF_ITALIC = os.path.join(PROJECT_ROOT, "assets", "fonts", "instrument-serif-italic-latin.woff2")
FONT_SANS = os.path.join(PROJECT_ROOT, "assets", "fonts", "instrument-sans-latin.woff2")


def get_api_key(cli_arg: Optional[str] = None) -> str:
    """Retrieves TMDB API key from CLI argument or environment variable."""
    key = cli_arg or os.getenv("TMDB_API_KEY")
    if not key or not key.strip():
        logger.error(
            "TMDB API key not found. Please provide --api-key or define TMDB_API_KEY environment variable."
        )
        sys.exit(1)
    return key.strip()


def resolve_release_version(cli_arg: Optional[str] = None) -> str:
    """Resolves current release version from CLI, CI environment, or config.js."""
    if cli_arg and cli_arg.strip():
        ver = cli_arg.strip()
        return ver if ver.startswith("v") else f"v{ver}"

    ci_ref = os.getenv("GITHUB_REF_NAME")
    if ci_ref and ci_ref.strip():
        ver = ci_ref.strip()
        return ver if ver.startswith("v") else f"v{ver}"

    config_path = os.path.join(PROJECT_ROOT, "js", "config.js")
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                for line in f:
                    if "VERSION:" in line:
                        parts = line.split('"')
                        if len(parts) >= 2:
                            ver = parts[1].strip()
                            return ver if ver.startswith("v") else f"v{ver}"
        except Exception as err:
            logger.warning(f"Could not read version from config.js: {err}")

    return "v1.4.0"


def fetch_github_metadata(repo: str = "Svein05/NuvioLatinoSetup") -> Dict[str, Any]:
    """Fetches public repository stats (stars, forks) from GitHub API."""
    url = f"https://api.github.com/repos/{repo}"
    headers = {"User-Agent": "NuvioAssetPipeline/1.0"}
    token = os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as res:
            data = json.loads(res.read().decode("utf-8"))
            stars = data.get("stargazers_count", 2)
            forks = data.get("forks_count", 0)
            logger.info(f"GitHub repository metadata retrieved: {repo} (Stars: {stars}, Forks: {forks})")
            return {"stars": stars, "forks": forks, "full_name": repo}
    except Exception as err:
        logger.warning(f"Unable to fetch GitHub repository metadata ({err}). Using fallback values.")
        return {"stars": 2, "forks": 0, "full_name": repo}


def fetch_avatar_image(avatar_url: str = "https://github.com/Svein05.png") -> Image.Image:
    """Fetches user avatar from GitHub or loads local project logo as fallback."""
    headers = {"User-Agent": "NuvioAssetPipeline/1.0"}
    try:
        req = urllib.request.Request(avatar_url, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as res:
            img = Image.open(BytesIO(res.read())).convert("RGBA")
            logger.info("Author avatar successfully fetched from GitHub.")
            return img
    except Exception as err:
        logger.warning(f"Could not download avatar from {avatar_url} ({err}). Falling back to local logo.")

    if os.path.exists(DEFAULT_LOCAL_LOGO):
        try:
            return Image.open(DEFAULT_LOCAL_LOGO).convert("RGBA")
        except Exception as local_err:
            logger.warning(f"Could not load local logo ({local_err}). Using generated placeholder.")

    # Generates a clean dark placeholder if neither is available
    fallback = Image.new("RGBA", (200, 200), (30, 41, 59, 255))
    return fallback


def fetch_top_latin_movies(api_key: str, limit: int = 30) -> List[Dict[str, str]]:
    """Queries popular TMDB movies localized in Latin American Spanish (es-MX)."""
    movies: List[Dict[str, str]] = []
    page = 1
    headers = {"User-Agent": "NuvioAssetPipeline/1.0"}
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
            logger.warning(f"Error fetching TMDB page {page}: {err}")
            break
        page += 1

    return movies


def download_image(url: str) -> Optional[Image.Image]:
    """Downloads an image from URL and returns a PIL RGB Image."""
    headers = {"User-Agent": "NuvioAssetPipeline/1.0"}
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

    # Subtle contrast and color enhancement
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
    draw_fg.text((x2, y2), text2, font=font2, fill=(255, 212, 121, 255))  # Gold #ffd479

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    composed.convert("RGB").save(output_path, "PNG", optimize=True)
    size_kb = os.path.getsize(output_path) // 1024
    logger.info(f"Discord embed banner saved: {output_path} ({size_kb} KB)")
    return True


def draw_star(
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    r_out: float,
    fill: Tuple[int, int, int, int]
) -> None:
    """Draws a crisp geometric 5-pointed golden star vector."""
    points = []
    r_in = r_out * 0.42
    for i in range(10):
        angle = -math.pi / 2 + i * (math.pi / 5)
        r = r_out if i % 2 == 0 else r_in
        points.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    draw.polygon(points, fill=fill)


def draw_rounded_pill(
    draw: ImageDraw.ImageDraw,
    xy: Tuple[int, int, int, int],
    radius: int,
    fill: Tuple[int, int, int, int],
    outline: Optional[Tuple[int, int, int, int]] = None,
    width: int = 1
) -> None:
    """Helper to draw rounded glassmorphic pills with optional alpha border."""
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle((x0, y0, x1, y1), radius=radius, fill=fill, outline=outline, width=width)


def generate_github_social_preview(
    canvas: Image.Image,
    output_path: str,
    version: str,
    stars: int,
    avatar_img: Image.Image,
    repo_name: str = "Svein05/NuvioLatinoSetup"
) -> bool:
    """
    Generates GitHub Social Preview banner (1280x640 px, 2:1 aspect ratio)
    featuring:
      - Cinematic brick poster background with atmospheric vignette
      - Top glassmorphic header capsule with avatar, username/repo, live stars, and release badge
      - Instrument Serif center typography with gold accents
      - Tech feature pills and subtle repository footer
    """
    target_w, target_h = 1280, 640
    canvas_w, canvas_h = canvas.size

    crop_h = int(canvas_w * (target_h / target_w))
    crop_y = max(0, (canvas_h - crop_h) // 2)
    preview_raw = canvas.crop((0, crop_y, canvas_w, min(canvas_h, crop_y + crop_h)))
    base = preview_raw.resize((target_w, target_h), Image.Resampling.LANCZOS).convert("RGBA")

    # Color enhancement
    enhancer = ImageEnhance.Color(base)
    base = enhancer.enhance(1.06)

    # Dark atmospheric vignette for high contrast
    small_w, small_h = 256, 128
    vignette_small = Image.new("L", (small_w, small_h))
    cx, cy = small_w / 2.0, small_h / 2.0
    pixels = vignette_small.load()
    for y in range(small_h):
        for x in range(small_w):
            dx = (x - cx) / cx
            dy = (y - cy) / cy
            d = math.sqrt(dx * dx * 0.8 + dy * dy * 1.3)
            # Increased center/edge darkening for card readability
            alpha = int(120 + 95 * min(1.0, max(0.0, d)))
            pixels[x, y] = alpha

    vignette = vignette_small.resize((target_w, target_h), Image.Resampling.BILINEAR)
    dark_overlay = Image.new("RGBA", (target_w, target_h), (8, 9, 12, 0))
    dark_overlay.putalpha(vignette)
    composed = Image.alpha_composite(base, dark_overlay)

    # Fonts
    font_sans_repo = ImageFont.truetype(FONT_SANS, 22)
    font_sans_badge = ImageFont.truetype(FONT_SANS, 19)
    font_sans_pills = ImageFont.truetype(FONT_SANS, 18)
    font_sans_footer = ImageFont.truetype(FONT_SANS, 16)
    font_serif_h1 = ImageFont.truetype(FONT_SERIF, 68)
    font_serif_h2 = ImageFont.truetype(FONT_SERIF_ITALIC, 76)

    # Overlay layer for glassmorphic shapes
    glass_layer = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glass_layer)

    # -------------------------------------------------------------
    # 1. TOP HEADER BAR (Glassmorphic)
    # -------------------------------------------------------------
    header_x0, header_y0 = 60, 48
    header_x1, header_y1 = target_w - 60, 114
    # Draw main top glass container
    draw_rounded_pill(
        gdraw,
        (header_x0, header_y0, header_x1, header_y1),
        radius=33,
        fill=(15, 18, 26, 175),
        outline=(255, 255, 255, 45),
        width=1
    )

    # Circular Avatar
    avatar_size = 46
    avatar_x = header_x0 + 12
    avatar_y = header_y0 + (header_y1 - header_y0 - avatar_size) // 2
    resized_avatar = avatar_img.resize((avatar_size, avatar_size), Image.Resampling.LANCZOS).convert("RGBA")

    # Create circular mask
    mask = Image.new("L", (avatar_size, avatar_size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, avatar_size - 1, avatar_size - 1), fill=255)
    avatar_circle = Image.new("RGBA", (avatar_size, avatar_size), (0, 0, 0, 0))
    avatar_circle.paste(resized_avatar, (0, 0), mask=mask)

    # Paste avatar onto composed image directly
    composed = Image.alpha_composite(composed, glass_layer)
    composed.paste(avatar_circle, (avatar_x, avatar_y), mask=avatar_circle)

    # Re-acquire draw layer for texts & badges
    ui_layer = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    uidraw = ImageDraw.Draw(ui_layer)

    # Avatar ring border
    uidraw.ellipse(
        (avatar_x, avatar_y, avatar_x + avatar_size - 1, avatar_y + avatar_size - 1),
        outline=(255, 255, 255, 75),
        width=1
    )

    # Repo name text
    repo_text_x = avatar_x + avatar_size + 14
    bbox_rn = uidraw.textbbox((0, 0), repo_name, font=font_sans_repo)
    rn_h = bbox_rn[3] - bbox_rn[1]
    repo_text_y = header_y0 + (header_y1 - header_y0 - rn_h) // 2 - bbox_rn[1]
    uidraw.text((repo_text_x, repo_text_y), repo_name, font=font_sans_repo, fill=(241, 245, 249, 255))

    # Right-aligned badges: Stars & Release Version
    star_label = f"{stars} Stars" if stars != 1 else "1 Star"
    bbox_stars = uidraw.textbbox((0, 0), star_label, font=font_sans_badge)
    stars_text_w = bbox_stars[2] - bbox_stars[0]
    star_icon_w = 16
    star_gap = 8
    stars_content_w = star_icon_w + star_gap + stars_text_w
    stars_pill_w = stars_content_w + 28
    stars_pill_h = 36
    stars_pill_y = header_y0 + (header_y1 - header_y0 - stars_pill_h) // 2

    ver_str = f"Release {version}"
    bbox_ver = uidraw.textbbox((0, 0), ver_str, font=font_sans_badge)
    ver_w = bbox_ver[2] - bbox_ver[0]
    ver_pill_w = ver_w + 32
    ver_pill_h = 36
    ver_pill_y = stars_pill_y

    ver_pill_x1 = header_x1 - 14
    ver_pill_x0 = ver_pill_x1 - ver_pill_w

    stars_pill_x1 = ver_pill_x0 - 10
    stars_pill_x0 = stars_pill_x1 - stars_pill_w

    # Draw Stars Pill
    draw_rounded_pill(
        uidraw,
        (stars_pill_x0, stars_pill_y, stars_pill_x1, stars_pill_y + stars_pill_h),
        radius=18,
        fill=(30, 41, 59, 180),
        outline=(251, 191, 36, 120),
        width=1
    )
    star_cx = stars_pill_x0 + (stars_pill_w - stars_content_w) // 2 + 8
    star_cy = stars_pill_y + stars_pill_h // 2
    draw_star(uidraw, star_cx, star_cy, r_out=7.5, fill=(251, 191, 36, 255))

    s_text_x = star_cx + 12 - bbox_stars[0]
    s_text_y = stars_pill_y + (stars_pill_h - (bbox_stars[3] - bbox_stars[1])) // 2 - bbox_stars[1]
    uidraw.text((s_text_x, s_text_y), star_label, font=font_sans_badge, fill=(253, 230, 138, 255))

    # Draw Release Version Pill (Emerald)
    draw_rounded_pill(
        uidraw,
        (ver_pill_x0, ver_pill_y, ver_pill_x1, ver_pill_y + ver_pill_h),
        radius=18,
        fill=(6, 78, 59, 190),
        outline=(52, 211, 153, 140),
        width=1
    )
    v_text_x = ver_pill_x0 + (ver_pill_w - ver_w) // 2 - bbox_ver[0]
    v_text_y = ver_pill_y + (ver_pill_h - (bbox_ver[3] - bbox_ver[1])) // 2 - bbox_ver[1]
    uidraw.text((v_text_x, v_text_y), ver_str, font=font_sans_badge, fill=(110, 231, 183, 255))

    # -------------------------------------------------------------
    # 2. CENTER TYPOGRAPHY & HERO
    # -------------------------------------------------------------
    title1 = "Transforma tu Nuvio con"
    title2 = "Metadatos y Colecciones Latinas"

    bbox_t1 = uidraw.textbbox((0, 0), title1, font=font_serif_h1)
    w_t1, h_t1 = bbox_t1[2] - bbox_t1[0], bbox_t1[3] - bbox_t1[1]

    bbox_t2 = uidraw.textbbox((0, 0), title2, font=font_serif_h2)
    w_t2, h_t2 = bbox_t2[2] - bbox_t2[0], bbox_t2[3] - bbox_t2[1]

    title_spacing = 16
    total_title_h = h_t1 + title_spacing + h_t2
    title_start_y = 175

    t1_x = (target_w - w_t1) // 2 - bbox_t1[0]
    t1_y = title_start_y - bbox_t1[1]

    t2_x = (target_w - w_t2) // 2 - bbox_t2[0]
    t2_y = title_start_y + h_t1 + title_spacing - bbox_t2[1]

    # Multilayer shadow for title
    shadow = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    offsets = [
        (0, 4), (0, -2), (3, 0), (-3, 0),
        (2, 3), (-2, 3), (2, -2), (-2, -2),
        (0, 2), (0, -1), (1, 1), (-1, 1)
    ]
    for ox, oy in offsets:
        sdraw.text((t1_x + ox, t1_y + oy), title1, font=font_serif_h1, fill=(0, 0, 0, 160))
        sdraw.text((t2_x + ox, t2_y + oy), title2, font=font_serif_h2, fill=(0, 0, 0, 190))

    shadow_blurred = shadow.filter(ImageFilter.GaussianBlur(radius=3))
    composed = Image.alpha_composite(composed, shadow_blurred)

    uidraw.text((t1_x, t1_y), title1, font=font_serif_h1, fill=(255, 255, 255, 255))
    uidraw.text((t2_x, t2_y), title2, font=font_serif_h2, fill=(255, 212, 121, 255))

    # -------------------------------------------------------------
    # 3. FEATURE TAG PILLS (Center bottom)
    # -------------------------------------------------------------
    tag_pills = [
        "Español Latino (es-MX)",
        "Sincronización Instantánea",
        "Jamstack • $0 Costo"
    ]
    pill_padding_x = 22
    pill_h = 38
    pill_spacing = 14

    measured_pills = []
    total_pills_w = 0
    for tag in tag_pills:
        bbox_pill = uidraw.textbbox((0, 0), tag, font=font_sans_pills)
        tw = bbox_pill[2] - bbox_pill[0]
        th = bbox_pill[3] - bbox_pill[1]
        pw = tw + pill_padding_x * 2
        measured_pills.append((tag, pw, tw, th, bbox_pill))
        total_pills_w += pw
    total_pills_w += pill_spacing * (len(tag_pills) - 1)

    pills_start_x = (target_w - total_pills_w) // 2
    pills_y = 445

    curr_px = pills_start_x
    for tag, pw, tw, th, bbox_pill in measured_pills:
        draw_rounded_pill(
            uidraw,
            (curr_px, pills_y, curr_px + pw, pills_y + pill_h),
            radius=19,
            fill=(15, 23, 42, 170),
            outline=(255, 255, 255, 40),
            width=1
        )
        tx = curr_px + (pw - tw) // 2 - bbox_pill[0]
        ty = pills_y + (pill_h - th) // 2 - bbox_pill[1]
        uidraw.text((tx, ty), tag, font=font_sans_pills, fill=(226, 232, 240, 240))
        curr_px += pw + pill_spacing

    # -------------------------------------------------------------
    # 4. FOOTER BAR (Subtle repo & web URLs)
    # -------------------------------------------------------------
    footer_y = 575
    left_footer = "github.com/Svein05/NuvioLatinoSetup"
    right_footer = "svein05.github.io/NuvioLatinoSetup"

    uidraw.text((64, footer_y), left_footer, font=font_sans_footer, fill=(148, 163, 184, 180))
    bbox_rf = uidraw.textbbox((0, 0), right_footer, font=font_sans_footer)
    rf_w = bbox_rf[2] - bbox_rf[0]
    uidraw.text((target_w - 64 - rf_w, footer_y), right_footer, font=font_sans_footer, fill=(148, 163, 184, 180))

    composed = Image.alpha_composite(composed, ui_layer)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    composed.convert("RGB").save(output_path, "PNG", optimize=True)
    size_kb = os.path.getsize(output_path) // 1024
    logger.info(f"GitHub social preview saved: {output_path} ({size_kb} KB)")
    return True


def run_pipeline(
    api_key: str,
    limit: int = 30,
    version: Optional[str] = None,
    quality: int = 90,
    web_backdrop_path: str = DEFAULT_WEB_BACKDROP,
    discord_banner_path: str = DEFAULT_DISCORD_BANNER,
    github_preview_path: str = DEFAULT_GITHUB_PREVIEW
) -> bool:
    """Executes the full asset generation pipeline."""
    logger.info("Starting Nuvio asset pipeline execution...")

    # 1. Resolve version and GitHub stats
    resolved_version = resolve_release_version(version)
    gh_metadata = fetch_github_metadata()
    stars = gh_metadata.get("stars", 2)
    repo_name = gh_metadata.get("full_name", "Svein05/NuvioLatinoSetup")
    avatar = fetch_avatar_image()

    logger.info(f"Pipeline parameters: Version={resolved_version}, Stars={stars}, Repo={repo_name}")

    # 2. Fetch movies
    movies = fetch_top_latin_movies(api_key, limit=limit)
    if not movies:
        logger.error("No movies retrieved from TMDB. Aborting pipeline.")
        return False
    logger.info(f"Retrieved {len(movies)} unique movies with poster paths from TMDB.")

    # 3. Build brick wall canvas
    canvas = render_brick_canvas(movies, limit=limit)
    if not canvas:
        logger.error("Failed to build brick mosaic canvas. Aborting pipeline.")
        return False

    # 4. Generate Web Hero Backdrop (WebP)
    try:
        generate_web_hero_backdrop(canvas, web_backdrop_path, quality=quality)
    except Exception as err:
        logger.error(f"Error generating web hero backdrop: {err}")
        return False

    # 5. Generate Discord Embed Banner (PNG, 1200x630)
    try:
        generate_discord_embed_banner(canvas, discord_banner_path)
    except Exception as err:
        logger.error(f"Error generating Discord embed banner: {err}")
        return False

    # 6. Generate GitHub Social Preview (PNG, 1280x640)
    try:
        generate_github_social_preview(
            canvas,
            github_preview_path,
            version=resolved_version,
            stars=stars,
            avatar_img=avatar,
            repo_name=repo_name
        )
    except Exception as err:
        logger.error(f"Error generating GitHub social preview: {err}")
        return False

    logger.info("All visual assets generated successfully.")
    return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Nuvio Setup visual asset generation pipeline (Web, Discord & GitHub)",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument("--api-key", default=None, help="TheMovieDatabase (TMDB) API Key (or set TMDB_API_KEY env)")
    parser.add_argument("--limit", type=int, default=30, help="Number of unique movies to download")
    parser.add_argument("--version", default=None, help="Release version tag (e.g. v1.4.0)")
    parser.add_argument("--quality", type=int, default=90, help="WebP compression quality (1-100)")
    parser.add_argument("--web-backdrop", default=DEFAULT_WEB_BACKDROP, help="Path for web backdrop WebP")
    parser.add_argument("--discord-banner", default=DEFAULT_DISCORD_BANNER, help="Path for Discord OpenGraph PNG")
    parser.add_argument("--github-preview", default=DEFAULT_GITHUB_PREVIEW, help="Path for GitHub Social Preview PNG")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    api_key = get_api_key(args.api_key)

    success = run_pipeline(
        api_key=api_key,
        limit=args.limit,
        version=args.version,
        quality=args.quality,
        web_backdrop_path=args.web_backdrop,
        discord_banner_path=args.discord_banner,
        github_preview_path=args.github_preview
    )

    if success:
        logger.info("Pipeline completed with exit status 0.")
        sys.exit(0)
    else:
        logger.error("Pipeline encountered errors. Exit status 1.")
        sys.exit(1)


if __name__ == "__main__":
    main()
