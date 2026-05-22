import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 12 bytes standard for GCM

/**
 * Get or derive the encryption key (must be exactly 32 bytes)
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.ARCA_ENCRYPTION_KEY;
  if (!envKey) {
    // Fallback safe for development/simulation mode only.
    // In production we should require it, but this keeps the sandbox running smoothly.
    console.warn("⚠️ Warning: ARCA_ENCRYPTION_KEY is not defined. Using a development fallback key.");
    return crypto.createHash("sha256").update("dev-fallback-secret-arca-key").digest();
  }
  
  // If it's a hex format representing exactly 32 bytes, parse it, otherwise sha256 it
  if (envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
    return Buffer.from(envKey, "hex");
  }
  
  return crypto.createHash("sha256").update(envKey).digest();
}

/**
 * Encrypts a private key PEM string using AES-256-GCM.
 * Output format: iv:tag:ciphertext (all hex strings joined by colons)
 */
export function encryptPrivateKey(privateKeyPem: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(privateKeyPem, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const tag = cipher.getAuthTag();
  
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts a private key PEM string from the encrypted format.
 */
export function decryptPrivateKey(encryptedData: string): string {
  if (!encryptedData.includes(":")) {
    throw new Error("Invalid encrypted private key format: missing metadata separators.");
  }
  
  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted private key format: corrupt block count.");
  }
  
  const [ivHex, tagHex, ciphertextHex] = parts;
  if (!ivHex || !tagHex || !ciphertextHex) {
    throw new Error("Invalid encrypted private key format: empty cryptographic block.");
  }
  
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(ciphertext, undefined, "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}
