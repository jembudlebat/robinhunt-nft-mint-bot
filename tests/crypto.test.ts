import { describe, it, expect } from 'vitest';
import { CryptoService } from '../src/services/crypto.service.js';

describe('CryptoService - AES-256-GCM Encryption', () => {
  const masterKey = 'test_master_key_32_characters_long_12345';
  const testPrivateKey = '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a6f36385d';
  const expectedAddress = '0xf0032467481cdf38972fb5746eefb6d59f95e66c';

  it('should derive correct EVM address from private key', () => {
    const address = CryptoService.getAddressFromPrivateKey(testPrivateKey);
    expect(address.toLowerCase()).toBe(expectedAddress.toLowerCase());
  });

  it('should encrypt and decrypt private key correctly', () => {
    const encrypted = CryptoService.encryptPrivateKey(testPrivateKey, masterKey);
    expect(encrypted).toContain(':');

    const decrypted = CryptoService.decryptPrivateKey(encrypted, masterKey);
    expect(decrypted.toLowerCase()).toBe(testPrivateKey.toLowerCase());
  });

  it('should throw error when decrypting with wrong key', () => {
    const encrypted = CryptoService.encryptPrivateKey(testPrivateKey, masterKey);
    expect(() => {
      CryptoService.decryptPrivateKey(encrypted, 'wrong_key_123456789012345678901');
    }).toThrow();
  });

  it('should reject invalid private key string format', () => {
    expect(() => {
      CryptoService.encryptPrivateKey('invalid_hex', masterKey);
    }).toThrow('Invalid EVM private key format');
  });
});
