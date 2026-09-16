/**
 * Trae la base local del emulador para inspeccionarla en DBeaver.
 *
 * `gastos.db` vive en el sandbox privado de la app y no se puede abrir desde
 * el host: hay que copiarla. `run-as` solo funciona con builds debuggables,
 * que es justo lo que produce `npm run android`; contra un APK de release
 * falla, y esta bien que falle.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PAQUETE = 'mx.eduardomaytorena.gastos';
const ORIGEN = 'files/SQLite';
const DESTINO = '.local';

// La base de un mes de gastos personales pesa kilobytes, pero el default de
// execFileSync es 1 MB y truncaria en silencio una que creciera.
const TOPE_BUFFER = 256 * 1024 * 1024;

/** Corre adb y devuelve stdout crudo. Con `opcional`, un fallo devuelve null. */
function adb(args, opcional = false) {
  try {
    return execFileSync('adb', args, { maxBuffer: TOPE_BUFFER });
  } catch (error) {
    if (opcional) return null;
    throw error;
  }
}

function fallar(mensaje) {
  console.error(`\n  ${mensaje}\n`);
  process.exit(1);
}

let dispositivos = '';
try {
  dispositivos = execFileSync('adb', ['devices'], { encoding: 'utf8' });
} catch {
  fallar('No encuentro adb. Agrega platform-tools del Android SDK al PATH.');
}

// La primera linea es el encabezado "List of devices attached".
if (!/\bdevice\b/.test(dispositivos.split('\n').slice(1).join('\n'))) {
  fallar('No hay emulador ni dispositivo conectado. Arranca uno y repite.');
}

// Cerrar la app antes de copiar: con ella viva el -wal se mueve mientras se
// lee y la copia puede quedar a medias.
adb(['shell', 'am', 'force-stop', PAQUETE], true);

let base;
try {
  base = adb(['exec-out', 'run-as', PAQUETE, 'cat', `${ORIGEN}/gastos.db`]);
} catch {
  fallar(
    `No pude leer ${ORIGEN}/gastos.db de ${PAQUETE}.\n` +
      '  Si la app nunca ha corrido, la base no existe todavia: abrela una vez.',
  );
}

mkdirSync(DESTINO, { recursive: true });
writeFileSync(join(DESTINO, 'gastos.db'), base);

// El -wal guarda lo escrito mas reciente. Si no existe, ya se consolido todo
// en el .db y no falta nada: por eso el fallo aqui no es un error.
const wal = adb(['exec-out', 'run-as', PAQUETE, 'cat', `${ORIGEN}/gastos.db-wal`], true);
if (wal?.length) writeFileSync(join(DESTINO, 'gastos.db-wal'), wal);

console.log(`\n  Copiada a ${join(DESTINO, 'gastos.db')}${wal?.length ? ' (+ -wal)' : ''}`);
console.log('  Abrela en DBeaver con el driver SQLite.');
console.log('  La app quedo cerrada en el emulador.\n');
