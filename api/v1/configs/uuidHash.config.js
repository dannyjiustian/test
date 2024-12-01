/**
 * English: Imports the modules used
 * Indonesian: Mengimpor modul yang digunakan
 */
import Hashids from "hashids";
import envConfig from "./env.config.js";

/**
 * English: A class to manage Hashids encryption and decryption
 * Indonesian: Sebuah kelas untuk mengelola enkripsi dan dekripsi Hashids
 */
class UuidHashConfig {
  /**
   * English: Constructor to initialize the secret key from the environment configuration.
   * Indonesian: Konstruktor untuk menginisialisasi kunci rahasia dari konfigurasi lingkungan.
   */
  constructor() {
    /**
     * English: Secret key used for Hashids operations.
     * Indonesian: Kunci rahasia yang digunakan untuk operasi Hashids.
     */
    this.secretKey = envConfig.get("secretEncryptHashidsKey");
  }

  /**
   * English: Encrypts a UUID into a shortened hash.
   * Indonesian: Mengenkripsi UUID menjadi hash yang dipendekkan.
   * @param {string} uuid - The UUID to encrypt.
   * @returns {string} - The encrypted hash.
   */
  encrypt(uuid) {
    return new Hashids(this.secretKey).encodeHex(uuid.replace(/-/g, ""));
  }

  /**
   * English: Decrypts the encrypted hash back to its original UUID.
   * Indonesian: Mendekripsi hash yang terenkripsi kembali ke UUID aslinya.
   * @param {string} encrypted - The encrypted hash to decrypt.
   * @returns {string} - The decrypted UUID.
   */
  decrypt(encrypted) {
    const decrypted = new Hashids(this.secretKey)
      .decodeHex(encrypted)
      .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
    return decrypted;
  }
}

/**
 * English: Export an instance of the UuidHashConfig class for global use.
 * Indonesian: Mengekspor instance dari kelas UuidHashConfig untuk penggunaan global.
 */
export default new UuidHashConfig();
