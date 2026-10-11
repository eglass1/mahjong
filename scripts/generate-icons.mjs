// A code-drawn Mahjong tile icon; no external assets or image dependencies.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
const folder = new URL("../public/icons/", import.meta.url);
mkdirSync(folder, { recursive: true });
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const tag = Buffer.from(type),
    length = Buffer.alloc(4),
    crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([tag, data])));
  return Buffer.concat([length, tag, data, crc]);
}
function insideRound(x, y, left, top, width, height, radius) {
  const cx = Math.max(left + radius, Math.min(x, left + width - radius)),
    cy = Math.max(top + radius, Math.min(y, top + height - radius));
  return Math.hypot(x - cx, y - cy) <= radius;
}
function pixel(x, y) {
  let color = [23, 63, 53];
  if (insideRound(x, y, 144, 111, 224, 302, 24)) color = [159, 172, 137];
  if (insideRound(x, y, 144, 99, 224, 302, 24)) color = [250, 247, 224];
  for (const cx of [206, 306])
    for (const cy of [200, 300]) {
      const dist = Math.hypot(x - cx, y - cy);
      if (dist < 29) color = [36, 94, 76];
      if (dist < 15) color = [250, 247, 224];
      if (dist < 6) color = [177, 139, 71];
    }
  return color;
}
for (const [size, name] of [
  [192, "icon-192.png"],
  [512, "icon-512.png"],
  [180, "apple-touch-icon.png"],
]) {
  const rows = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const sum = [0, 0, 0];
      for (const dx of [0.25, 0.75])
        for (const dy of [0.25, 0.75])
          pixel(((x + dx) * 512) / size, ((y + dy) * 512) / size).forEach(
            (c, i) => (sum[i] += c),
          );
      const offset = y * (size * 3 + 1) + 1 + x * 3;
      sum.forEach((c, i) => (rows[offset + i] = Math.round(c / 4)));
    }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;
  writeFileSync(
    new URL(name, folder),
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(rows)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}
console.log("Generated 192px, 512px mask-safe, and 180px Apple icons.");
