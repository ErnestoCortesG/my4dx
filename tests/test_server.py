"""
Pruebas del backend (server.py) — stdlib unittest, sin dependencias externas.

Ejecutar desde la carpeta del proyecto:
    python -m unittest discover -s tests
    python tests/test_server.py           (equivalente)

Cubre: hash/verificación de contraseñas, sesiones, autenticación, control
optimista de versión en /api/doc, permisos de /api/users y migración blob→docs.
Usa una base de datos temporal y levanta el servidor en un hilo efímero.
"""

import unittest
import os
import sys
import json
import time
import sqlite3
import tempfile
import threading
import http.client
import io
from contextlib import redirect_stdout
from http.server import HTTPServer

# Importar server.py (vive en la carpeta padre de tests/)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import server  # noqa: E402


# ── Pruebas unitarias puras (no requieren servidor) ─────────────────────────

class TestPasswordHashing(unittest.TestCase):
    def test_hash_incluye_salt_y_es_verificable(self):
        h = server.hash_pwd('secreto123')
        self.assertIn(':', h)                       # formato salt:hash
        self.assertTrue(server.verify_pwd('secreto123', h))

    def test_password_incorrecta_falla(self):
        h = server.hash_pwd('secreto123')
        self.assertFalse(server.verify_pwd('otra', h))

    def test_mismo_password_distinto_salt_distinto_hash(self):
        self.assertNotEqual(server.hash_pwd('x'), server.hash_pwd('x'))

    def test_verify_tolera_hash_malformado(self):
        self.assertFalse(server.verify_pwd('x', 'basura-sin-dos-puntos'))
        self.assertFalse(server.verify_pwd('x', None))


class TestSesiones(unittest.TestCase):
    """Sesiones persistentes en BD. Usa una BD temporal por clase."""
    @classmethod
    def setUpClass(cls):
        cls.tmpdir = tempfile.mkdtemp()
        server.DB_PATH = os.path.join(cls.tmpdir, 'sess.db')
        with redirect_stdout(io.StringIO()):
            server.init_db()

    def test_new_session_y_lookup(self):
        row = {'username': 'a', 'rol': 'admin', 'id': 'u1'}
        tk = server.new_session(row)
        s = server.session_for(tk)
        self.assertEqual(s['rol'], 'admin')
        self.assertEqual(s['id'], 'u1')

    def test_sesion_expirada_se_invalida(self):
        row = {'username': 'a', 'rol': 'admin', 'id': 'u1'}
        tk = server.new_session(row)
        # forzar expiración directamente en la tabla
        conn = server.get_db()
        conn.execute('UPDATE sessions SET exp = ? WHERE token = ?', (time.time() - 1, tk))
        conn.commit()
        conn.close()
        self.assertIsNone(server.session_for(tk))
        # se limpió de la tabla
        conn = server.get_db()
        n = conn.execute('SELECT COUNT(*) AS c FROM sessions WHERE token = ?', (tk,)).fetchone()['c']
        conn.close()
        self.assertEqual(n, 0)

    def test_end_session_elimina(self):
        tk = server.new_session({'username': 'a', 'rol': 'admin', 'id': 'u1'})
        self.assertIsNotNone(server.session_for(tk))
        server.end_session(tk)
        self.assertIsNone(server.session_for(tk))

    def test_token_desconocido(self):
        self.assertIsNone(server.session_for('no-existe'))
        self.assertIsNone(server.session_for(''))

    def test_user_public_nunca_expone_password(self):
        row = {'id': 'u1', 'username': 'admin', 'nombre': 'A', 'rol': 'admin',
               'mid': None, 'cargo': 'X', 'color': '#000', 'pwd_hash': 'SECRETO'}
        pub = server.user_public(row)
        self.assertNotIn('pwd_hash', pub)
        self.assertNotIn('password', pub)
        self.assertEqual(pub['username'], 'admin')


