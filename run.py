import http.server
import socketserver
import webbrowser
import threading
import time
import os
import sys

# Asegurar que el servidor se ejecute desde la raíz del proyecto
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)

DEFAULT_PORT = 8080

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Manejador HTTP que deshabilita caché para desarrollo fluido"""
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def open_browser(port):
    """Abre el navegador por defecto tras inicializar el servidor"""
    time.sleep(1.2)
    url = f"http://localhost:{port}"
    print(f"Abriendo navegador en: {url}")
    webbrowser.open(url)

def start_server():
    port = DEFAULT_PORT
    server = None

    # Intentar puerto por defecto o puerto alternativo si está ocupado
    for p in [DEFAULT_PORT, 8081, 8082, 3000]:
        try:
            server = socketserver.TCPServer(("", p), NoCacheHTTPRequestHandler)
            port = p
            break
        except OSError:
            continue

    if not server:
        print("❌ Error: No se pudo enlazar ningún puerto disponible (8080, 8081, 8082, 3000).")
        sys.exit(1)

    print("\n" + "=" * 60)
    print(" 🚀 NUVIO & AIOMETADATA AUTO-SETUP WIZARD (Edición Latino)")
    print(f" Servidor local corriendo en: http://localhost:{port}")
    print(" Presiona Ctrl+C en esta terminal para detener el servidor.")
    print("=" * 60 + "\n")

    threading.Thread(target=open_browser, args=(port,), daemon=True).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\nDeteniendo servidor local. ¡Hasta pronto!\n")
        server.server_close()

if __name__ == '__main__':
    start_server()

