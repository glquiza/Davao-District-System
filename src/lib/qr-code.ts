/**
 * Lightweight, zero-dependency QR Code generator in TypeScript.
 * Generates an SVG string or matrix for QR codes (Version 1-10, EC Level M).
 */

// Galois Field GF(256) math for Reed-Solomon error correction
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    EXP_TABLE[i + 255] = x;
    LOG_TABLE[x] = i;
    x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
  }
})();

function gMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = EXP_TABLE[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gMul(poly[j], factor);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function rsCalculateRemainder(data: Uint8Array, numEcBytes: number): Uint8Array {
  const gen = rsGeneratorPoly(numEcBytes);
  const remainder = new Uint8Array(numEcBytes);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder[0];
    for (let j = 0; j < numEcBytes - 1; j++) {
      remainder[j] = remainder[j + 1] ^ gMul(gen[j], factor);
    }
    remainder[numEcBytes - 1] = gMul(gen[numEcBytes - 1], factor);
  }
  return remainder;
}

// Version table capacities for EC level M (Bytes):
// Version 1: 16, Version 2: 28, Version 3: 44, Version 4: 64, Version 5: 86, Version 6: 108
interface QrVersionSpec {
  version: number;
  size: number;
  totalBytes: number;
  dataBytes: number;
  ecBytes: number;
  numBlocks: number;
  alignmentPatterns: number[];
}

const VERSION_SPECS: QrVersionSpec[] = [
  { version: 1, size: 21, totalBytes: 26, dataBytes: 16, ecBytes: 10, numBlocks: 1, alignmentPatterns: [] },
  { version: 2, size: 25, totalBytes: 44, dataBytes: 28, ecBytes: 16, numBlocks: 1, alignmentPatterns: [6, 18] },
  { version: 3, size: 29, totalBytes: 70, dataBytes: 44, ecBytes: 26, numBlocks: 1, alignmentPatterns: [6, 22] },
  { version: 4, size: 33, totalBytes: 100, dataBytes: 64, ecBytes: 36, numBlocks: 2, alignmentPatterns: [6, 26] },
  { version: 5, size: 37, totalBytes: 134, dataBytes: 86, ecBytes: 48, numBlocks: 2, alignmentPatterns: [6, 30] },
  { version: 6, size: 41, totalBytes: 172, dataBytes: 108, ecBytes: 64, numBlocks: 4, alignmentPatterns: [6, 34] },
];

