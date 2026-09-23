import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
COL1_PATH = os.path.join(BASE_DIR, "templates", "NuvioCollections.json")
COL2_PATH = os.path.join(BASE_DIR, "templates", "NuvioCollections2.json")
MAPPING_PATH = os.path.join(BASE_DIR, "assets", "collections", "url_mapping.json")
OUT_COL_PATH = os.path.join(BASE_DIR, "templates", "NuvioCollections.json")

def load_json(p):
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(p, data):
    with open(p, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def apply_local_urls(obj, url_map):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, str) and v in url_map:
                obj[k] = url_map[v]
            elif isinstance(v, (dict, list)):
                apply_local_urls(v, url_map)
    elif isinstance(obj, list):
        for item in obj:
            apply_local_urls(item, url_map)

def combine_sources(s1_list, s2_list):
    """Combina fuentes sin duplicar catálogo y tipo"""
    seen = set()
    combined = []
    
    # Prioridad: s2 (MDBList / comunidad) luego s1 (TMDB discover)
    for s in (s2_list or []):
        key = (s.get("catalogId"), s.get("type"))
        if key not in seen:
            seen.add(key)
            combined.append(s)
            
    for s in (s1_list or []):
        key = (s.get("catalogId"), s.get("type"))
        if key not in seen:
            seen.add(key)
            combined.append(s)
            
    return combined

