import crypto from 'crypto';
import { ethers } from 'ethers';

export class CryptoService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12; // 96 bits for GCM
  private static readonly AUTH_TAG_LENGTH = 16;

  /**
   * Derive a 32-byte key from master key string using SHA-256
   */
  private static deriveKey(masterKey: string): Buffer {
    return crypto.createHash('sha256').update(masterKey).digest();
  }

  /**
   * Encrypt a private key string with AES-256-GCM
   */
  public static encryptPrivateKey(privateKey: string, masterKey: string): string {
    // Validate private key format
    const cleanedKey = privateKey.trim().startsWith('0x') ? privateKey.trim() : `0x${privateKey.trim()}`;
    if (!ethers.isHexString(cleanedKey, 32)) {
      throw new Error('Invalid EVM private key format (must be 32 bytes hex string).');
    }

    const key = this.deriveKey(masterKey);
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv, { authTagLength: this.AUTH_TAG_LENGTH });

    let encrypted = cipher.update(cleanedKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv_hex:authTag_hex:encrypted_hex
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt an encrypted private key string
   */
  public static decryptPrivateKey(encryptedString: string, masterKey: string): string {
    const parts = encryptedString.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted key payload structure.');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = this.deriveKey(masterKey);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv, { authTagLength: this.AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Derive EVM Wallet address from raw or encrypted private key
   */
  public static getAddressFromPrivateKey(privateKey: string): string {
    const cleanedKey = privateKey.trim().startsWith('0x') ? privateKey.trim() : `0x${privateKey.trim()}`;
    const wallet = new ethers.Wallet(cleanedKey);
    return wallet.address;
  }
}
