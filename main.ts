import { copyFileSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const outDir = process.env.MAKEFUN_OUTPUT_DIR;
if (!outDir) {
  console.error("error: MAKEFUN_OUTPUT_DIR is not set");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const src = new URL("./catalogue.png", import.meta.url);
const dst = join(outDir, "entry.png");
copyFileSync(src, dst);

// Read the written output back and verify it is a valid entry image.
const buf = readFileSync(dst);
const pngSignature = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
if (!buf.subarray(0, 8).equals(pngSignature)) {
  console.error("error: entry.png is not a PNG file");
  process.exit(1);
}
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);
if (width !== 819 || height !== 1024) {
  console.error(`error: entry.png is ${width}x${height}, expected 819x1024`);
  process.exit(1);
}
const size = statSync(dst).size;
if (size > 1048576) {
  console.error(`error: entry.png is ${size} bytes, over the 1048576 byte cap`);
  process.exit(1);
}
console.log(`wrote entry.png (${width}x${height}, ${size} bytes)`);
