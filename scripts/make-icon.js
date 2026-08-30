'use strict';

// 纯 Node 生成应用图标 PNG（无需任何第三方库）
// 画一个简洁的剪贴板图标：蓝色圆角板 + 白色内容条

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function inRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function renderIcon(size) {
  const n = size * 2; // 2x 超采样抗锯齿
  const big = Buffer.alloc(n * n * 4);
  const S = size;

  function colorAt(px, py) {
    const x = (px + 0.5) / n;
    const y = (py + 0.5) / n;
    const bars = [[0.32, 0.44], [0.50, 0.62], [0.68, 0.80]];
    if (!inRoundRect(x, y, 0.14, 0.10, 0.86, 0.90, 0.16)) return null;
    if (inRoundRect(x, y, 0.24, 0.02, 0.40, 0.26, 0.05) ||
        inRoundRect(x, y, 0.60, 0.02, 0.76, 0.26, 0.05)) return [10, 132, 255, 255];
    for (const [a, b] of bars) {
      if (x >= 0.26 && x <= 0.74 && y >= a && y <= b) return [255, 255, 255, 255];
    }
    return [10, 132, 255, 255];
  }

  for (let py = 0; py < n; py++) {
    for (let px = 0; px < n; px++) {
      const c = colorAt(px, py);
      if (!c) continue;
      const i = (py * n + px) * 4;
      big[i] = c[0]; big[i + 1] = c[1]; big[i + 2] = c[2]; big[i + 3] = c[3];
    }
  }

  const raw = Buffer.alloc(size * size * 4);
  const k = 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const i = ((y * 2 + dy) * n + (x * 2 + dx)) * 4;
          r += big[i]; g += big[i + 1]; b += big[i + 2]; a += big[i + 3];
        }
      }
      const j = (y * size + x) * 4;
      raw[j] = Math.round(r / k); raw[j + 1] = Math.round(g / k);
      raw[j + 2] = Math.round(b / k); raw[j + 3] = Math.round(a / k);
    }
  }
  return raw;
}

function encodePNG(size) {
  const raw = renderIcon(size);
  const stride = size * 4;
  const filtered = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    filtered[y * (stride + 1)] = 0;
    raw.copy(filtered, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = zlib.deflateSync(filtered, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'icon.png'), encodePNG(256));
fs.writeFileSync(path.join(outDir, 'tray.png'), encodePNG(32));
console.log('图标已生成：assets/icon.png (256), assets/tray.png (32)');
