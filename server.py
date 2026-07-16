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
import hashlib
import hmac
import secrets
from urllib.parse import urlparse

# ── Configuración ─────────────────────────────────────────────────────────────

PORT    = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT', 8000))
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '4dx.db')

# Timestamp de arranque — cambia cada vez que el servidor se reinicia.
# Se inyecta como ?v=TIMESTAMP en los <script> y <link> de index.html
# para que el navegador trate cada arranque como versión nueva (cache-busting).
START_TS = str(int(time.time()))

# Sesiones activas en memoria: token → {username, rol, id, exp}.
# Se limpian al reiniciar el servidor (los usuarios deben volver a entrar).
SESSIONS      = {}
SESSION_TTL   = 12 * 3600   # 12 horas
PBKDF2_ROUNDS = 100_000

# Usuarios semilla — se insertan (con contraseña hasheada) solo si la tabla
# está vacía. Cambia estas contraseñas en producción vía el panel de Admin.
SEED_USERS = [
    ('u1', 'admin',      'admin123',  'Administrador',   'admin',        None,     'Dirección',   '#E62800'),
    ('u2', 'integrante', 'click2026', 'Sandra Martínez', 'integrante',   'sandra', 'Promotorías', '#e65100'),
    ('u3', 'view',       'view2026',  'Visualizador',    'visualizador', None,     'Consulta',    '#666'),
]

# ── Hash de contraseñas (PBKDF2-HMAC-SHA256, stdlib) ───────────────────────────

def hash_pwd(pwd, salt=None):
    """Devuelve 'salt_hex:hash_hex'. Genera salt aleatorio si no se pasa."""
    salt = salt or secrets.token_bytes(16)
    dk   = hashlib.pbkdf2_hmac('sha256', pwd.encode('utf-8'), salt, PBKDF2_ROUNDS)
    return f'{salt.hex()}:{dk.hex()}'


def verify_pwd(pwd, stored):
    """Compara en tiempo constante la contraseña contra 'salt_hex:hash_hex'."""
    try:
        salt_hex, _ = stored.split(':')
        return hmac.compare_digest(hash_pwd(pwd, bytes.fromhex(salt_hex)), stored)
    except (ValueError, AttributeError):
        return False


