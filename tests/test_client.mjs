// Pruebas de helpers puros del cliente (esc, getWigVal) con el runner nativo
// de Node — sin dependencias. state.js es código de navegador (scope global),
// así que lo cargamos en un sandbox `vm` proveyendo los globales que espera
// (MB, WB) en vez de modificar el código de producción.
//
// Ejecutar desde la carpeta del proyecto:
//     node --test tests/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const code = readFileSync(join(dir, '..', 'js', 'state.js'), 'utf-8');

// Sandbox con los globales mínimos que state.js toca al cargar
const sandbox = {
  MB: [], WB: [], JSON, Object, Math, String, Array, Date,
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  console,
};
// Epílogo (solo en pruebas): expone las funciones y un setter de ST al sandbox.
// `let ST` es un binding léxico que no aparece como propiedad del contexto, así
// que capturamos todo dentro del mismo script para poder inyectar estado.
const epilogo = '\n;globalThis.__esc = esc; globalThis.__getWigVal = getWigVal;'
              + ' globalThis.__setST = (s) => { ST = s; };';
vm.createContext(sandbox);
vm.runInContext(code + epilogo, sandbox);

const esc = sandbox.__esc;
const getWigVal = sandbox.__getWigVal;
const setST = sandbox.__setST;

test('esc escapa los caracteres peligrosos de HTML', () => {
  assert.equal(esc('<img src=x onerror="a">'), '&lt;img src=x onerror=&quot;a&quot;&gt;');
  assert.equal(esc("O'Brien & Co"), 'O&#39;Brien &amp; Co');
});

test('esc deja texto plano intacto', () => {
  assert.equal(esc('Franquicias 2026'), 'Franquicias 2026');
  assert.equal(esc('70%'), '70%');
});

test('esc trata null/undefined como cadena vacía', () => {
  assert.equal(esc(null), '');
  assert.equal(esc(undefined), '');
  assert.equal(esc(980), '980');   // números → string
});

test('getWigVal devuelve el valor explícito de la semana', () => {
  setST({
    wigs: [{ id: 'fr', inicio: 0 }],
    semanas: { 27: { wigs: { fr: 980 } } },
  });
  assert.equal(getWigVal(27, 'fr'), 980);
});

test('getWigVal hereda de una semana anterior si la actual no tiene valor', () => {
  setST({
    wigs: [{ id: 'fr', inicio: 0 }],
    semanas: { 27: { wigs: { fr: 980 } }, 28: { wigs: {} }, 29: { wigs: {} } },
  });
  assert.equal(getWigVal(29, 'fr'), 980);   // hereda de la 27
});

test('getWigVal devuelve inicio del WIG si ninguna semana tiene valor', () => {
  setST({
    wigs: [{ id: 'pr', inicio: 61.55 }],
    semanas: { 27: { wigs: {} } },
  });
  assert.equal(getWigVal(27, 'pr'), 61.55);
});

test('getWigVal toma el valor más reciente cuando hay varios', () => {
  setST({
    wigs: [{ id: 'fr', inicio: 0 }],
    semanas: { 27: { wigs: { fr: 980 } }, 28: { wigs: { fr: 1010 } } },
  });
  assert.equal(getWigVal(28, 'fr'), 1010);
  assert.equal(getWigVal(27, 'fr'), 980);
});

test('getWigVal devuelve 0 para un WIG inexistente sin datos', () => {
  setST({ wigs: [], semanas: {} });
  assert.equal(getWigVal(30, 'zzz'), 0);
});
