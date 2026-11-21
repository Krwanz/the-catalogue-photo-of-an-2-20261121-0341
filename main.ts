import { copyFileSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const EXPECTED_WIDTH = 819;
const EXPECTED_HEIGHT = 1024;
const MAX_BYTES = 1048576;

function fail(check: string, detail: string): never {
  throw new Error(`entry check failed (${check}): ${detail}`);
}

function verifyPng(label: string, data: Buffer): { width: number; height: number } {
  if (data.length < 33) {
    fail(label, `file is only ${data.length} bytes, too short to be a PNG`);
  }
  if (!data.subarray(0, 8).equals(PNG_SIGNATURE)) {
    fail(label, "first 8 bytes are not the PNG signature");
  }
  const ihdrLength = data.readUInt32BE(8);
  const ihdrType = data.toString("ascii", 12, 16);
  if (ihdrType !== "IHDR" || ihdrLength !== 13) {
    fail(label, `first chunk is ${ihdrType} (${ihdrLength} bytes), expected IHDR (13 bytes)`);
  }
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  if (width !== EXPECTED_WIDTH || height !== EXPECTED_HEIGHT) {
    fail(label, `dimensions are ${width}x${height}, expected ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}`);
  }
  if (data.length > MAX_BYTES) {
    fail(label, `file is ${data.length} bytes, over the ${MAX_BYTES} byte cap`);
  }
  return { width, height };
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR;
if (!outDir) {
  fail("output-dir", "MAKEFUN_OUTPUT_DIR is not set");
}
mkdirSync(outDir, { recursive: true });

const source = new URL("./catalogue.png", import.meta.url);
const sourceData = readFileSync(source);
const { width, height } = verifyPng("source", sourceData);

const dest = join(outDir, "entry.png");
copyFileSync(source, dest);

const written = readFileSync(dest);
const writtenStat = statSync(dest);
if (writtenStat.size !== sourceData.length || !written.equals(sourceData)) {
  fail("output", "written entry.png does not match the source catalogue.png");
}
verifyPng("output", written);

console.log(`wrote entry.png (${width}x${height}, ${writtenStat.size} bytes)`);
