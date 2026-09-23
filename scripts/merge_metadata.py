"""Utilidad de consolidación y optimización de metadatos para AIOMetadata.

Unifica catálogos comunitarios, fuentes TMDB/MDBList y parámetros regionales en
Español Latino (es-MX) garantizando compatibilidad con el ecosistema de Nuvio.
"""
import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
META1_PATH = os.path.join(BASE_DIR, "templates", "MetadataLatino.json")
META2_PATH = os.path.join(BASE_DIR, "templates", "MetadataLatino2.json")
COL_PATH = os.path.join(BASE_DIR, "templates", "NuvioCollections.json")
OUT_META_PATH = os.path.join(BASE_DIR, "templates", "MetadataLatino.json")

def load_json(p):
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(p, data):
    with open(p, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def merge_metadata():
    meta1 = load_json(META1_PATH)
    meta2 = load_json(META2_PATH)
    cols = load_json(COL_PATH)

    cfg1 = meta1.get("config", {})
    cfg2 = meta2.get("config", {})

    cats1 = cfg1.get("catalogs", []) or meta1.get("catalogs", [])
    cats2 = cfg2.get("catalogs", []) or meta2.get("catalogs", [])

    # Indexar catálogos por ID
    cat_map = {}
    
    # 1. Base: catálogos de Meta1 (TMDB discover, géneros, décadas, estudios)
    for c in cats1:
        if "id" in c:
            cat_map[c["id"]] = c

    # 2. Prioridad / Ampliación: catálogos de Meta2 (MDBList, Kitsu, Anime, etc.)
    for c in cats2:
        if "id" in c:
            cat_map[c["id"]] = c

    print(f"Total catálogos combinados: {len(cat_map)}")

    # Verificar que todos los catalogIds referenciados en NuvioCollections estén presentes o respaldados
    referenced_ids = set()
    for sec in cols:
        for fld in sec.get("folders", []):
            for cs in fld.get("catalogSources", []):
                if cs.get("catalogId"):
                    referenced_ids.add(cs["catalogId"])
            for s in fld.get("sources", []):
                if s.get("catalogId"):
                    referenced_ids.add(s["catalogId"])

    missing = referenced_ids - set(cat_map.keys())
    print(f"Catálogos referenciados en colecciones: {len(referenced_ids)}")
    print(f"Catálogos faltantes en metadata: {len(missing)}")
    if missing:
        print(f"Faltantes: {missing}")
        # Para catálogos comunitarios de addons (ej. lat-add_movies, latinobrid_movies) o tmdb aliases,
        # crear stubs si no existen
        for mid in missing:
            source = "community"
            if mid.startswith("tmdb."):
                source = "tmdb"
            elif mid.startswith("mdblist."):
                source = "mdblist"
            cat_map[mid] = {
                "id": mid,
                "type": "movie" if "movie" in mid else "series",
                "name": mid.replace("_", " ").title(),
                "enabled": True,
                "showInHome": False,
                "source": source
            }
        print(f"Se crearon {len(missing)} stubs compatibles para catálogos complementarios.")

    all_catalogs = list(cat_map.values())

    # Usar la base de configuración avanzada de Setup 2
    final_meta = json.loads(json.dumps(meta2))
    if "config" not in final_meta:
        final_meta["config"] = {}

    final_cfg = final_meta["config"]
    final_cfg["catalogs"] = all_catalogs
    final_meta["catalogs"] = all_catalogs

    # Configuración óptima para Latino
    final_cfg["language"] = "es-MX"
    final_cfg["forceLatinCastNames"] = True
    final_cfg["usePosterProxy"] = True
    final_cfg["enableRatingPostersForLibrary"] = True
    final_cfg["hideUnreleasedDigital"] = True
    final_cfg["hideUnreleasedShows"] = True
    final_cfg["customPosterUrlPattern"] = "https://btttr.cc/poster-n/imdb/poster-default/{imdb_id}.jpg?lang=es"

    # API Keys limpias para ser inyectadas por el asistente
    final_cfg["apiKeys"] = {
        "gemini": "",
        "tmdb": "",
        "tvdb": "",
        "fanart": "",
        "rpdb": "t0-free-rpdb",
        "topPoster": "",
        "mdblist": "",
        "openrouter": "",
        "publicmetadb": "",
        "traktTokenId": "",
        "simklTokenId": "",
        "anilistTokenId": "",
        "customDescriptionBlurb": ""
    }

    save_json(OUT_META_PATH, final_meta)
    print(f"Metadata unificada guardada exitosamente en: {OUT_META_PATH}")
    print(f"Total catálogos finales en MetadataLatino.json: {len(all_catalogs)}")

if __name__ == "__main__":
    merge_metadata()

