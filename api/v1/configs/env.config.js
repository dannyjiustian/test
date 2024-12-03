/**
 * English: Imports the modules used
 * Indonesian: Mengimpor modul yang digunakan
 */
import dotenv from "dotenv";
import { Base64 } from "js-base64";

// English: Load environment variables from the .env file
// Indonesian: Memuat variabel lingkungan dari file .env
dotenv.config();

/**
 * English: Class to handle environment variables.
 * Indonesian: Kelas untuk menangani variabel lingkungan.
 */
class EnvConfig {
  /**
   * English: Constructor to initialize environment configurations.
   * Indonesian: Konstruktor untuk menginisialisasi konfigurasi lingkungan.
   */
  constructor() {
    /**
     * English: Object to store configuration values with default fallbacks.
     * Indonesian: Objek untuk menyimpan nilai konfigurasi dengan fallback default.
     */
    this.config = {
      /**
       * English: Environment type, default is 'local'.
       * Indonesian: Jenis lingkungan, default adalah 'local'.
       */
      typeDevelop: process.env.APP_LOCAL || "local",

      /**
       * English: CORS origin for server, default allows all origins.
       * Indonesian: Asal CORS untuk server, default mengizinkan semua asal.
       */
      corsOriginServer: process.env.CORS_SERVER_PRODUCTION || "*",

      /**
       * English: CORS origin for sockets, default allows all origins.
       * Indonesian: Asal CORS untuk socket, default mengizinkan semua asal.
       */
      corsOriginSocket: process.env.CORS_SOCKET_PRODUCTION || "*",

      /**
       * English: Path for WhatsApp socket connection.
       * Indonesian: Path untuk koneksi socket WhatsApp.
       */
      pathSocket: process.env.PATH_SOCKET || "/whatsapp/",

      /**
       * English: API version for routing, default is 'v1'.
       * Indonesian: Versi API untuk routing, default adalah 'v1'.
       */
      apiVersion: process.env.API_VERSION || "v1",

      /**
       * English: Encoded secret key for JWT access.
       * Indonesian: Kunci rahasia terenkripsi untuk akses JWT.
       */
      secretAccessKeyJWT: Base64.encode(process.env.SECRET_ACCESS_KEY_JWT) || "changeAccessKey",

      /**
       * English: Encoded secret key for JWT refresh tokens.
       * Indonesian: Kunci rahasia terenkripsi untuk token refresh JWT.
       */
      secretRefreshKeyJWT: Base64.encode(process.env.SECRET_REFRESH_KEY_JWT) || "changeRefreshKey",

      /**
       * English: Salt value for bcrypt hashing.
       * Indonesian: Nilai salt untuk hashing bcrypt.
       */
      secretSaltBycrpt: parseInt(process.env.SECRET_SALT_BYCRPT) || 0,

      /**
       * English: Secret key for encryption using crypto.
       * Indonesian: Kunci rahasia untuk enkripsi menggunakan crypto.
       */
      secretEncryptCryptoKey: process.env.SECRET_ENCRYPT_CRYPTO_KEY || "72971be05feccec5ec1f5de15f39b06",

      /**
       * English: Secret key for encryption using Hashids.
       * Indonesian: Kunci rahasia untuk enkripsi menggunakan Hashids.
       */
      secretEncryptHashidsKey: process.env.SECRET_ENCRYPT_HASHIDS_KEY || "ad812980bc8d9e9f0870a87c9923b12",

      /**
       * English: Server port, default is 3000.
       * Indonesian: Port server, default adalah 3000.
       */
      portServerConfig: process.env.PORT_SERVER || 3000,

      /**
       * English: Redis URL, default is localhost.
       * Indonesian: URL Redis, default adalah localhost.
       */
      redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",

      /**
       * English: SMTP mail host for sending emails.
       * Indonesian: Host SMTP untuk mengirim email.
       */
      mailHost: process.env.MAIL_HOST || "127.0.0.1",

      /**
       * English: SMTP mail port, default is 2525.
       * Indonesian: Port SMTP untuk email, default adalah 2525.
       */
      mailPort: process.env.MAIL_PORT || "2525",

      /**
       * English: Username for SMTP authentication.
       * Indonesian: Nama pengguna untuk otentikasi SMTP.
       */
      mailUsername: process.env.MAIL_USERNAME || "null",

      /**
       * English: Password for SMTP authentication.
       * Indonesian: Kata sandi untuk otentikasi SMTP.
       */
      mailPassword: process.env.MAIL_PASSWORD || "null",

      /**
       * English: Indicates if SMTP uses a secure connection.
       * Indonesian: Menunjukkan apakah SMTP menggunakan koneksi aman.
       */
      mailSecure: process.env.MAIL_SECURE || false,

      /**
       * English: Default sender email address.
       * Indonesian: Alamat email pengirim default.
       */
      mailFromAddress: process.env.MAIL_FROM_ADDRESS || "hello@example.com",

      /**
       * English: Default sender name.
       * Indonesian: Nama pengirim default.
       */
      mailFromName: process.env.MAIL_FROM_NAME || "node mailer",
    };
  }

  /**
   * English: Retrieves the value of a configuration key.
   * Indonesian: Mengambil nilai dari kunci konfigurasi.
   * @param {string} key - The configuration key to retrieve.
   * @returns {any} - The value of the requested key.
   */
  get(key) {
    return this.config[key];
  }
}

/**
 * English: Export an instance of the EnvConfig class for global access.
 * Indonesian: Mengekspor instance dari kelas EnvConfig untuk akses global.
 */
export default new EnvConfig();
