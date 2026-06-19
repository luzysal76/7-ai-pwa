/* eslint-disable */
// Simple PNG icon generator without external deps (Node.js script, not bundled)
// Uses raw PNG byte construction

import { createWriteStream } from 'fs';
import { deflateSync } from 'zlib';

function createPNG(size, r, g, b) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  function chunk(type, data) {
    const typeBuffer = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    // CRC32
    const crcData = Buffer.concat([typeBuffer, data]);
    let crc = 0xffffffff;
    for (const byte of crcData) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) {
        crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
      }
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuffer, data, crcBuf]);
  }

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type: RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = chunk('IHDR', ihdrData);

  // IDAT - raw pixel data with filter byte
  const rowSize = size * 3;
  const raw = Buffer.alloc(size * (rowSize + 1));
  for (let y = 0; y < size; y++) {
    const offset = y * (rowSize + 1);
    raw[offset] = 0; // filter type: None
    for (let x = 0; x < size; x++) {
      const px = offset + 1 + x * 3;
      // gradient from indigo to purple
      const t = (x + y) / (size * 2);
      raw[px] = Math.round(99 + (139 - 99) * t);   // R: 99->139
      raw[px+1] = Math.round(102 + (92 - 102) * t); // G: 102->92
      raw[px+2] = Math.round(241 + (246 - 241) * t); // B: 241->246

      // Draw rounded rect shape (circular icon background)
      const cx = x - size/2;
      const cy = y - size/2;
      const radius = size * 0.45;
      const roundness = size * 0.2;
      // Simple approximation - just use the gradient as background
    }
  }
  const compressed = deflateSync(raw);
  const idat = chunk('IDAT', compressed);

  // IEND
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// Generate icons
const icon192 = createPNG(192, 99, 102, 241);
const icon512 = createPNG(512, 99, 102, 241);

import { writeFileSync } from 'fs';
writeFileSync('./public/icon-192.png', icon192);
writeFileSync('./public/icon-512.png', icon512);
console.log('Icons generated!');