export function generateQrMatrix(text: string): boolean[][] {
  const utf8Bytes = new TextEncoder().encode(text);
  
  // Find appropriate version
  const spec = VERSION_SPECS.find((v) => v.dataBytes - 3 >= utf8Bytes.length) ?? VERSION_SPECS[VERSION_SPECS.length - 1];
  const size = spec.size;
  
  // Bit buffer with Byte Mode (0100) + length + data + terminator + padding
  const bitBuffer: number[] = [];
  function pushBits(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      bitBuffer.push((val >> i) & 1);
    }
  }

  pushBits(0b0100, 4); // Byte mode indicator
  pushBits(utf8Bytes.length, 8); // Character count indicator
  for (const b of utf8Bytes) {
    pushBits(b, 8);
  }

  // Terminator (up to 4 zeroes)
  const maxDataBits = spec.dataBytes * 8;
  const termLen = Math.min(4, maxDataBits - bitBuffer.length);
  pushBits(0, termLen);

  // Byte alignment
  while (bitBuffer.length % 8 !== 0) {
    bitBuffer.push(0);
  }

  // Pad bytes (0xEC, 0x11)
  const padPatterns = [0xec, 0x11];
  let padIdx = 0;
  while (bitBuffer.length < maxDataBits) {
    pushBits(padPatterns[padIdx % 2], 8);
    padIdx++;
  }

  // Convert to byte array
  const dataBytes = new Uint8Array(spec.dataBytes);
  for (let i = 0; i < spec.dataBytes; i++) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bitBuffer[i * 8 + b];
    }
    dataBytes[i] = byteVal;
  }

  // Error correction blocks
  const ecPerBlock = spec.ecBytes / spec.numBlocks;
  const dataPerBlock = spec.dataBytes / spec.numBlocks;
  const allBlocks: { data: Uint8Array; ec: Uint8Array }[] = [];

  for (let b = 0; b < spec.numBlocks; b++) {
    const blockData = dataBytes.slice(b * dataPerBlock, (b + 1) * dataPerBlock);
    const blockEc = rsCalculateRemainder(blockData, ecPerBlock);
    allBlocks.push({ data: blockData, ec: blockEc });
  }

  // Interleave data and EC bytes
  const finalBytes: number[] = [];
  for (let i = 0; i < dataPerBlock; i++) {
    for (const blk of allBlocks) {
      if (i < blk.data.length) finalBytes.push(blk.data[i]);
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (const blk of allBlocks) {
      if (i < blk.ec.length) finalBytes.push(blk.ec[i]);
    }
  }

  // Final bits
  const finalBits: number[] = [];
  for (const fb of finalBytes) {
    for (let i = 7; i >= 0; i--) {
      finalBits.push((fb >> i) & 1);
    }
  }

  // Initialize matrix: -1 = unassigned, 0 = white, 1 = black
  const matrix: number[][] = Array.from({ length: size }, () => Array(size).fill(-1));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setModule(r: number, c: number, val: number, isFunc = true) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      if (isFunc) isFunction[r][c] = true;
    }
  }

  // Finder patterns at (0,0), (0, size-7), (size-7, 0)
  function drawFinderPattern(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        if (r === -1 || r === 7 || c === -1 || c === 7) {
          setModule(nr, nc, 0, true);
        } else if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          setModule(nr, nc, 1, true);
        } else {
          setModule(nr, nc, 0, true);
        }
      }
    }
  }

  drawFinderPattern(0, 0);
  drawFinderPattern(0, size - 7);
  drawFinderPattern(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const val = i % 2 === 0 ? 1 : 0;
    if (!isFunction[6][i]) setModule(6, i, val, true);
    if (!isFunction[i][6]) setModule(i, 6, val, true);
  }

  // Alignment patterns
  const alignCoords = spec.alignmentPatterns;
  for (const ar of alignCoords) {
    for (const ac of alignCoords) {
      if (isFunction[ar][ac]) continue;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const val = Math.max(Math.abs(r), Math.abs(c)) === 1 ? 0 : 1;
          setModule(ar + r, ac + c, val, true);
        }
      }
    }
  }

  // Reserve format info area
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      setModule(8, i, 0, true);
      setModule(i, 8, 0, true);
    }
  }
  for (let i = 0; i < 8; i++) {
    setModule(8, size - 1 - i, 0, true);
    setModule(size - 1 - i, 8, 0, true);
  }
  setModule(size - 8, 8, 1, true); // Dark module

  // Place data bits using Mask 0 ((row + col) % 2 === 0)
  let bitIdx = 0;
  let upwards = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing column
    const rows = upwards ? Array.from({ length: size }, (_, i) => size - 1 - i) : Array.from({ length: size }, (_, i) => i);
    for (const r of rows) {
      for (const c of [right, right - 1]) {
        if (!isFunction[r][c]) {
          const bit = bitIdx < finalBits.length ? finalBits[bitIdx++] : 0;
          // Apply mask 0: flip if (r + c) % 2 === 0
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = (bit ^ (mask ? 1 : 0)) === 1 ? 1 : 0;
        }
      }
    }
    upwards = !upwards;
  }

  // Format info for EC Level M and Mask 0: 0x5412 (0101010000010010)
  const formatInfoBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  // Top-left
  const tlCoords: [number, number][] = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = tlCoords[i];
    matrix[r][c] = formatInfoBits[i];
  }

  // Split: bottom-left & top-right
  for (let i = 0; i < 7; i++) {
    matrix[size - 1 - i][8] = formatInfoBits[i];
  }
  for (let i = 7; i < 15; i++) {
    matrix[8][size - 15 + i] = formatInfoBits[i];
  }

  return matrix.map((row) => row.map((cell) => cell === 1));
}

/**
 * Generate an SVG path data string for the QR code matrix.
 */
export function generateQrSvgPath(matrix: boolean[][]): string {
  let path = "";
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c]) {
        path += `M${c},${r}h1v1h-1z `;
      }
    }
  }
  return path.trim();
}
