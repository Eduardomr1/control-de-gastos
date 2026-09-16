/**
 * Trae la base local del emulador para inspeccionarla en DBeaver.
 *
 * `gastos.db` vive en el sandbox privado de la app y no se puede abrir desde
 * el host: hay que copiarla. `run-as` solo funciona con builds debuggables,
 * que es justo lo que produce `npm run android`; contra un APK de release
 * falla, y esta bien que falle.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PAQUETE = 'mx.eduardomaytorena.gastos';
const ORIGEN = 'files/SQLite';
const DESTINO = '.local';
const BIN = process.platform === 'win32' ? 'adb.exe' : 'adb';

// La base de un mes de gastos personales pesa kilobytes, pero el default de
// execFileSync es 1 MB y truncaria en silencio una que creciera.
const TOPE_BUFFER = 256 * 1024 * 1024;

/**
 * Ubica adb sin depender del PATH: Android Studio instala platform-tools pero
 * no lo agrega, asi que exigir el PATH falla en una instalacion normal.
 * Si nada aparece en las rutas conocidas, se deja que lo resuelva el PATH.
 */
function ubicarAdb() {
  const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  const candidatos = [
    sdk && join(sdk, 'platform-tools', BIN),
    process.env.LOCALAPPDATA &&
      join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', BIN),
    process.env.HOME && join(process.env.HOME, 'Library', 'Android', 'sdk', 'platform-tools', BIN),
    process.env.HOME && join(process.env.HOME, 'Android', 'Sdk', 'platform-tools', BIN),
  ].filter(Boolean);

  return candidatos.find((ruta) => existsSync(ruta)) ?? BIN;
}

const ADB = ubicarAdb();

/** Corre adb y devuelve stdout crudo. Con `opcional`, un fallo devuelve null. */
function adb(args, opcional = false) {
  try {
    return execFileSync(ADB, args, { maxBuffer: TOPE_BUFFER });
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
  dispositivos = execFileSync(ADB, ['devices'], { encoding: 'utf8' });
} catch {
  fallar(
    'No encuentro adb. Lo busque en ANDROID_HOME, ANDROID_SDK_ROOT, la ruta\n' +
      '  default del SDK y el PATH.\n\n' +
      '  Si tienes Android Studio, apunta ANDROID_HOME a tu SDK\n' +
      '  (Settings > Languages & Frameworks > Android SDK muestra la ruta).',
  );
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
