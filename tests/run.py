#!/usr/bin/env python3
"""
Corre todas las pruebas del proyecto: backend (Python/unittest) + helpers de
cliente (Node/node:test). Devuelve código de salida != 0 si algo falla.

Uso (desde la carpeta del proyecto):
    python tests/run.py
"""
import subprocess
import sys
import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
fallos = []

print('\n=== Backend (Python / unittest) ===')
r = subprocess.run([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-v'],
                   cwd=ROOT)
if r.returncode != 0:
    fallos.append('backend')

node = shutil.which('node')
if node:
    print('\n=== Cliente (Node / node:test) ===')
    r = subprocess.run([node, '--test', 'tests/test_client.mjs'], cwd=ROOT)
    if r.returncode != 0:
        fallos.append('cliente')
else:
    print('\n[AVISO] Node no encontrado - se omiten las pruebas de cliente.')

if fallos:
    print(f'\n[FALLO] Fallaron: {", ".join(fallos)}')
    sys.exit(1)
print('\n[OK] Todas las pruebas pasaron.')
