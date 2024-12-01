/**
 * English: Imports the modules used
 * Indonesian: Mengimpor modul yang digunakan
 */
import bcrypt from "bcrypt";
import envConfig from "./env.config.js";

/**
 * English: Class for bcrypt hashing utilities
 * Indonesian: Kelas untuk utilitas hashing menggunakan bcrypt
 */
class BcryptConfig {
  /**
   * English: Constructor to initialize BcryptConfig class
   * Indonesian: Konstruktor untuk menginisialisasi kelas BcryptConfig
   */
  constructor() {
    /**
     * English: Number of salt rounds for hashing, retrieved from environment configuration
     * Indonesian: Jumlah salt rounds untuk hashing, diambil dari konfigurasi lingkungan
     */
    this.saltRounds = parseInt(envConfig.get("secretSaltBycrpt"), 10);
  }

  /**
   * English: Hashes a plain string using bcrypt synchronously
   * Indonesian: Meng-hash string menggunakan bcrypt secara sinkron
   * @param {string} string - The string to be hashed
   * @returns {string} - The hashed string
   */
  hash(string) {
    return bcrypt.hashSync(string, this.saltRounds);
  }

  /**
   * English: Verifies if a plain string matches a bcrypt hash
   * Indonesian: Memverifikasi apakah string cocok dengan hash bcrypt
   * @param {string} string - The plain string to be compared
   * @param {string} hash - The hashed string to compare against
   * @returns {Promise<boolean>} - True if the string matches the hash, otherwise false
   */
  async verify(string, hash) {
    return await bcrypt.compare(string, hash);
  }
}

/**
 * English: Export an instance of the BcryptConfig class for use
 * Indonesian: Mengekspor sebuah instance dari kelas BcryptConfig untuk digunakan
 */
export default new BcryptConfig();
