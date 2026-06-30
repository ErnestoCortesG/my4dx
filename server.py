#!/usr/bin/env python3
"""
server.py — Backend SQLite para my4DX · ClickSeguros 2026

Ejecutar desde la carpeta 4dx-clickseguros/:
    python server.py            (puerto 8000 por defecto)
    python server.py 9000       (puerto personalizado)

Acceder en: http://localhost:8000

No requiere dependencias externas — solo stdlib de Python 3.7+.
"""

import http.server
import sqlite3
import json
import os
import sys
import time
from urllib.parse import urlparse

# ── Configuración ─────────────────────────────────────────────────────────────

PORT    = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT', 8000))
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '4dx.db')

# Timestamp de arranque — cambia cada vez que el servidor se reinicia.
# Se inyecta como ?v=TIMESTAMP en los <script> y <link> de index.html
# para que el navegador trate cada arranque como versión nueva (cache-busting).
START_TS = str(int(time.time()))

# ── Base de datos ─────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Crea la tabla si no existe. Idempotente — seguro llamar en cada arranque."""
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS app_state (
            id         INTEGER PRIMARY KEY CHECK (id = 1),
            data       TEXT    NOT NULL,
            updated_at TEXT    DEFAULT (datetime('now'))
        )
    ''')
    conn.commit()
    conn.close()
    print(f'  Base de datos: {DB_PATH}')


# ── Handler HTTP ──────────────────────────────────────────────────────────────

class Handler(http.server.SimpleHTTPRequestHandler):

    # ── Verbos ────────────────────────────────────────────────────────────────

    def do_OPTIONS(self):
        """Preflight CORS — necesario cuando el frontend corre en otro puerto."""
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/api/state':
            self._get_state()
        elif path in ('/', '/index.html'):
            self._serve_index()
        else:
            super().do_GET()   # archivos estáticos (css/, js/, etc.)

    def _serve_index(self):
        """Sirve index.html con ?v=START_TS inyectado en todos los <script> y <link>."""
        try:
            with open('index.html', 'r', encoding='utf-8') as f:
                html = f.read()
        except FileNotFoundError:
            self.send_error(404, 'index.html no encontrado')
            return

        # Reemplaza src="js/....js" y href="css/....css" con versión cachebusted
        html = html.replace('.js"',  f'.js?v={START_TS}"')
        html = html.replace(".js'",  f".js?v={START_TS}'")
        html = html.replace('.css"', f'.css?v={START_TS}"')
        html = html.replace(".css'", f".css?v={START_TS}'")

        body = html.encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type',   'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control',  'no-store')
        self._cors()
        super().end_headers()
        self.wfile.write(body)

    def do_POST(self):
        path = urlparse(self.path).path
        if path == '/api/state':
            self._post_state()
        else:
            self.send_error(404, 'Ruta no encontrada')

    # ── API /api/state ────────────────────────────────────────────────────────

    def _get_state(self):
        """Devuelve el estado completo de la app como JSON, o null si no hay datos."""
        conn = get_db()
        row  = conn.execute('SELECT data FROM app_state WHERE id = 1').fetchone()
        conn.close()
        body = row['data'].encode('utf-8') if row else b'null'
        self._json_ok(body)

    def _post_state(self):
        """Recibe el estado completo como JSON y lo guarda (upsert)."""
        length = int(self.headers.get('Content-Length', 0))
        raw    = self.rfile.read(length)
        try:
            data = json.loads(raw)
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_error(400, 'JSON inválido')
            return

        conn = get_db()
        conn.execute('''
            INSERT INTO app_state (id, data) VALUES (1, ?)
            ON CONFLICT(id) DO UPDATE SET
                data       = excluded.data,
                updated_at = datetime('now')
        ''', (json.dumps(data, ensure_ascii=False),))
        conn.commit()
        conn.close()
        self._json_ok(b'{"ok":true}')

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin',  '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _json_ok(self, body: bytes):
        self.send_response(200)
        self.send_header('Content-Type',   'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        # Formato limpio: método + ruta + código
        print(f'  {self.address_string()}  {fmt % args}')


# ── Arranque ──────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    # Siempre servir archivos desde la carpeta donde vive este script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    init_db()

    server = http.server.HTTPServer(('', PORT), Handler)
    print(f'\n  my4DX · ClickSeguros 2026')
    print(f'  http://localhost:{PORT}')
    print(f'  Ctrl+C para detener\n')

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n  Servidor detenido.')
        server.shutdown()