def merge():
    col1 = load_json(COL1_PATH)
    col2 = load_json(COL2_PATH)
    url_map = load_json(MAPPING_PATH)

    # Convertir todas las URLs de col2 a locales
    apply_local_urls(col2, url_map)

    # Indexar secciones y carpetas de col1
    col1_map = {s["id"]: s for s in col1}
    col2_map = {s["id"]: s for s in col2}

    merged_sections = []

    # ----------------------------------------------------
    # SECCIÓN 1: Ahora en Nuvio (Portada)
    # ----------------------------------------------------
    sec_ahora = col2_map.get("collection-fae673e2-community")
    if sec_ahora:
        # Enriquecer carpetas con fuentes de Col1
        col1_discover = col1_map.get("collections.discover", {})
        col1_fld_map = {f["title"].lower(): f for f in col1_discover.get("folders", [])}

        for fld in sec_ahora.get("folders", []):
            title = fld.get("title", "").lower()
            matching_col1 = None
            if "recomendad" in title:
                matching_col1 = col1_fld_map.get("recomendados")
            elif "tendencia" in title:
                matching_col1 = col1_fld_map.get("tendencias")
            elif "popular" in title:
                matching_col1 = col1_fld_map.get("populares")
            elif "ranking" in title:
                matching_col1 = col1_fld_map.get("mejor valorados")

            if matching_col1:
                fld["sources"] = combine_sources(matching_col1.get("sources"), fld.get("sources"))
                fld["catalogSources"] = combine_sources(matching_col1.get("catalogSources"), fld.get("catalogSources"))

        merged_sections.append(sec_ahora)

    # ----------------------------------------------------
    # SECCIÓN 2: Plataformas de Streaming
    # ----------------------------------------------------
    sec_stream2 = col2_map.get("collection-91e309bf-community-community")
    sec_stream1 = col1_map.get("collections.streaming")

    if sec_stream2:
        sec_stream = sec_stream2
        s1_flds = {f["title"].lower().replace(" ", ""): f for f in (sec_stream1.get("folders", []) if sec_stream1 else [])}
        
        # Combinar fuentes para plataformas existentes
        for fld in sec_stream.get("folders", []):
            fld_key = fld["title"].lower().replace(" ", "").replace("+", "plus")
            matched_s1 = s1_flds.get(fld_key) or s1_flds.get(fld["title"].lower().replace(" ", ""))
            if matched_s1:
                fld["sources"] = combine_sources(matched_s1.get("sources"), fld.get("sources"))
                fld["catalogSources"] = combine_sources(matched_s1.get("catalogSources"), fld.get("catalogSources"))

        # Agregar plataformas de Setup 1 que no estaban en Setup 2 (Hulu, Starz, Discovery Plus, Curiosity Stream)
        s2_fld_names = {f["title"].lower().replace(" ", "") for f in sec_stream.get("folders", [])}
        if sec_stream1:
            for f in sec_stream1.get("folders", []):
                k = f["title"].lower().replace(" ", "")
                if k not in s2_fld_names and not any(k in x for x in ("netflix", "prime", "disney", "hbo", "apple", "paramount", "crunchyroll", "peacock", "shudder")):
                    sec_stream["folders"].append(f)

        merged_sections.append(sec_stream)

    # ----------------------------------------------------
    # SECCIÓN 3: Géneros
    # ----------------------------------------------------
    sec_gen2 = col2_map.get("collection-cf795284-community-community")
    sec_gen1 = col1_map.get("collections.genres")

    if sec_gen2:
        sec_gen = sec_gen2
        s1_gen_map = {f["title"].lower(): f for f in (sec_gen1.get("folders", []) if sec_gen1 else [])}

        # Combinar fuentes de carpetas coincidentes
        for fld in sec_gen.get("folders", []):
            t = fld["title"].lower()
            matched = s1_gen_map.get(t)
            if not matched:
                for k, v in s1_gen_map.items():
                    if t in k or k in t:
                        matched = v
                        break
            if matched:
                fld["sources"] = combine_sources(matched.get("sources"), fld.get("sources"))
                fld["catalogSources"] = combine_sources(matched.get("catalogSources"), fld.get("catalogSources"))

        # Agregar géneros no cubiertos de Setup 1 (Familiar e Infantil, Historia y Bélico, Misterio, Crimen, Reality, TV)
        s2_gen_names = {f["title"].lower() for f in sec_gen.get("folders", [])}
        missing_genres = [
            "Familiar e Infantil", "Historia y Bélico", "Misterio", "Crimen",
            "Reality y Telenovelas", "Películas para TV"
        ]
        if sec_gen1:
            for f in sec_gen1.get("folders", []):
                if any(mg.lower() in f["title"].lower() for mg in missing_genres):
                    if f["title"].lower() not in s2_gen_names:
                        sec_gen["folders"].append(f)

        merged_sections.append(sec_gen)

    # ----------------------------------------------------
    # SECCIÓN 4: Anime (Dedicada de Setup 2)
    # ----------------------------------------------------
    sec_anime = col2_map.get("collection-b530d60c-community")
    if sec_anime:
        merged_sections.append(sec_anime)

    # ----------------------------------------------------
    # SECCIÓN 5: Temáticas Especiales (de Setup 1)
    # ----------------------------------------------------
    sec_themes = col1_map.get("collections.themes")
    if sec_themes:
        merged_sections.append(sec_themes)

    # ----------------------------------------------------
    # SECCIÓN 6: Estudios y Franquicias (de Setup 1)
    # ----------------------------------------------------
    sec_studios = col1_map.get("collections.studios")
    if sec_studios:
        merged_sections.append(sec_studios)

    # ----------------------------------------------------
    # SECCIÓN 7: Décadas del Cine (de Setup 1)
    # ----------------------------------------------------
    sec_decades = col1_map.get("collections.decades")
    if sec_decades:
        merged_sections.append(sec_decades)

    # ----------------------------------------------------
    # SECCIÓN 8: Complementos y Addons (de Setup 2)
    # ----------------------------------------------------
    sec_addons = col2_map.get("collection-cd89d8da")
    if sec_addons:
        merged_sections.append(sec_addons)

    # Guardar NuvioCollections unificado
    save_json(OUT_COL_PATH, merged_sections)
    print(f"Colección unificada guardada exitosamente en: {OUT_COL_PATH}")
    print(f"Total secciones: {len(merged_sections)}")
    for i, s in enumerate(merged_sections):
        print(f"  [{i+1}] {s.get('title')} -> {len(s.get('folders', []))} carpetas")

if __name__ == "__main__":
    merge()
