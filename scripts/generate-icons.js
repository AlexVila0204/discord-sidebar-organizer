import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }
  return table;
}

const crcTable = createCrcTable();

function calculateCrc(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writePngChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(12 + length);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4);
  data.copy(chunk, 8);
  const crcTarget = Buffer.concat([Buffer.from(type), data]);
  const crc = calculateCrc(crcTarget);
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

function generatePng(size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = writePngChunk('IHDR', ihdrData);

  const rawData = Buffer.alloc(size * (size * 4 + 1));
  let offset = 0;

  const center = size / 2;
  const radius = size * 0.44;

  for (let y = 0; y < size; y++) {
    rawData[offset++] = 0;
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        const factor = (x + y) / (size * 2);
        rawData[offset++] = Math.floor(88 + factor * 50);
        rawData[offset++] = Math.floor(101 + factor * 60);
        rawData[offset++] = Math.floor(242);
        rawData[offset++] = 255;
      } else {
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = writePngChunk('IDAT', compressedData);
  const iendChunk = writePngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const targetDir = path.resolve('extension/icons');
fs.mkdirSync(targetDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const png = generatePng(size);
  fs.writeFileSync(path.join(targetDir, `icon${size}.png`), png);
}

process.stdout.write('Icons generated successfully\n');
