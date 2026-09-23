"""Descargador concurrente de recursos multimedia de colecciones de Nuvio.

Extrae y descarga pósters, fondos hero y logotipos en alta resolución
desde las plantillas de colecciones para almacenamiento local estático.
"""
import os
import sys
import json
import re
import urllib.request
import urllib.error
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
COL2_PATH = os.path.join(BASE_DIR, "templates", "NuvioCollections2.json")
OUTPUT_DIR = os.path.join(BASE_DIR, "assets", "collections")
MAPPING_PATH = os.path.join(BASE_DIR, "assets", "collections", "url_mapping.json")

os.makedirs(OUTPUT_DIR, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def clean_slug(text):
    text = re.sub(r'[^\w\s-]', '', text.lower())
    text = re.sub(r'[\s_-]+', '_', text).strip('_')
    return text or "item"

def get_filename(sec_title, fld_title, field_name, url):
    # Obtener extensión original
    ext = ".jpg"
    clean_url = url.split("?")[0].split("#")[0]
    if clean_url.endswith(".png"):
        ext = ".png"
    elif clean_url.endswith(".webp"):
        ext = ".webp"
    elif clean_url.endswith(".gif"):
        ext = ".gif"
    elif clean_url.endswith(".svg"):
        ext = ".svg"
    elif clean_url.endswith(".jpeg"):
        ext = ".jpeg"

    # Mapeo de nombres de campo cortos
    type_suffix = "cover"
    if "logo" in field_name.lower():
        type_suffix = "logo"
    elif "backdrop" in field_name.lower():
        type_suffix = "backdrop"
    elif "gif" in field_name.lower():
        type_suffix = "gif"

    slug_sec = clean_slug(sec_title)
    slug_fld = clean_slug(fld_title)

    filename = f"{slug_sec}_{slug_fld}_{type_suffix}{ext}"
    return filename

def download_single(item):
    url = item["url"]
    filepath = item["filepath"]
    rel_path = item["rel_path"]

    # Si ya existe y pesa más de 500 bytes, evitar re-descarga
    if os.path.exists(filepath) and os.path.getsize(filepath) > 500:
        return {"url": url, "rel_path": rel_path, "status": "cached", "bytes": os.path.getsize(filepath)}

    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = resp.read()
                if len(data) < 200:
                    raise Exception(f"Descarga incompleta o corrupta ({len(data)} bytes)")
                with open(filepath, "wb") as f_out:
                    f_out.write(data)
                return {"url": url, "rel_path": rel_path, "status": "ok", "bytes": len(data)}
        except Exception as e:
            if attempt == max_retries:
                return {"url": url, "rel_path": rel_path, "status": "failed", "error": str(e)}
            time.sleep(1.5 * attempt)

def main():
    print(f"Cargando colecciones desde: {COL2_PATH}")
    with open(COL2_PATH, "r", encoding="utf-8") as f:
        col2 = json.load(f)

    image_fields = ["coverImageUrl", "titleLogoUrl", "heroBackdropUrl", "focusGifUrl"]
    seen_urls = {}
    used_filenames = set()

    for s_idx, sec in enumerate(col2):
        sec_title = sec.get("title", f"sec_{s_idx}")
        for f_idx, fld in enumerate(sec.get("folders", [])):
            fld_title = fld.get("title", f"fld_{f_idx}")
            for field in image_fields:
                url = fld.get(field)
                if url and isinstance(url, str) and url.startswith("http"):
                    if url not in seen_urls:
                        base_fname = get_filename(sec_title, fld_title, field, url)
                        fname = base_fname
                        counter = 1
                        while fname in used_filenames:
                            name_part, ext_part = os.path.splitext(base_fname)
                            fname = f"{name_part}_{counter}{ext_part}"
                            counter += 1
                        used_filenames.add(fname)

                        filepath = os.path.join(OUTPUT_DIR, fname)
                        rel_path = f"./assets/collections/{fname}"
                        seen_urls[url] = {
                            "url": url,
                            "filename": fname,
                            "filepath": filepath,
                            "rel_path": rel_path,
                            "section": sec_title,
                            "folder": fld_title,
                            "field": field
                        }

    items = list(seen_urls.values())
    print(f"Total de imágenes únicas a descargar: {len(items)}")

    results = []
    failed = []
    start_time = time.time()

    # Descarga concurrente con 10 hilos
    with ThreadPoolExecutor(max_workers=10) as executor:
        future_to_item = {executor.submit(download_single, it): it for it in items}
        completed = 0
        for future in as_completed(future_to_item):
            res = future.result()
            completed += 1
            if res["status"] in ("ok", "cached"):
                print(f"[{completed}/{len(items)}] ✓ {res['status'].upper()}: {res['rel_path']} ({res.get('bytes', 0) // 1024} KB)")
            else:
                print(f"[{completed}/{len(items)}] ✗ ERROR: {res['url']} -> {res.get('error')}")
                failed.append(res)
            results.append(res)

    duration = time.time() - start_time
    print(f"\nDescarga finalizada en {duration:.1f}s. Exitosos: {len(items) - len(failed)}, Fallidos: {len(failed)}")

    # Guardar mapa de URL original -> ruta local
    mapping = {it["url"]: it["rel_path"] for it in items}
    with open(MAPPING_PATH, "w", encoding="utf-8") as f_map:
        json.dump(mapping, f_map, indent=2, ensure_ascii=False)
    print(f"Mapa de URLs guardado en: {MAPPING_PATH}")

if __name__ == "__main__":
    main()

