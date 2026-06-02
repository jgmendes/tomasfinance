// Criptografia do cofre (zero-knowledge) usando Web Crypto API.
// A senha-mestra NUNCA sai do navegador nem é armazenada. Dela derivamos
// (PBKDF2) uma chave AES-GCM que cifra/decifra cada senha guardada.

const enc = new TextEncoder();
const dec = new TextDecoder();

export const VAULT_VERIFIER = "TOMAZ_VAULT_OK";
const PBKDF2_ITERATIONS = 150_000;

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomSaltB64(): string {
  return bufToB64(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

export async function deriveKey(
  masterPassword: string,
  saltB64: string
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(masterPassword) as BufferSource,
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: b64ToBytes(saltB64) as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptText(
  key: CryptoKey,
  plaintext: string
): Promise<{ iv: string; ct: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    enc.encode(plaintext) as BufferSource
  );
  return { iv: bufToB64(iv.buffer), ct: bufToB64(ct) };
}

export async function decryptText(
  key: CryptoKey,
  ivB64: string,
  ctB64: string
): Promise<string> {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBytes(ivB64) as BufferSource },
    key,
    b64ToBytes(ctB64) as BufferSource
  );
  return dec.decode(pt);
}

/** Gera uma senha forte aleatória. */
export function generatePassword(length = 18): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*-_=+";
  const arr = crypto.getRandomValues(new Uint32Array(length));
  let out = "";
  for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length];
  return out;
}
