/**
 * English: Imports the modules used
 * Indonesian: Mengimpor modul yang digunakan
 */
import {
  scryptSync,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from "crypto";
import envConfig from "./env.config.js";

/**
 * English: Class for encryption utilities
 * Indonesian: Kelas untuk utilitas enkripsi
 */
class CryptoConfig {
  /**
   * English: Constructor to initialize CryptoConfig class
   * Indonesian: Konstruktor untuk menginisialisasi kelas CryptoConfig
   */
  constructor() {
    /**
     * English: Secret key used for generating encryption and decryption keys
     * Indonesian: Kunci rahasia yang digunakan untuk menghasilkan kunci enkripsi dan dekripsi
     */
    this.secretEncryptKey = envConfig.get("secretEncryptCryptoKey");
  }

  /**
   * English: Encrypts the given text using AES-256-CBC with a provided password
   * Indonesian: Mengenkripsi teks menggunakan AES-256-CBC dengan password yang diberikan
   * @param {string} text - The plaintext to be encrypted
   * @param {string} password - The password used for encryption
   * @returns {string} - The encrypted text with IV, formatted as "IV:encryptedData"
   */
  encrypt(text, password) {
    const key = scryptSync(password, this.secretEncryptKey, 32); // Generate encryption key
    const iv = randomBytes(16); // Generate initialization vector (IV)
    const cipher = createCipheriv("aes-256-cbc", key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    // Return the IV and encrypted data as a single string
    return `${iv.toString("hex")}:${encrypted}`;
  }

  /**
   * English: Decrypts the given encrypted data using AES-256-CBC with a provided password
   * Indonesian: Mendekripsi data terenkripsi menggunakan AES-256-CBC dengan password yang diberikan
   * @param {string} encryptedData - The encrypted text in the format "IV:encryptedData"
   * @param {string} password - The password used for decryption
   * @returns {string} - The decrypted plaintext
   */
  decrypt(encryptedData, password) {
    const [ivHex, encrypted] = encryptedData.split(":"); // Split the IV and encrypted data
    const key = scryptSync(password, this.secretEncryptKey, 32); // Generate decryption key
    const iv = Buffer.from(ivHex, "hex"); // Convert IV back to a buffer
    const decipher = createDecipheriv("aes-256-cbc", key, iv);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted; // Return the decrypted plaintext
  }
}

/**
 * English: Export an instance of the CryptoConfig class for use
 * Indonesian: Mengekspor sebuah instance dari kelas CryptoConfig untuk digunakan
 */
export default new CryptoConfig();