# ── Base de datos ─────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Crea las tablas si no existen y siembra usuarios. Idempotente."""
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS app_state (
            id         INTEGER PRIMARY KEY CHECK (id = 1),
            data       TEXT    NOT NULL,
            updated_at TEXT    DEFAULT (datetime('now'))
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id       TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            pwd_hash TEXT NOT NULL,
            nombre   TEXT,
            rol      TEXT,
            mid      TEXT,
            cargo    TEXT,
            color    TEXT
        )
    ''')
    # Documentos de estado normalizados: 'config' + 'week:N', cada uno con versión.
    # Reemplaza el blob único de app_state y evita el last-write-wins entre secciones.
    conn.execute('''
        CREATE TABLE IF NOT EXISTS state_docs (
            key        TEXT PRIMARY KEY,
            data       TEXT    NOT NULL,
            version    INTEGER NOT NULL DEFAULT 1,
            updated_at TEXT    DEFAULT (datetime('now'))
        )
    ''')
    # Sembrar usuarios solo si la tabla está vacía
    n = conn.execute('SELECT COUNT(*) AS c FROM users').fetchone()['c']
    if n == 0:
        for uid, usr, pwd, nom, rol, mid, cargo, color in SEED_USERS:
            conn.execute(
                'INSERT INTO users (id, username, pwd_hash, nombre, rol, mid, cargo, color) '
                'VALUES (?,?,?,?,?,?,?,?)',
                (uid, usr, hash_pwd(pwd), nom, rol, mid, cargo, color))
        print(f'  Usuarios semilla creados: {len(SEED_USERS)}')
    conn.commit()
    _migrar_blob_a_docs(conn)
    conn.close()
    print(f'  Base de datos: {DB_PATH}')


def _migrar_blob_a_docs(conn):
    """Migra el blob único app_state (versiones previas) a state_docs por sección.
    Se ejecuta una sola vez: si ya hay documentos, no hace nada."""
    have = conn.execute('SELECT COUNT(*) AS c FROM state_docs').fetchone()['c']
    if have:
        return
    row = conn.execute('SELECT data FROM app_state WHERE id = 1').fetchone()
    if not row:
        return
    try:
        blob = json.loads(row['data'])
    except (json.JSONDecodeError, TypeError):
        return
    # Documento config: definiciones globales
    config = {
        'wigs':       blob.get('wigs', []),
        'miembros':   blob.get('miembros', []),
        'mciTitulos': blob.get('mciTitulos', {}),
        '_semCal':    blob.get('_semCal', False),
    }
    conn.execute('INSERT INTO state_docs (key, data, version) VALUES (?,?,1)',
                 ('config', json.dumps(config, ensure_ascii=False)))
    # Un documento por semana
    for n, wk in (blob.get('semanas') or {}).items():
        conn.execute('INSERT INTO state_docs (key, data, version) VALUES (?,?,1)',
                     (f'week:{n}', json.dumps(wk, ensure_ascii=False)))
    conn.commit()
    print('  Blob app_state migrado a state_docs por sección')


# ── Sesiones ───────────────────────────────────────────────────────────────────

def new_session(row):
    """Crea un token para el usuario (row de la tabla users) y lo registra."""
    token = secrets.token_urlsafe(32)
    SESSIONS[token] = {
        'username': row['username'], 'rol': row['rol'],
        'id': row['id'], 'exp': time.time() + SESSION_TTL,
    }
    return token


def session_for(token):
    """Devuelve la sesión válida del token, o None si no existe o expiró."""
    s = SESSIONS.get(token)
    if not s:
        return None
    if s['exp'] < time.time():
        SESSIONS.pop(token, None)
        return None
    return s


def user_public(row):
    """Perfil sin datos sensibles (nunca incluye el hash de contraseña)."""
    return {
        'id': row['id'], 'username': row['username'], 'nombre': row['nombre'],
        'rol': row['rol'], 'mid': row['mid'], 'cargo': row['cargo'], 'color': row['color'],
    }


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
        elif path == '/api/session':
            self._get_session()
        elif path == '/api/users':
            self._get_users()
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
        elif path == '/api/doc':
            self._post_doc()
        elif path == '/api/login':
            self._post_login()
        elif path == '/api/logout':
            self._post_logout()
        elif path == '/api/users':
            self._post_user()
        elif path == '/api/users/delete':
            self._delete_user()
        else:
            self.send_error(404, 'Ruta no encontrada')

    # ── Auth: helpers de request ────────────────────────────────────────────────

    def _auth(self):
        """Devuelve la sesión válida del header Authorization, o None."""
        hdr = self.headers.get('Authorization', '')
        token = hdr[7:] if hdr.startswith('Bearer ') else ''
        return session_for(token)

    def _body_json(self):
        """Lee y parsea el cuerpo JSON; devuelve None si es inválido."""
        length = int(self.headers.get('Content-Length', 0))
        try:
            return json.loads(self.rfile.read(length))
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError):
            return None

    # ── Auth: endpoints ─────────────────────────────────────────────────────────

    def _post_login(self):
        data = self._body_json() or {}
        usr, pwd = data.get('username', ''), data.get('password', '')
        conn = get_db()
        row  = conn.execute('SELECT * FROM users WHERE username = ?', (usr,)).fetchone()
        conn.close()
        if not row or not verify_pwd(pwd, row['pwd_hash']):
            self._json(401, b'{"error":"Usuario o contrasena incorrectos"}')
            return
        token = new_session(row)
        self._json_ok(json.dumps({'token': token, 'user': user_public(row)},
                                 ensure_ascii=False).encode('utf-8'))

    def _post_logout(self):
        hdr = self.headers.get('Authorization', '')
        token = hdr[7:] if hdr.startswith('Bearer ') else ''
        SESSIONS.pop(token, None)
        self._json_ok(b'{"ok":true}')

    def _get_session(self):
        s = self._auth()
        if not s:
            self._json(401, b'{"error":"Sesion invalida"}')
            return
        conn = get_db()
        row  = conn.execute('SELECT * FROM users WHERE id = ?', (s['id'],)).fetchone()
        conn.close()
        if not row:
            self._json(401, b'{"error":"Usuario no encontrado"}')
            return
        self._json_ok(json.dumps({'user': user_public(row)},
                                 ensure_ascii=False).encode('utf-8'))

    def _get_users(self):
        """Lista de usuarios sin contraseñas — solo admin."""
        s = self._auth()
        if not s or s['rol'] != 'admin':
            self._json(403, b'{"error":"Requiere admin"}')
            return
        conn = get_db()
        rows = conn.execute('SELECT * FROM users ORDER BY rowid').fetchall()
        conn.close()
        body = json.dumps([user_public(r) for r in rows], ensure_ascii=False).encode('utf-8')
        self._json_ok(body)

    def _post_user(self):
        """Crea o actualiza un usuario — solo admin. Password opcional al editar."""
        s = self._auth()
        if not s or s['rol'] != 'admin':
            self._json(403, b'{"error":"Requiere admin"}')
            return
        d = self._body_json()
        if not d or not d.get('username') or not d.get('nombre'):
            self._json(400, b'{"error":"Datos incompletos"}')
            return
        conn = get_db()
        existing = conn.execute('SELECT * FROM users WHERE id = ?', (d.get('id'),)).fetchone() if d.get('id') else None
        if existing:
            # Solo re-hashea si viene contraseña nueva
            pwd_hash = hash_pwd(d['password']) if d.get('password') else existing['pwd_hash']
            conn.execute(
                'UPDATE users SET username=?, pwd_hash=?, nombre=?, rol=?, mid=?, cargo=?, color=? WHERE id=?',
                (d['username'], pwd_hash, d['nombre'], d.get('rol'), d.get('mid'),
                 d.get('cargo'), d.get('color'), existing['id']))
            uid = existing['id']
        else:
            if not d.get('password'):
                conn.close()
                self._json(400, b'{"error":"Contrasena requerida para nuevo usuario"}')
                return
            uid = d.get('id') or secrets.token_hex(4)
            conn.execute(
                'INSERT INTO users (id, username, pwd_hash, nombre, rol, mid, cargo, color) '
                'VALUES (?,?,?,?,?,?,?,?)',
                (uid, d['username'], hash_pwd(d['password']), d['nombre'],
                 d.get('rol'), d.get('mid'), d.get('cargo'), d.get('color')))
        conn.commit()
        row = conn.execute('SELECT * FROM users WHERE id = ?', (uid,)).fetchone()
        conn.close()
        self._json_ok(json.dumps({'user': user_public(row)}, ensure_ascii=False).encode('utf-8'))

    def _delete_user(self):
        s = self._auth()
        if not s or s['rol'] != 'admin':
            self._json(403, b'{"error":"Requiere admin"}')
            return
        d = self._body_json() or {}
        uid = d.get('id')
        if uid == 'u1':
            self._json(400, b'{"error":"No se puede eliminar el admin principal"}')
            return
        conn = get_db()
        conn.execute('DELETE FROM users WHERE id = ?', (uid,))
        conn.commit()
        conn.close()
        self._json_ok(b'{"ok":true}')

    # ── API de estado (documentos normalizados) ────────────────────────────────

    def _get_state(self):
        """Ensambla el estado completo a partir de los documentos state_docs.
        Devuelve la misma forma que espera el cliente (wigs, miembros, mciTitulos,
        semanas) más `_versions` (versión por documento, para escritura optimista)."""
        conn = get_db()
        rows = conn.execute('SELECT key, data, version FROM state_docs').fetchall()
        conn.close()
        config, semanas, versions = {}, {}, {}
        for r in rows:
            versions[r['key']] = r['version']
            try:
                data = json.loads(r['data'])
            except (json.JSONDecodeError, TypeError):
                continue
            if r['key'] == 'config':
                config = data
            elif r['key'].startswith('week:'):
                semanas[r['key'].split(':', 1)[1]] = data
        if not config and not semanas:
            self._json_ok(b'null')
            return
        state = {
            'wigs':       config.get('wigs', []),
            'miembros':   config.get('miembros', []),
            'mciTitulos': config.get('mciTitulos', {}),
            '_semCal':    config.get('_semCal', False),
            'semanas':    semanas,
            '_versions':  versions,
        }
        self._json_ok(json.dumps(state, ensure_ascii=False).encode('utf-8'))

    def _post_state(self):
        """Compatibilidad: guardar el estado completo se desglosa en documentos.
        Requiere token de editor. Cada sección se versiona por separado."""
        s = self._auth()
        if not s or s['rol'] not in ('admin', 'integrante'):
            self._json(401, b'{"error":"No autorizado para escribir"}')
            return
        data = self._body_json()
        if data is None:
            self._json(400, b'{"error":"JSON invalido"}')
            return
        conn = get_db()
        config = {
            'wigs':       data.get('wigs', []),
            'miembros':   data.get('miembros', []),
            'mciTitulos': data.get('mciTitulos', {}),
            '_semCal':    data.get('_semCal', False),
        }
        self._upsert_doc(conn, 'config', config)
        for n, wk in (data.get('semanas') or {}).items():
            self._upsert_doc(conn, f'week:{n}', wk)
        conn.commit()
        conn.close()
        self._json_ok(b'{"ok":true}')

    def _upsert_doc(self, conn, key, data, expected=None):
        """Inserta/actualiza un documento e incrementa su versión.
        Si `expected` no es None y no coincide con la versión actual → devuelve
        None (conflicto). En éxito devuelve la nueva versión."""
        row = conn.execute('SELECT version FROM state_docs WHERE key = ?', (key,)).fetchone()
        cur = row['version'] if row else 0
        if expected is not None and cur != expected:
            return None
        new_v = cur + 1
        conn.execute('''
            INSERT INTO state_docs (key, data, version) VALUES (?,?,?)
            ON CONFLICT(key) DO UPDATE SET
                data = excluded.data, version = excluded.version,
                updated_at = datetime('now')
        ''', (key, json.dumps(data, ensure_ascii=False), new_v))
        return new_v

    def _post_doc(self):
        """Guarda UN documento (config o week:N) con control optimista de versión.
        Body: {key, data, version}. Si la versión está desactualizada → 409 con
        la versión actual, para que el cliente recargue y reintente."""
        s = self._auth()
        if not s or s['rol'] not in ('admin', 'integrante'):
            self._json(401, b'{"error":"No autorizado para escribir"}')
            return
        d = self._body_json()
        if not d or 'key' not in d or 'data' not in d:
            self._json(400, b'{"error":"Faltan key/data"}')
            return
        key = d['key']
        if key != 'config' and not key.startswith('week:'):
            self._json(400, b'{"error":"key invalida"}')
            return
        conn = get_db()
        expected = d.get('version')
        new_v = self._upsert_doc(conn, key, d['data'], expected=expected)
        if new_v is None:
            cur = conn.execute('SELECT version FROM state_docs WHERE key = ?', (key,)).fetchone()
            conn.close()
            body = json.dumps({'error': 'conflicto', 'current': cur['version'] if cur else 0},
                              ensure_ascii=False).encode('utf-8')
            self._json(409, body)
            return
        conn.commit()
        conn.close()
        self._json_ok(json.dumps({'ok': True, 'version': new_v}).encode('utf-8'))

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin',  '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def _json(self, status: int, body: bytes):
        self.send_response(status)
        self.send_header('Content-Type',   'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def _json_ok(self, body: bytes):
        self._json(200, body)

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
