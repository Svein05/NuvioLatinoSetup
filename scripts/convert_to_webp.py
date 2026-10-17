#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Nuvio Latino Setup - Pipeline de Conversión Masiva a WebP
---------------------------------------------------------
Convierte de forma recursiva todas las imágenes JPEG (.jpg, .jpeg) de:
  - assets/profile_icons/
  - assets/logo/
hacia el formato WebP optimizado (calidad 90, preservando canal alfa),
elimina los archivos JPEG redundantes y sincroniza el catálogo
ejecutando scripts/sync_avatars.js.
"""

import os
import sys
import argparse
import subprocess
from pathlib import Path
from PIL import Image

# Forzar salida en UTF-8 en terminales de Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

ROOT_DIR = Path(__file__).resolve().parent.parent

DEFAULT_TARGET_DIRS = [
    ROOT_DIR / "assets" / "profile_icons",
    ROOT_DIR / "assets" / "logo",
]

HTML_FILES = [
    ROOT_DIR / "index.html",
    ROOT_DIR / "account" / "index.html",
    ROOT_DIR / "configuration" / "index.html",
    ROOT_DIR / "documentation" / "index.html",
]

def convert_image_to_webp(src_path: Path, quality: int = 90, delete_original: bool = True) -> tuple:
    """
    Convierte una imagen a formato WebP preservando modo de color y transparencia.
    Retorna (éxito, tamaño_original, tamaño_nuevo).
    """
    dest_path = src_path.with_suffix(".webp")
    orig_size = src_path.stat().st_size

    try:
        with Image.open(src_path) as im:
            # Preservar transparencia si existe canal alfa o paleta
            if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
                save_kwargs = {
                    "format": "WEBP",
                    "quality": quality,
                    "method": 6,
                    "lossless": False
                }
            else:
                im = im.convert("RGB")
                save_kwargs = {
                    "format": "WEBP",
                    "quality": quality,
                    "method": 6
                }

            im.save(dest_path, **save_kwargs)

        # Validación de integridad del archivo generado
        if not dest_path.exists() or dest_path.stat().st_size == 0:
            raise RuntimeError("El archivo WebP resultante está vacío o no se creó.")

        with Image.open(dest_path) as verify_im:
            verify_im.verify()

        new_size = dest_path.stat().st_size

        if delete_original and src_path != dest_path:
            src_path.unlink()

        return True, orig_size, new_size, None

    except Exception as exc:
        if dest_path.exists():
            try:
                dest_path.unlink()
            except OSError:
                pass
        return False, orig_size, 0, str(exc)


def update_html_logo_references():
    """
    Actualiza las etiquetas favicon / apple-touch-icon en los archivos HTML
    para que apunten a logo.webp en lugar de logo.jpg.
    """
    updated_count = 0
    for html_path in HTML_FILES:
        if not html_path.exists():
            continue

        content = html_path.read_text(encoding="utf-8")
        original_content = content

        # Reemplazar referencias a logo.jpg
        content = content.replace('assets/logo/logo.jpg', 'assets/logo/logo.webp')
        content = content.replace('type="image/jpeg" href="assets/logo/logo.webp"', 'type="image/webp" href="assets/logo/logo.webp"')
        content = content.replace('type="image/jpeg" href="../assets/logo/logo.webp"', 'type="image/webp" href="../assets/logo/logo.webp"')
        content = content.replace('type="image/jpeg" href="./assets/logo/logo.webp"', 'type="image/webp" href="./assets/logo/logo.webp"')

        if content != original_content:
            html_path.write_text(content, encoding="utf-8")
            updated_count += 1
            print(f"  ✓ Referencia a logo.webp actualizada en: {html_path.relative_to(ROOT_DIR)}")

    return updated_count


def run_sync_avatars():
    """
    Ejecuta scripts/sync_avatars.js para actualizar manifest.json y js/avatars-data.js.
    """
    sync_script = ROOT_DIR / "scripts" / "sync_avatars.js"
    if not sync_script.exists():
        print(f"[!] No se encontró el script sincronizador: {sync_script}")
        return False

    print("\n[+] Sincronizando catálogo con scripts/sync_avatars.js...")
    try:
        res = subprocess.run(["node", str(sync_script)], capture_output=True, text=True, check=True)
        print(res.stdout.strip())
        return True
    except subprocess.CalledProcessError as err:
        print(f"[!] Error al ejecutar sync_avatars.js:\n{err.stderr}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Convierte imágenes JPEG a WebP recursivamente.")
    parser.add_argument("--quality", type=int, default=90, help="Calidad WebP (1-100, defecto: 90)")
    parser.add_argument("--keep-originals", action="store_true", help="No eliminar las imágenes JPEG originales")
    parser.add_argument("--dry-run", action="store_true", help="Simular sin modificar archivos")
    args = parser.parse_args()

    print("============================================================")
    print(" NUVIO LATINO SETUP - CONVERSOR AUTOMÁTICO A WEBP")
    print(f" Calidad: {args.quality} | Eliminar JPEGs: {not args.keep_originals}")
    print("============================================================\n")

    target_extensions = {".jpg", ".jpeg"}
    converted_files = []
    failed_files = []
    total_orig_bytes = 0
    total_new_bytes = 0

    for target_dir in DEFAULT_TARGET_DIRS:
        if not target_dir.exists():
            print(f"[!] Directorio no encontrado: {target_dir}")
            continue

        print(f"[*] Escaneando: {target_dir.relative_to(ROOT_DIR)} ...")
        for root, _, files in os.walk(target_dir):
            for file_name in sorted(files):
                file_path = Path(root) / file_name
                if file_path.suffix.lower() in target_extensions:
                    if args.dry_run:
                        print(f"  [DRY-RUN] Convertiría: {file_path.relative_to(ROOT_DIR)}")
                        continue

                    success, orig_bytes, new_bytes, err = convert_image_to_webp(
                        file_path,
                        quality=args.quality,
                        delete_original=not args.keep_originals
                    )

                    if success:
                        total_orig_bytes += orig_bytes
                        total_new_bytes += new_bytes
                        saving = ((orig_bytes - new_bytes) / orig_bytes) * 100 if orig_bytes > 0 else 0
                        converted_files.append((file_path, orig_bytes, new_bytes, saving))
                        print(f"  ✓ {file_path.name} -> .webp ({orig_bytes/1024:.1f} KB -> {new_bytes/1024:.1f} KB, -{saving:.1f}%)")
                    else:
                        failed_files.append((file_path, err))
                        print(f"  ✗ ERROR en {file_path.name}: {err}")

    if args.dry_run:
        print("\n[DRY-RUN] Simulación concluida.")
        return

    # Actualizar referencias en HTML a logo.webp si se convirtió logo.jpg
    update_html_logo_references()

    # Re-sincronizar avatares
    run_sync_avatars()

    # Resumen final
    print("\n============================================================")
    print(" RESUMEN DE CONVERSIÓN A WEBP")
    print("============================================================")
    print(f" Total imágenes convertidas : {len(converted_files)}")
    print(f" Fallos                     : {len(failed_files)}")
    
    if total_orig_bytes > 0:
        total_saving_bytes = total_orig_bytes - total_new_bytes
        total_saving_pct = (total_saving_bytes / total_orig_bytes) * 100
        print(f" Peso original total        : {total_orig_bytes / (1024 * 1024):.2f} MB ({total_orig_bytes:,} bytes)")
        print(f" Peso WebP total            : {total_new_bytes / (1024 * 1024):.2f} MB ({total_new_bytes:,} bytes)")
        print(f" Espacio ahorrado           : {total_saving_bytes / (1024 * 1024):.2f} MB (-{total_saving_pct:.1f}%)")
    print("============================================================\n")


if __name__ == "__main__":
    main()
