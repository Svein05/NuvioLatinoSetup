#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Asistente de Lanzamiento de Versiones (Release Assistant)
Automatiza el incremento de versión, sincronización de archivos, etiquetado en Git y auditoría previa.
"""

import os
import sys
import re
import json
import subprocess

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def run_cmd(cmd):
    result = subprocess.run(cmd, shell=True, cwd=REPO_ROOT, capture_output=True, text=True, encoding='utf-8')
    if result.returncode != 0:
        print(f"❌ Error ejecutando: {cmd}\n{result.stderr}")
        sys.exit(1)
    return result.stdout.strip()

def bump_version_string(current, bump_type):
    parts = list(map(int, current.split('.')))
    if bump_type == 'patch':
        parts[2] += 1
    elif bump_type == 'minor':
        parts[1] += 1
        parts[2] = 0
    elif bump_type == 'major':
        parts[0] += 1
        parts[1] = 0
        parts[2] = 0
    else:
        # Versión explícita
        if not re.match(r'^\d+\.\d+\.\d+$', bump_type):
            print(f"❌ Versión inválida: '{bump_type}'. Usa formato X.Y.Z o (patch|minor|major).")
            sys.exit(1)
        return bump_type
    return f"{parts[0]}.{parts[1]}.{parts[2]}"

def update_file(path, old_pattern, replacement):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    new_content = re.sub(old_pattern, replacement, content)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)

def main():
    if len(sys.argv) < 2:
        print("Uso: python scripts/release.py <X.Y.Z | patch | minor | major>")
        sys.exit(1)

    arg = sys.argv[1].lower().lstrip('v')

    # 1. Leer versión actual
    vjson_path = os.path.join(REPO_ROOT, 'version.json')
    with open(vjson_path, 'r', encoding='utf-8') as f:
        vdata = json.load(f)
    current_ver = vdata.get('version', '1.0.0')

    new_ver = bump_version_string(current_ver, arg)
    print(f"📦 Preparando Release: v{current_ver} ➔ v{new_ver}")

    # 2. Verificar estado de git
    status = run_cmd("git status --porcelain")
    if status and not any('scripts' in line for line in status.splitlines()):
        print("⚠️ Advertencia: Hay cambios locales sin commitear en git.")
        ans = input("¿Deseas continuar y commitear la versión de todos modos? (s/N): ").strip().lower()
        if ans != 's':
            print("Operación cancelada.")
            sys.exit(0)

    # 3. Actualizar version.json
    vdata['version'] = new_ver
    with open(vjson_path, 'w', encoding='utf-8') as f:
        json.dump(vdata, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print("✅ version.json actualizado")

    # 4. Actualizar js/config.js
    cfg_path = os.path.join(REPO_ROOT, 'js', 'config.js')
    update_file(cfg_path, r'VERSION:\s*["\'][^"\']+["\']', f'VERSION: "{new_ver}"')
    print("✅ js/config.js actualizado")

    # 5. Actualizar HTMLs
    html_files = [
        os.path.join(REPO_ROOT, 'index.html'),
        os.path.join(REPO_ROOT, 'configuration', 'index.html'),
        os.path.join(REPO_ROOT, 'documentation', 'index.html')
    ]
    for hf in html_files:
        update_file(hf, r'(class="app-version-badge[^"]*">)v[^<]+(<)', rf'\g<1>v{new_ver}\2')
    print("✅ index.html, configuration/ y documentation/ actualizados")

    # 6. Actualizar README.md
    readme_path = os.path.join(REPO_ROOT, 'README.md')
    update_file(readme_path, r'Version-v\d+\.\d+\.\d+', f'Version-v{new_ver}')
    print("✅ README.md actualizado")

    # 7. Ejecutar auditoría de congruencia
    audit_script = os.path.join(REPO_ROOT, 'scripts', 'audit_release.py')
    res = subprocess.run([sys.executable, audit_script])
    if res.returncode != 0:
        print("\n❌ La auditoría de congruencia falló. Corrige los archivos y reintenta.")
        sys.exit(1)

    print("\n🎉 Preparación completada con éxito.")
    print(f"Para sellar el lanzamiento, ejecuta:")
    print(f"  git add .")
    print(f"  git commit -m \"chore(release): v{new_ver}\"")
    print(f"  git tag -a v{new_ver} -m \"Release v{new_ver}\"")
    print(f"  git push origin main --tags")

if __name__ == '__main__':
    main()
