import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
COL_PATH = os.path.join(BASE_DIR, "templates", "NuvioCollections.json")
META_PATH = os.path.join(BASE_DIR, "templates", "MetadataLatino.json")

def fix_collections():
    with open(COL_PATH, "r", encoding="utf-8") as f:
        cols = json.load(f)

    fixed_count = 0
    for sec in cols:
        sec_title = sec.get("title", "")
        # En Géneros, asegurar que todas sean LANDSCAPE
        if "género" in sec_title.lower():
            for fld in sec.get("folders", []):
                if fld.get("tileShape") != "LANDSCAPE":
                    fld["tileShape"] = "LANDSCAPE"
                    fixed_count += 1

    with open(COL_PATH, "w", encoding="utf-8") as f:
        json.dump(cols, f, indent=2, ensure_ascii=False)
    print(f"Colecciones actualizadas: {fixed_count} carpetas de Géneros corregidas a 'LANDSCAPE'.")

def fix_metadata_tags():
    with open(META_PATH, "r", encoding="utf-8") as f:
        meta = json.load(f)

    cfg = meta.get("config", {})
    catalogs = cfg.get("catalogs", [])

    tagged_count = 0
    for cat in catalogs:
        cid = cat.get("id", "")
        name = cat.get("name", "")
        tags = set(cat.get("tags", []))

        # Asignar tags contextuales según prefijo o tipo
        if "streaming" in cid or "streaming" in name.lower() or any(p in cid for p in ["netflix", "prime", "hbo", "disney", "apple", "paramount", "peacock", "shudder", "starz", "hulu"]):
            tags.add("Plataforma Streaming")
        elif "decade" in cid or any(yr in name for yr in ["1950", "1960", "1970", "1980", "1990", "2000", "2010", "2020"]):
            tags.add("Décadas")
        elif "studio" in cid or any(st in name.lower() for st in ["marvel", "dc", "pixar", "ghibli", "lucasfilm", "dreamworks", "cartoon network", "nickelodeon"]):
            tags.add("Studio")
        elif "anime" in cid or "kitsu" in cid or "mal" in cid:
            tags.add("Anime")
        elif "genre" in cid:
            tags.add("Genero")
        elif "theme" in cid:
            tags.add("Descubre")

        if len(tags) > len(cat.get("tags", [])):
            cat["tags"] = sorted(list(tags))
            tagged_count += 1

    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)
    print(f"Metadata actualizada: {tagged_count} catálogos enriquecidos con tags.")

if __name__ == "__main__":
    fix_collections()
    fix_metadata_tags()
