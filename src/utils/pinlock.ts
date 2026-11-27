/**
 * PIN app lock — a gentle, optional 4-digit gate.
 *
 * The PIN itself is never stored: we store `sha256(salt + pin)` with a random
 * salt (crypto.getRandomValues where available, else a time+random fallback).
 * Pure JS, dependency-free, identical on Android, iOS and web.
 *
 * v4.2.0 hardening:
 *  - The hash is now key-stretched (KDF_ROUNDS sequential SHA-256 runs), so a
 *    leaked storage file can no longer be brute-forced instantly. Configs
 *    saved by v4.0/4.1 (kdf: 1) keep working and are transparently upgraded
 *    to the stretched form after the next successful unlock.
 *  - Failed-attempt lockout helpers (backoff schedule) live here so the gate,
 *    Settings and tests share one source of truth.
 */

export interface LockConfig {
  enabled: boolean;
  salt: string;
  hash: string;
  /** 1 = single SHA-256 (legacy v4.0/4.1), 2 = key-stretched (v4.2.0). */
  kdf?: 1 | 2;
}

export const LOCK_KEY = 'aiserie.v1.lock';

/* ---------------- SHA-256 (compact, well-known public-domain shape) ---------------- */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function sha256Bytes(input: string): Uint8Array {
  const utf8: number[] = [];
  for (let i = 0; i < input.length; i++) {
    let c = input.charCodeAt(i);
    if (c < 0x80) utf8.push(c);
    else if (c < 0x800) utf8.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < input.length) {
      const c2 = input.charCodeAt(++i);
      c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
      utf8.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    } else utf8.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  const bitLen = utf8.length * 8;
  utf8.push(0x80);
  while (utf8.length % 64 !== 56) utf8.push(0);
  for (let i = 3; i >= 0; i--) utf8.push((bitLen >>> (i * 8)) & 0xff);

  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let off = 0; off < utf8.length; off += 64) {
    for (let i = 0; i < 16; i++) {
      const j = off + i * 4;
      w[i] = (utf8[j] << 24) | (utf8[j + 1] << 16) | (utf8[j + 2] << 8) | utf8[j + 3];
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e;
      e = (d + t1) >>> 0;
      d = c; c = b; b = a;
      a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    out[i * 4] = (H[i] >>> 24) & 0xff;
    out[i * 4 + 1] = (H[i] >>> 16) & 0xff;
    out[i * 4 + 2] = (H[i] >>> 8) & 0xff;
    out[i * 4 + 3] = H[i] & 0xff;
  }
  return out;
}

function toHex(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
}

/* ---------------- public API ---------------- */

/** Sequential SHA-256 rounds — a pure-JS work factor for the 4-digit space. */
const KDF_ROUNDS = 1200;

/** Salted PIN hash to store. Only the result ever touches AsyncStorage. */
export function hashPin(pin: string, salt: string): string {
  let digest = sha256Bytes(`${salt}:${pin}`);
  for (let round = 1; round < KDF_ROUNDS; round++) {
    digest = sha256Bytes(toHex(digest));
  }
  return toHex(digest);
}

/** Legacy single-pass hash — exactly what v4.0/4.1 stored. */
export function hashPinV1(pin: string, salt: string): string {
  return toHex(sha256Bytes(`${salt}:${pin}`));
}

/**
 * Verify a PIN against a config of any KDF generation.
 * Returns whether it matched and whether the stored hash should be
 * transparently upgraded to the stretched form (legacy configs).
 */
export function verifyPin(pin: string, config: LockConfig): { ok: boolean; upgrade: boolean } {
  if (config.kdf === 2) {
    return { ok: hashPin(pin, config.salt) === config.hash, upgrade: false };
  }
  const ok = hashPinV1(pin, config.salt) === config.hash;
  return { ok, upgrade: ok };
}

export function makeSalt(): string {
  const bytes = new Uint8Array(16);
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
  } else {
    // extremely defensive fallback (Hermes builds without WebCrypto)
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return toHex(bytes);
}

/**
 * v4.2.0 crypto-strength record ids where the platform provides one,
 * with the historic time+random shape as a guaranteed fallback.
 */
export function makeId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

/* ---------------- failed-attempt lockout ---------------- */

/** How long the pad stays disabled after the Nth consecutive failure. */
export function lockoutMsFor(failedAttempts: number): number {
  if (failedAttempts < 3) return 0; // two honest typos never punish anyone
  const step = failedAttempts - 2; // 3rd→30s, 4th→60s, 5th→120s… capped at 5 min
  return Math.min(300_000, 30_000 * Math.pow(2, step - 1));
}

export interface LockGuard {
  /** Consecutive failed attempts since the last success. */
  attempts: number;
  /** Epoch ms until which the pad is disabled; 0 = open. */
  lockedUntil: number;
}

export const LOCK_GUARD_KEY = 'aiserie.v1.lockguard';

/** Record a failed attempt against the current guard state. */
export function recordFailedAttempt(guard: LockGuard | null, now: number = Date.now()): LockGuard {
  const attempts = Math.min(99, (guard?.attempts ?? 0) + 1);
  const ms = lockoutMsFor(attempts);
  return { attempts, lockedUntil: ms > 0 ? now + ms : 0 };
}

/** Whether the pad is currently locked, and for how much longer. */
export function guardRemainingMs(guard: LockGuard | null | undefined, now: number = Date.now()): number {
  const until = guard?.lockedUntil ?? 0;
  return until > now ? until - now : 0;
}

/** 4 digits, not trivially repeating, not ascending/descending runs. */
export function isPinAcceptable(pin: string): boolean {
  if (!/^\d{4}$/.test(pin)) return false;
  if (/^(\d)\1+$/.test(pin)) return false; // 1111, 2222...
  const seqs = ['0123', '1234', '2345', '3456', '4567', '5678', '6789', '9876', '8765', '7654', '6543', '5432', '4321', '3210'];
  if (seqs.includes(pin)) return false; // 1234, 4321...
  return true;
}