class TestMigracionBlob(unittest.TestCase):
    def test_blob_se_divide_en_config_y_semanas(self):
        # BD temporal con un blob app_state al estilo versión anterior
        conn = sqlite3.connect(':memory:')
        conn.row_factory = sqlite3.Row
        conn.execute('CREATE TABLE app_state (id INTEGER PRIMARY KEY, data TEXT)')
        conn.execute('CREATE TABLE state_docs (key TEXT PRIMARY KEY, data TEXT, '
                     'version INTEGER NOT NULL DEFAULT 1, updated_at TEXT)')
        blob = {
            'wigs': [{'id': 'fr'}], 'miembros': [{'id': 'm1'}],
            'mciTitulos': {'1': 'Conservación'}, '_semCal': True,
            'semanas': {'27': {'wigs': {'fr': 980}}, '28': {'wigs': {}}},
        }
        conn.execute('INSERT INTO app_state (id, data) VALUES (1, ?)',
                     (json.dumps(blob),))
        conn.commit()

        with redirect_stdout(io.StringIO()):
            server._migrar_blob_a_docs(conn)

        keys = {r['key'] for r in conn.execute('SELECT key FROM state_docs')}
        self.assertEqual(keys, {'config', 'week:27', 'week:28'})
        cfg = json.loads(conn.execute(
            "SELECT data FROM state_docs WHERE key='config'").fetchone()['data'])
        self.assertEqual(cfg['mciTitulos'], {'1': 'Conservación'})
        self.assertTrue(cfg['_semCal'])
        wk27 = json.loads(conn.execute(
            "SELECT data FROM state_docs WHERE key='week:27'").fetchone()['data'])
        self.assertEqual(wk27['wigs']['fr'], 980)
        conn.close()

    def test_migracion_no_repite_si_ya_hay_docs(self):
        conn = sqlite3.connect(':memory:')
        conn.row_factory = sqlite3.Row
        conn.execute('CREATE TABLE app_state (id INTEGER PRIMARY KEY, data TEXT)')
        conn.execute('CREATE TABLE state_docs (key TEXT PRIMARY KEY, data TEXT, '
                     'version INTEGER NOT NULL DEFAULT 1, updated_at TEXT)')
        conn.execute("INSERT INTO state_docs (key, data) VALUES ('config', '{}')")
        conn.execute('INSERT INTO app_state (id, data) VALUES (1, ?)',
                     (json.dumps({'wigs': [1, 2, 3]}),))
        conn.commit()
        with redirect_stdout(io.StringIO()):
            server._migrar_blob_a_docs(conn)
        # No debe haber tocado nada (config sigue vacío, sin week:*)
        n = conn.execute('SELECT COUNT(*) AS c FROM state_docs').fetchone()['c']
        self.assertEqual(n, 1)
        conn.close()


# ── Pruebas de integración (servidor real en un hilo) ───────────────────────

class TestAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmpdir = tempfile.mkdtemp()
        server.DB_PATH = os.path.join(cls.tmpdir, 'test.db')
        server.Handler.log_message = lambda *a, **k: None   # silenciar logs
        with redirect_stdout(io.StringIO()):
            server.init_db()
        cls.httpd = HTTPServer(('127.0.0.1', 0), server.Handler)
        cls.port = cls.httpd.server_address[1]
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()

    def req(self, method, path, body=None, token=None):
        conn = http.client.HTTPConnection('127.0.0.1', self.port, timeout=5)
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = 'Bearer ' + token
        conn.request(method, path,
                     json.dumps(body) if body is not None else None, headers)
        resp = conn.getresponse()
        raw = resp.read().decode('utf-8')
        conn.close()
        try:
            parsed = json.loads(raw) if raw else None
        except json.JSONDecodeError:
            parsed = raw
        return resp.status, parsed

    def login(self, usuario='admin', pwd='admin123'):
        st, d = self.req('POST', '/api/login', {'username': usuario, 'password': pwd})
        return d['token'] if st == 200 and isinstance(d, dict) else None

    # ── Autenticación ──────────────────────────────────────────────────────

    def test_login_correcto_devuelve_token_sin_password(self):
        st, d = self.req('POST', '/api/login', {'username': 'admin', 'password': 'admin123'})
        self.assertEqual(st, 200)
        self.assertIn('token', d)
        self.assertNotIn('pwd_hash', d['user'])
        self.assertEqual(d['user']['rol'], 'admin')

    def test_login_incorrecto_401(self):
        st, _ = self.req('POST', '/api/login', {'username': 'admin', 'password': 'malo'})
        self.assertEqual(st, 401)

    def test_session_restaura_con_token(self):
        tk = self.login()
        st, d = self.req('GET', '/api/session', token=tk)
        self.assertEqual(st, 200)
        self.assertEqual(d['user']['username'], 'admin')

    def test_session_sin_token_401(self):
        st, _ = self.req('GET', '/api/session')
        self.assertEqual(st, 401)

    # ── Escritura protegida ──────────────────────────────────────────────────

    def test_post_state_sin_token_401(self):
        st, _ = self.req('POST', '/api/state', {'wigs': []})
        self.assertEqual(st, 401)

    def test_get_state_es_publico(self):
        st, _ = self.req('GET', '/api/state')
        self.assertEqual(st, 200)   # lectura del tablero abierta

    # ── Control optimista de versión en /api/doc ─────────────────────────────

    def _versions(self):
        """Mapa de versiones actual ({} si aún no hay documentos)."""
        st, state = self.req('GET', '/api/state')
        return (state or {}).get('_versions', {}) if isinstance(state, dict) else {}

    def test_doc_version_correcta_incrementa(self):
        tk = self.login()
        # Primer guardado de un doc nuevo (versión 0 → 1)
        st, d = self.req('POST', '/api/doc',
                         {'key': 'week:40', 'data': {'wigs': {}}, 'version': 0}, token=tk)
        self.assertEqual(st, 200)
        self.assertEqual(d['version'], 1)
        # Segundo guardado con la versión correcta (1 → 2)
        st, d = self.req('POST', '/api/doc',
                         {'key': 'week:40', 'data': {'wigs': {'fr': 5}}, 'version': 1}, token=tk)
        self.assertEqual(st, 200)
        self.assertEqual(d['version'], 2)

    def test_doc_version_vieja_da_409(self):
        tk = self.login()
        self.req('POST', '/api/doc', {'key': 'week:41', 'data': {}, 'version': 0}, token=tk)  # v1
        # reintentar con versión 0 (desactualizada) → conflicto
        st, d = self.req('POST', '/api/doc', {'key': 'week:41', 'data': {}, 'version': 0}, token=tk)
        self.assertEqual(st, 409)
        self.assertEqual(d['current'], 1)

    def test_doc_key_invalida_400(self):
        tk = self.login()
        st, _ = self.req('POST', '/api/doc', {'key': 'hackeo', 'data': {}, 'version': 0}, token=tk)
        self.assertEqual(st, 400)

    def test_doc_semanas_independientes(self):
        tk = self.login()
        # crear week:42 y week:44
        self.req('POST', '/api/doc', {'key': 'week:42', 'data': {}, 'version': 0}, token=tk)
        self.req('POST', '/api/doc', {'key': 'week:44', 'data': {}, 'version': 0}, token=tk)
        v44 = self._versions().get('week:44')
        # escribir week:42 de nuevo no debe afectar la versión de week:44
        self.req('POST', '/api/doc', {'key': 'week:42', 'data': {'x': 1}, 'version': 1}, token=tk)
        self.assertEqual(self._versions().get('week:44'), v44)

    # ── Gestión de usuarios (solo admin) ─────────────────────────────────────

    def test_users_sin_token_403(self):
        st, _ = self.req('GET', '/api/users')
        self.assertEqual(st, 403)

    def test_users_con_admin_lista_sin_passwords(self):
        tk = self.login()
        st, users = self.req('GET', '/api/users', token=tk)
        self.assertEqual(st, 200)
        self.assertTrue(all('pwd_hash' not in u for u in users))
        self.assertGreaterEqual(len(users), 3)

    def test_no_admin_no_gestiona_usuarios(self):
        tk = self.login('view', 'view2026')   # visualizador
        st, _ = self.req('GET', '/api/users', token=tk)
        self.assertEqual(st, 403)

    def test_crear_editar_y_eliminar_usuario(self):
        tk = self.login()
        # crear
        st, d = self.req('POST', '/api/users',
                         {'username': 'nuevo', 'nombre': 'Nuevo', 'password': 'pass123',
                          'rol': 'integrante', 'cargo': 'QA', 'color': '#123'}, token=tk)
        self.assertEqual(st, 200)
        uid = d['user']['id']
        # el nuevo usuario puede iniciar sesión
        self.assertIsNotNone(self.login('nuevo', 'pass123'))
        # eliminar
        st, _ = self.req('POST', '/api/users/delete', {'id': uid}, token=tk)
        self.assertEqual(st, 200)
        # ya no puede entrar
        self.assertIsNone(self.login('nuevo', 'pass123'))

    def test_no_se_elimina_admin_principal(self):
        tk = self.login()
        st, _ = self.req('POST', '/api/users/delete', {'id': 'u1'}, token=tk)
        self.assertEqual(st, 400)

    # ── CORS ─────────────────────────────────────────────────────────────────

    def _headers(self, method, path, extra=None):
        conn = http.client.HTTPConnection('127.0.0.1', self.port, timeout=5)
        conn.request(method, path, None, extra or {})
        resp = conn.getresponse()
        resp.read()
        h = dict(resp.getheaders())
        conn.close()
        return h

    def test_cors_no_emite_allow_origin_para_origen_no_listado(self):
        h = self._headers('GET', '/api/state', {'Origin': 'https://malicioso.example'})
        self.assertNotIn('Access-Control-Allow-Origin', h)

    def test_cors_sin_origin_no_emite_allow_origin(self):
        h = self._headers('GET', '/api/state')
        self.assertNotIn('Access-Control-Allow-Origin', h)

    def test_cors_emite_allow_origin_solo_para_origen_permitido(self):
        server.ALLOWED_ORIGINS.append('https://permitido.example')
        try:
            h = self._headers('GET', '/api/state', {'Origin': 'https://permitido.example'})
            self.assertEqual(h.get('Access-Control-Allow-Origin'), 'https://permitido.example')
            # otro origen sigue sin recibir el header
            h2 = self._headers('GET', '/api/state', {'Origin': 'https://otro.example'})
            self.assertNotIn('Access-Control-Allow-Origin', h2)
        finally:
            server.ALLOWED_ORIGINS.remove('https://permitido.example')


if __name__ == '__main__':
    unittest.main(verbosity=2)
