import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const SALT = "prompttrack-api-key-salt"; // In production, use env var
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  return scryptSync(
    process.env.ENCRYPTION_KEY || "dev-secret-key",
    SALT,
    KEY_LENGTH
  );
}

export function encryptKey(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();
  const combined = iv.toString("hex") + authTag.toString("hex") + encrypted;

  return combined;
}

export function decryptKey(encrypted: string): string {
  const key = getKey();
  const ivSize = IV_LENGTH * 2;
  const authTagSize = AUTH_TAG_LENGTH * 2;

  const iv = Buffer.from(encrypted.slice(0, ivSize), "hex");
  const authTag = Buffer.from(
    encrypted.slice(ivSize, ivSize + authTagSize),
    "hex"
  );
  const ciphertext = encrypted.slice(ivSize + authTagSize);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
