#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Auditoría de Congruencia para Lanzamientos (Release Consistency Audit)
Valida que el código, la interfaz web, la documentación y el versionado estén 100% sincronizados.
"""

import os
import re
import json
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def check_file_exists(rel_path):
    full_path = os.path.join(REPO_ROOT, rel_path)
    exists = os.path.isfile(full_path)
    if not exists:
        print(f"❌ ERROR: El archivo requerido '{rel_path}' no existe.")
    else:
        print(f"✅ Archivo presente: {rel_path}")
    return exists

def audit_version_synchronization():
    print("\n🔍 1. Auditando Sincronización de Versiones...")
    
    # 1.1 version.json
    vjson_path = os.path.join(REPO_ROOT, 'version.json')
    try:
        with open(vjson_path, 'r', encoding='utf-8') as f:
            vjson = json.load(f)
            target_version = vjson.get('version')
    except Exception as e:
        print(f"❌ Error leyendo version.json: {e}")
        return False
        
    print(f"   Versión objetivo en version.json: '{target_version}'")
    
    if not re.match(r'^\d+\.\d+\.\d+$', target_version):
        print(f"❌ La versión '{target_version}' no cumple con el formato Semantic Versioning (X.Y.Z).")
        return False

    all_synced = True

    # 1.2 js/config.js
    config_path = os.path.join(REPO_ROOT, 'js', 'config.js')
    with open(config_path, 'r', encoding='utf-8') as f:
        cfg = f.read()
    m = re.search(r'VERSION:\s*["\']([^"\']+)["\']', cfg)
    if not m or m.group(1) != target_version:
        print(f"❌ js/config.js tiene versión '{m.group(1) if m else 'desconocida'}', esperaba '{target_version}'.")
        all_synced = False
    else:
        print(f"   ✅ js/config.js sincronizado con '{target_version}'")

    # 1.3 HTMLs (index.html, configuration/index.html, documentation/index.html)
    html_files = [
        'index.html',
        os.path.join('configuration', 'index.html'),
        os.path.join('documentation', 'index.html')
    ]
    for rel in html_files:
        p = os.path.join(REPO_ROOT, rel)
        with open(p, 'r', encoding='utf-8') as f:
            html = f.read()
        if f'v{target_version}' not in html:
            print(f"❌ {rel} no contiene el texto de versión 'v{target_version}'.")
            all_synced = False
        else:
            print(f"   ✅ {rel} contiene 'v{target_version}'")

    # 1.4 README.md badge
    readme_path = os.path.join(REPO_ROOT, 'README.md')
    with open(readme_path, 'r', encoding='utf-8') as f:
        readme = f.read()
    if f'Version-v{target_version}' not in readme:
        print(f"❌ README.md no tiene el badge con 'Version-v{target_version}'.")
        all_synced = False
    else:
        print(f"   ✅ README.md tiene badge con 'Version-v{target_version}'")

    # 1.5 CHANGELOG.md section
    changelog_path = os.path.join(REPO_ROOT, 'CHANGELOG.md')
    with open(changelog_path, 'r', encoding='utf-8') as f:
        changelog = f.read()
    if f'## [{target_version}]' not in changelog:
        print(f"❌ CHANGELOG.md no tiene una sección para '## [{target_version}]'.")
        all_synced = False
    else:
        print(f"   ✅ CHANGELOG.md tiene sección para '## [{target_version}]'")

    return all_synced

def audit_steps_congruence():
    print("\n🔍 2. Auditando Congruencia de Pasos (Web vs README)...")
    config_html_path = os.path.join(REPO_ROOT, 'configuration', 'index.html')
    readme_path = os.path.join(REPO_ROOT, 'README.md')

    with open(config_html_path, 'r', encoding='utf-8') as f:
        config_html = f.read()
    with open(readme_path, 'r', encoding='utf-8') as f:
        readme = f.read()

    # Detectar orden en configuration/index.html
    step_ids = re.findall(r'id="(step-[1-5])"', config_html)
    print(f"   Pasos encontrados en el asistente: {step_ids}")
    
    # En configuration/index.html:
    # step-3 contiene miniNuvioContainer / Colecciones
    # step-4 contiene API Keys
    if 'id="miniNuvioContainer"' in config_html:
        s3_pos = config_html.find('id="step-3"')
        s4_pos = config_html.find('id="step-4"')
        mini_pos = config_html.find('id="miniNuvioContainer"')
        if not (s3_pos < mini_pos < s4_pos):
            print("❌ ERROR: El contenedor de Mini Nuvio no está ubicado en el Paso 3.")
            return False
        print("   ✅ Paso 3 aloja correctamente a Mini Nuvio (Colecciones)")

    # En README.md:
    # Paso 3 debe ser Mini NUVIO / Colección
    # Paso 4 debe ser Claves API
    if 'Paso 3 - Personalización Visual en Mini NUVIO' not in readme and 'Paso 3: Personalización Visual' not in readme:
        print("❌ ERROR en README.md: El Paso 3 no está definido como Personalización Visual en Mini NUVIO.")
        return False
    if 'Paso 4 - Claves API e Integraciones' not in readme and 'Paso 4: Configuración y Validación de API Keys' not in readme:
        print("❌ ERROR en README.md: El Paso 4 no está definido como Claves API.")
        return False
        
    print("   ✅ Congruencia de pasos 100% verificada entre web y README.md")
    return True

def audit_license_and_metadata():
    print("\n🔍 3. Auditando Licencia y Metadatos...")
    lic_path = os.path.join(REPO_ROOT, 'LICENSE')
    if not os.path.isfile(lic_path):
        print("❌ ERROR: No existe archivo LICENSE.")
        return False
        
    with open(lic_path, 'r', encoding='utf-8') as f:
        lic = f.read()
    if 'MIT License' not in lic or 'Svein' not in lic:
        print("❌ ERROR: El archivo LICENSE no contiene la mención a MIT License o a Svein.")
        return False
    print("   ✅ LICENSE es MIT válida y acredita a Svein")
    return True

def main():
    print("==================================================")
    print("🚀 AUDITORÍA DE CONGRUENCIA DE LANZAMIENTO (NUVIO)")
    print("==================================================")
    
    req_files = [
        'LICENSE',
        'README.md',
        'CHANGELOG.md',
        'version.json',
        os.path.join('.github', 'workflows', 'release.yml'),
        os.path.join('js', 'config.js'),
        os.path.join('js', 'version.js'),
        'index.html',
        os.path.join('configuration', 'index.html'),
        os.path.join('documentation', 'index.html'),
    ]
    
    files_ok = all(check_file_exists(rf) for rf in req_files)
    if not files_ok:
        sys.exit(1)
        
    v_ok = audit_version_synchronization()
    s_ok = audit_steps_congruence()
    l_ok = audit_license_and_metadata()
    
    if files_ok and v_ok and s_ok and l_ok:
        print("\n🎉 ¡TODAS LAS AUDITORÍAS PASARON SATISFACTORIAMENTE!")
        print("   El repositorio es 100% congruente, profesional y apto para release.")
        sys.exit(0)
    else:
        print("\n❌ FALLARON AUDITORÍAS. Corrige los problemas indicados antes de publicar el release.")
        sys.exit(1)

if __name__ == '__main__':
    main()
