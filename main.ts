// PORTA-DOOR — the folding door to anywhere (v3).
// Copies the catalogue photograph (catalogue.png) to $MAKEFUN_OUTPUT_DIR/entry.png.
// Standard library only, Node 22. Never removes the output directory itself.
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC_NAME = 'catalogue.png';
const OUT_NAME = 'entry.png';
const EXPECTED_WIDTH = 819;
const EXPECTED_HEIGHT = 1024;
const MAX_BYTES = 1048576;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function fail(check, detail) {
  console.error(`error: ${check} failed — ${detail}`);
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const srcPath = join(here, SRC_NAME);

let src;
try {
  src = readFileSync(srcPath);
} catch (err) {
  fail('source exists', `could not read ${SRC_NAME}: ${err.message}`);
}

if (!src.subarray(0, 8).equals(PNG_SIGNATURE)) {
  fail('PNG signature', `${SRC_NAME} does not start with the PNG magic bytes`);
}

if (src.length < 33 || src.toString('ascii', 12, 16) !== 'IHDR') {
  fail('IHDR present', `${SRC_NAME} has no IHDR chunk where one is expected`);
}
const width = src.readUInt32BE(16);
const height = src.readUInt32BE(20);
if (width !== EXPECTED_WIDTH || height !== EXPECTED_HEIGHT) {
  fail(
    'IHDR dimensions',
    `${SRC_NAME} is ${width}x${height}, expected ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}`,
  );
}

if (src.length > MAX_BYTES) {
  fail('file size', `${SRC_NAME} is ${src.length} bytes, over the ${MAX_BYTES} byte cap`);
}

// A PNG ends with a 12-byte IEND chunk: length 0, type "IEND",
// CRC 0xAE426082. A truncated file would copy silently and hand the
// judge a broken image, so refuse it here with a named check.
const IEND_CRC = 0xae426082;
const tail = src.subarray(src.length - 12);
if (src.length < 12 || tail.readUInt32BE(0) !== 0 || tail.toString('ascii', 4, 8) !== 'IEND' || tail.readUInt32BE(8) !== IEND_CRC) {
  fail(
    'IEND complete',
    `${SRC_NAME} does not end with a complete IEND chunk — the file may be truncated`,
  );
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR;
if (!outDir) {
  fail('output directory', 'MAKEFUN_OUTPUT_DIR is not set');
}
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, OUT_NAME);
writeFileSync(outPath, src);

const written = statSync(outPath);
if (written.size !== src.length) {
  fail(
    'output complete',
    `${OUT_NAME} is ${written.size} bytes, expected ${src.length} bytes`,
  );
}

console.log(`wrote ${OUT_NAME} (${width}x${height}, ${written.size} bytes)`);
