"""Servidor HTTP local y lanzador de desarrollo para Nuvio Setup.

Ejecuta un servidor web ligero con prevención de caché y abre automáticamente
la aplicación en el navegador predeterminado del sistema.
"""
import http.server
import socketserver
import webbrowser
import threading
import time
import os
import sys

import urllib.request
import urllib.parse
import urllib.error

# Asegurar codificación UTF-8 en terminales Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Asegurar que el servidor se ejecute desde la raíz del proyecto
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)

DEFAULT_PORT = 8080

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Manejador HTTP que deshabilita caché y provee proxy local para llamadas externas con CORS"""
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/proxy':
            query = urllib.parse.parse_qs(parsed.query)
            target_url = query.get('url', [''])[0]
            if not target_url:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error": "Falta el parametro ?url="}')
                return

            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length) if length > 0 else None
                req = urllib.request.Request(
                    target_url,
                    data=body,
                    headers={
                        'Content-Type': 'application/json',
                        'User-Agent': 'NuvioSetup-LocalProxy/1.4'
                    },
                    method='POST'
                )
                with urllib.request.urlopen(req, timeout=12) as response:
                    status = response.status
                    resp_data = response.read()
                    self.send_response(status)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(resp_data)
            except urllib.error.HTTPError as e:
                err_data = e.read()
                self.send_response(e.code)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(err_data)
            except Exception as e:
                self.send_response(502)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(f'{{"error": "{str(e)}"}}'.encode('utf-8'))
            return

        super().do_POST()

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

