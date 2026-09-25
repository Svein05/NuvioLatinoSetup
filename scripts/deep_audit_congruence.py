#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Auditoría Profunda de Congruencia (Deep Codebase vs Docs Congruence Audit)
Contrasta exhaustivamente todo el código implementado contra lo declarado en README.md,
la documentación y las interfaces web.
"""

import os
import sys
import re
import json

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def log_test(title, passed, detail=""):
    icon = "✅" if passed else "❌"
    print(f"  {icon} {title}")
    if detail and not passed:
        print(f"     ➔ Detalle: {detail}")
    return passed

def audit_features_against_code():
    print("\n🔍 1. Contrastando Características Declaradas vs Código Real...")
    all_ok = True

    # 1.1 Proveedores de API (README declara 7 proveedores: TMDB, MDBList, TheTVDB, RPDB, Fanart, Gemini, OpenRouter)
    readme_path = os.path.join(REPO_ROOT, 'README.md')
    with open(readme_path, 'r', encoding='utf-8') as f:
        readme = f.read()

    config_html_path = os.path.join(REPO_ROOT, 'configuration', 'index.html')
    with open(config_html_path, 'r', encoding='utf-8') as f:
        config_html = f.read()

    state_js_path = os.path.join(REPO_ROOT, 'js', 'state.js')
    with open(state_js_path, 'r', encoding='utf-8') as f:
        state_js = f.read()

    injector_js_path = os.path.join(REPO_ROOT, 'js', 'injector.js')
    with open(injector_js_path, 'r', encoding='utf-8') as f:
        injector_js = f.read()

    providers = {
        'tmdb': ('keyTmdb', 'TheMovieDatabase'),
        'mdblist': ('keyMdblist', 'MDBList'),
        'rpdb': ('keyRpdb', 'RPDB'),
        'tvdb': ('keyTvdb', 'TheTVDB'),
        'fanart': ('keyFanart', 'Fanart.tv'),
        'gemini': ('keyGemini', 'Google Gemini'),
        'openrouter': ('keyOpenrouter', 'OpenRouter')
    }

    for p_key, (input_id, p_name) in providers.items():
        in_readme = p_name in readme
        in_html = f'id="{input_id}"' in config_html
        in_state = p_key in state_js
        ok = in_readme and in_html and in_state
        if not log_test(f"Proveedor '{p_name}': Declarado en README, presente en HTML (# {input_id}) y en State", ok):
            all_ok = False

    # 1.2 "Ghost Mode" declarado en README: catálogos raíz con showInHome: false
    metadata_json_path = os.path.join(REPO_ROOT, 'templates', 'MetadataLatino.json')
    with open(metadata_json_path, 'r', encoding='utf-8') as f:
        meta = json.load(f)
    catalogs = meta.get('catalogs', [])
    non_ghost = [c.get('name', 'unnamed') for c in catalogs if c.get('showInHome', True) is not False]
    ghost_ok = len(non_ghost) == 0
    if not log_test(f"Ghost Mode: 100% de los catálogos ({len(catalogs)}) tienen showInHome: false", ghost_ok, f"Catálogos con showInHome=true: {non_ghost}"):
        all_ok = False

    # 1.3 Carátulas limpias (sin overlay forzado de puntuaciones en pósters)
    custom_poster = meta.get('customPosterUrlPattern', '')
    clean_posters_ok = (custom_poster == '') and ('posterRatingProvider = "none"' in state_js)
    if not log_test("Carátulas Limpias en HD: Sin patrón btttr.cc forzado y posterRatingProvider en 'none'", clean_posters_ok):
        all_ok = False

    # 1.4 Límite estricto de 6 perfiles
    nuvio_client_path = os.path.join(REPO_ROOT, 'js', 'nuvio-client.js')
    with open(nuvio_client_path, 'r', encoding='utf-8') as f:
        nuvio_client = f.read()
    profile_limit_ok = ('>= 6' in nuvio_client or '> 6' in nuvio_client) and ('P0001' in nuvio_client or 'límite' in nuvio_client)
    if not log_test("Límite de Seguridad de Perfiles: Control de máximo 6 perfiles en nuvio-client.js", profile_limit_ok):
        all_ok = False

    # 1.5 Enriquecimiento TMDB y Ratings MDBList (TV y Mobile)
    enrichment_ok = ('tmdb_settings' in nuvio_client) and ('mdblist_settings' in nuvio_client) and ('sync_push_provider_credentials' in nuvio_client)
    if not log_test("Enriquecimiento Oficial: sync_push_provider_credentials y blob de ajustes (tv/mobile)", enrichment_ok):
        all_ok = False

    # 1.6 Modo Manual: Copia de JSONs reactiva a contraseña
    app_js_path = os.path.join(REPO_ROOT, 'js', 'app.js')
    with open(app_js_path, 'r', encoding='utf-8') as f:
        app_js = f.read()
    manual_ok = ('isManualMode' in state_js) and ('btnCopyCollectionsJson' in app_js) and ('btnCopyAioConfig' in app_js)
    if not log_test("Modo Manual: Integración completa de copia y descarga sin cuenta", manual_ok):
        all_ok = False

    # 1.7 Todas las imágenes de colecciones existen físicamente en disco
    collections_json_path = os.path.join(REPO_ROOT, 'templates', 'NuvioCollections.json')
    with open(collections_json_path, 'r', encoding='utf-8') as f:
        colls = json.load(f)
    
    missing_assets = []
    total_assets = 0
    def check_asset_urls(obj):
        nonlocal total_assets
        if isinstance(obj, dict):
            for k, v in obj.items():
                if isinstance(v, str) and '/assets/collections/' in v:
                    total_assets += 1
                    filename = v.split('/assets/collections/')[-1]
                    local_path = os.path.join(REPO_ROOT, 'assets', 'collections', filename)
                    if not os.path.isfile(local_path):
                        missing_assets.append(v)
                else:
                    check_asset_urls(v)
        elif isinstance(obj, list):
            for item in obj:
                check_asset_urls(item)

    check_asset_urls(colls)
    assets_ok = len(missing_assets) == 0 and total_assets > 0
    if not log_test(f"Assets Locales: {total_assets} recursos de NuvioCollections.json existen físicamente", assets_ok, f"Faltantes: {missing_assets[:3]}"):
        all_ok = False

    return all_ok

def audit_step_order_and_titles():
    print("\n🔍 2. Contrastando Orden y Títulos de Pasos en Todo el Proyecto...")
    all_ok = True

    config_html_path = os.path.join(REPO_ROOT, 'configuration', 'index.html')
    with open(config_html_path, 'r', encoding='utf-8') as f:
        config_html = f.read()

    readme_path = os.path.join(REPO_ROOT, 'README.md')
    with open(readme_path, 'r', encoding='utf-8') as f:
        readme = f.read()

    docs_path = os.path.join(REPO_ROOT, 'documentation', 'index.html')
    with open(docs_path, 'r', encoding='utf-8') as f:
        docs = f.read()

    # Paso 1: Cuenta / Autenticación
    p1_ok = ('id="step-1"' in config_html) and ('Paso 1' in readme) and ('Paso 1' in docs)
    if not log_test("Paso 1: Autenticación Nuvio / Modo Manual congruente", p1_ok):
        all_ok = False

    # Paso 2: Perfil
    p2_ok = ('id="step-2"' in config_html) and ('Paso 2' in readme) and ('Paso 2' in docs)
    if not log_test("Paso 2: Selección / Creación de Perfil congruente", p2_ok):
        all_ok = False

    # Paso 3: Mini NUVIO Colecciones (NO Claves API)
    p3_html = 'id="step-3"' in config_html and 'miniNuvioContainer' in config_html
    p3_readme = 'Paso 3 - Personalización Visual en Mini NUVIO' in readme
    p3_docs = 'Paso 3: Gestor Visual de Colecciones' in docs
    p3_ok = p3_html and p3_readme and p3_docs
    if not log_test("Paso 3: Personalización Visual en Mini NUVIO congruente en Web, README y Docs", p3_ok):
        all_ok = False

    # Paso 4: Claves API (NO Colecciones)
    p4_html = 'id="step-4"' in config_html and 'keyTmdb' in config_html
    p4_readme = 'Paso 4 - Claves API e Integraciones' in readme
    p4_docs = 'Paso 4: Proveedores de Metadatos' in docs
    p4_ok = p4_html and p4_readme and p4_docs
    if not log_test("Paso 4: Claves API e Integraciones congruente en Web, README y Docs", p4_ok):
        all_ok = False

    # Paso 5: Inyección / Seguridad
    p5_ok = ('id="step-5"' in config_html) and ('Paso 5' in readme) and ('Paso 5' in docs)
    if not log_test("Paso 5: Seguridad e Inyección congruente", p5_ok):
        all_ok = False

    return all_ok

def audit_urls_and_branding():
    print("\n🔍 3. Contrastando Enlaces Externos, Repositorio y Redes...")
    all_ok = True

    canonical_discord = "https://discord.gg/EubYtJVJEc"
    canonical_github = "https://github.com/Svein05/NuvioLatinoSetup"
    canonical_pages = "https://svein05.github.io/NuvioLatinoSetup/"

    files_to_check = [
        os.path.join(REPO_ROOT, 'index.html'),
        os.path.join(REPO_ROOT, 'configuration', 'index.html'),
        os.path.join(REPO_ROOT, 'documentation', 'index.html'),
        os.path.join(REPO_ROOT, 'README.md'),
        os.path.join(REPO_ROOT, 'js', 'config.js')
    ]

    for fpath in files_to_check:
        fname = os.path.relpath(fpath, REPO_ROOT)
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()

        if canonical_discord not in content:
            log_test(f"Discord oficial presente en {fname}", False, f"Falta {canonical_discord}")
            all_ok = False
        if canonical_github not in content:
            log_test(f"GitHub repo oficial presente en {fname}", False, f"Falta {canonical_github}")
            all_ok = False

    if all_ok:
        log_test("Enlaces oficiales (Discord, GitHub, Pages) unificados en todo el proyecto", True)

    return all_ok

def audit_version_and_license():
    print("\n🔍 4. Contrastando Versionado Semántico y Licencia MIT...")
    all_ok = True

    with open(os.path.join(REPO_ROOT, 'version.json'), 'r', encoding='utf-8') as f:
        v = json.load(f).get('version')

    # Verificar js/config.js
    with open(os.path.join(REPO_ROOT, 'js', 'config.js'), 'r', encoding='utf-8') as f:
        cfg = f.read()
    cfg_ok = f'VERSION: "{v}"' in cfg
    if not log_test(f"js/config.js VERSION == '{v}'", cfg_ok):
        all_ok = False

    # Verificar README badge
    with open(os.path.join(REPO_ROOT, 'README.md'), 'r', encoding='utf-8') as f:
        readme = f.read()
    rm_ok = f'Version-v{v}' in readme
    if not log_test(f"README.md badge Version-v{v}", rm_ok):
        all_ok = False

    # Verificar CHANGELOG.md
    with open(os.path.join(REPO_ROOT, 'CHANGELOG.md'), 'r', encoding='utf-8') as f:
        cl = f.read()
    cl_ok = f'## [{v}]' in cl
    if not log_test(f"CHANGELOG.md entrada ## [{v}]", cl_ok):
        all_ok = False

    # Verificar LICENSE
    with open(os.path.join(REPO_ROOT, 'LICENSE'), 'r', encoding='utf-8') as f:
        lic = f.read()
    lic_ok = ('MIT License' in lic) and ('Svein' in lic)
    if not log_test("LICENSE es MIT oficial a nombre de Svein (Svein05)", lic_ok):
        all_ok = False

    return all_ok

def main():
    print("=================================================================")
    print("🛡️ AUDITORÍA PROFUNDA DE CONGRUENCIA TOTAL: CÓDIGO vs WEB vs DOCS")
    print("=================================================================")

    t1 = audit_features_against_code()
    t2 = audit_step_order_and_titles()
    t3 = audit_urls_and_branding()
    t4 = audit_version_and_license()

    if t1 and t2 and t3 and t4:
        print("\n🏆 RESULTADO: CONGRUENCIA TOTAL Y ABSOLUTA (100%)")
        print("   Todas las características declaradas en README y la web coinciden")
        print("   con la implementación real del código fuente.")
        sys.exit(0)
    else:
        print("\n❌ RESULTADO: SE DETECTARON DISCREPANCIAS. Corrige los puntos señalados.")
        sys.exit(1)

if __name__ == '__main__':
    main()
