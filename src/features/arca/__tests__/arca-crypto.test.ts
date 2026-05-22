import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { encryptPrivateKey, decryptPrivateKey } from "../services/arca-crypto";

describe("ARCA Cryptography AES-256-GCM Service", () => {
  const originalEnv = process.env.ARCA_ENCRYPTION_KEY;
  
  beforeAll(() => {
    // Set a custom 32-byte (64 characters in hex) key for testing
    process.env.ARCA_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });
  
  afterAll(() => {
    process.env.ARCA_ENCRYPTION_KEY = originalEnv;
  });
  
  it("should successfully encrypt and decrypt a PEM private key string", () => {
    const pem = "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0Y3...\n-----END RSA PRIVATE KEY-----";
    const encrypted = encryptPrivateKey(pem);
    
    expect(encrypted).toContain(":");
    const parts = encrypted.split(":");
    expect(parts.length).toBe(3); // [iv, tag, ciphertext]
    
    const decrypted = decryptPrivateKey(encrypted);
    expect(decrypted).toBe(pem);
  });
  
  it("should throw an validation error if the encrypted payload has a corrupted format", () => {
    expect(() => decryptPrivateKey("invalidencryptedpayload")).toThrow(
      "Invalid encrypted private key format"
    );
    expect(() => decryptPrivateKey("part1:part2")).toThrow(
      "Invalid encrypted private key format"
    );
  });
  
  it("should fail decryption with an integrity error if the ciphertext or tag is modified", () => {
    const pem = "my-secret-pem-key";
    const encrypted = encryptPrivateKey(pem);
    const [iv, tag, ciphertext] = encrypted.split(":");
    
    // Modify a single character in the ciphertext to corrupt integrity
    const corruptedCiphertext = ciphertext.substring(0, ciphertext.length - 1) + (ciphertext.slice(-1) === "0" ? "1" : "0");
    const corruptedPayload = `${iv}:${tag}:${corruptedCiphertext}`;
    
    // AES-GCM should fail auth tag verification
    expect(() => decryptPrivateKey(corruptedPayload)).toThrow();
  });
  
  it("should fallback to dev key when env key is not provided without crashing", () => {
    delete process.env.ARCA_ENCRYPTION_KEY;
    
    const pem = "fallback-test-pem";
    const encrypted = encryptPrivateKey(pem);
    const decrypted = decryptPrivateKey(encrypted);
    
    expect(decrypted).toBe(pem);
  });
});
