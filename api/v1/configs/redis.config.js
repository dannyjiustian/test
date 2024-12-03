/**
 * English: Imports the modules used
 * Indonesian: Mengimpor modul yang digunakan
 */
import Redis from "ioredis";
import envConfig from "./env.config.js";

/**
 * English: Configures and manages Redis interactions.
 * Indonesian: Mengonfigurasi dan mengelola interaksi Redis.
 */
class RedisConfig {
  /**
   * English: Initializes the Redis client with the specified connection details and sets up event handlers.
   * Indonesian: Menginisialisasi klien Redis dengan detail koneksi yang ditentukan dan menetapkan pengendali acara.
   */
  constructor() {
    this.redisUrl = envConfig.get("redisUrl");
    this.redisClient = new Redis(this.redisUrl);

    // English: Log a message when Redis connects successfully.
    // Indonesian: Mencatat pesan ketika Redis berhasil terhubung.
    this.redisClient.on("connect", () => {
      console.log("Redis client core connected successfully");
    });

    // English: Log an error message if there is an issue with Redis.
    // Indonesian: Mencatat pesan kesalahan jika terjadi masalah dengan Redis.
    this.redisClient.on("error", (err) => console.error("Redis Client Core Error", err));
  }

  /**
   * English: Returns the appropriate Redis key based on the request type and user identifier.
   * Indonesian: Mengembalikan kunci Redis yang sesuai berdasarkan jenis permintaan dan pengenal pengguna.
   * @param {string} type - The type of request (e.g., registerEmail, registerOTP, etc.)
   * @param {string} identify - User's identifier (e.g., email).
   * @returns {string} - The Redis key.
   */
  getKey(type, identify) {
    const types = {
      // for register type
      registerEmail: `request_attempts_register_email:${identify}`,
      blockedRegisterEmail: `blocked_register_email:${identify}`,

      registerOTP: `request_attempts_register_otp:${identify}`,
      blockedRegisterOTP: `blocked_register_otp:${identify}`,

      // for login type
      loginEmail: `request_attempts_login_email:${identify}`,
      blockedLoginEmail: `blocked_login_email:${identify}`,

      loginOTP: `request_attempts_login_otp:${identify}`,
      blockedLoginOTP: `blocked_login_otp:${identify}`,

      // for remove device
      removeDeviceEmail: `request_attempts_remove_device_email:${identify}`,
      blockedRemoveDeviceEmail: `blocked_remove_device_email:${identify}`,

      removeDeviceOTP: `request_attempts_remove_device_otp:${identify}`,
      blockedRemoveDeviceOTP: `blocked_remove_device_otp:${identify}`,

      // for save otp
      otp: `otp:${identify}`,
    };
    return types[type];
  }

  /**
   * English: Records a request attempt, increments the counter, and ensures persistence of the counter key.
   * Indonesian: Mencatat upaya permintaan, meningkatkan penghitung, dan memastikan kunci penghitung tetap ada.
   * @param {string} identify - User's identifier.
   * @param {string} type - Type of request (e.g., registerEmail, registerOTP).
   * @returns {Promise<number>} - The number of recorded attempts.
   */
  async recordRequestAttempt(identify, type) {
    const keyId = this.getKey(type, identify);
    let attempts = await this.redisClient.incr(keyId);

    // English: If it's the first attempt, ensure the keyId is persistent.
    // Indonesian: Jika ini adalah upaya pertama, pastikan kunci tetap ada.
    if (attempts === 1) await this.redisClient.persist(keyId);

    return attempts;
  }

  /**
   * English: Checks if a user is currently blocked based on their block timestamp.
   * Indonesian: Memeriksa apakah pengguna saat ini diblokir berdasarkan cap waktu blokirnya.
   * @param {string} identify - User's identifier.
   * @param {string} type - Type of request (e.g., registerEmail, registerOTP).
   * @returns {Promise<boolean>} - True if the user is blocked, false otherwise.
   */
  async isBlocked(identify, type) {
    const keyId = this.getKey(type, identify);
    return !!(await this.redisClient.get(keyId));
  }

  /**
   * English: Determines the block duration based on the number of failed attempts.
   * Indonesian: Menentukan durasi blokir berdasarkan jumlah upaya yang gagal.
   * @param {number} [attempts=4] - The number of failed attempts.
   * @returns {number} - The block duration in seconds.
   */
  getBlockDuration(attempts = 4) {
    if (attempts <= 4) return 300; // 5 minutes
    if (attempts <= 8) return 900; // 15 minutes
    if (attempts <= 12) return 1800; // 30 minutes
    return 3600; // 1 hour
  }

  /**
   * English: Handles a request attempt, records it, and blocks the user if necessary.
   * Indonesian: Menangani upaya permintaan, mencatatnya, dan memblokir pengguna jika diperlukan.
   * @param {string} identify - User's identifier.
   * @param {string} typeAttempts - Type of request (e.g., registerEmail, registerOTP).
   * @param {string} typeBlocked - Type for blocked key (e.g., blockedRegisterEmail, blockedRegisterOTP).
   * @returns {Promise<Object>} - Status and message of the request handling process.
   */
  async handleRequestAttempt(identify, typeAttempts = "registerEmail", typeBlocked = "blockedRegisterEmail") {
    if (await this.isBlocked(identify, typeBlocked))
      return {
        status: false,
        message: "Too many request attempts. Please try again later.",
      };

    // Record the attempt and check if blocking is required
    const attempts = await this.recordRequestAttempt(identify, typeAttempts);

    // Block the user if attempts exceed the allowed limit
    if (attempts % 4 === 0) {
      const keyId = this.getKey(typeBlocked, identify);
      const blockDuration = this.getBlockDuration(attempts);
      const currentTime = Math.floor(Date.now() / 1000);

      await this.redisClient.set(keyId, currentTime, "EX", blockDuration);
      return {
        status: false,
        message: `Too many request attempts. Please try again in ${blockDuration / 60} minutes.`,
      };
    }
  }

  /**
   * English: Resets the request attempts after a successful login.
   * Indonesian: Mengatur ulang upaya permintaan setelah login berhasil.
   * @param {string} identify - User's identifier.
   * @param {string} typeAttempts - Type of request (e.g., registerEmail, registerOTP).
   * @param {string} typeBlocked - Type for blocked key (e.g., blockedRegisterEmail, blockedRegisterOTP).
   */
  async resetRequestAttempts(identify, typeAttempts = "registerEmail", typeBlocked = "blockedRegisterEmail") {
    await this.redisClient.del(this.getKey(typeAttempts, identify));
    await this.redisClient.del(this.getKey(typeBlocked, identify));
  }

  /**
   * English: Saves an OTP to Redis with a 5-minute expiry.
   * Indonesian: Menyimpan OTP ke Redis dengan masa berlaku 5 menit.
   * @param {string} email - User's email address.
   * @param {string} otp - The OTP to save.
   */
  async saveOtp(email, otp, type) {
    try {
      // Menyimpan OTP dan type dalam hash
      await this.redisClient.hset(`otp:${type}:${email}`, "otp", otp, "type", type);
      // Menetapkan kedaluwarsa (5 menit)
      await this.redisClient.expire(`otp:${type}:${email}`, 300);
      console.log("OTP saved!");
    } catch (err) {
      throw new Error("Error saving OTP to Redis:", err);
    }
  }

  /**
   * English: Verifies an OTP from Redis and deletes it if valid.
   * Indonesian: Memverifikasi OTP dari Redis dan menghapusnya jika valid.
   * @param {string} email - User's email address.
   * @param {string} otp - The OTP to verify.
   * @returns {Promise<boolean>} - True if the OTP is valid, false otherwise.
   */
  async verifyOtp(email, otp, type) {
    try {
      const otpData = await this.redisClient.hgetall(`otp:${type}:${email}`);

      if (!otpData || otpData.otp !== otp || otpData.type !== type) return { status: false, message: "Invalid OTP entered!", code: 401 };

      await this.redisClient.del(`otp:${type}:${email}`);
      return;
    } catch (err) {
      throw new Error("Error verifying OTP:", err);
    }
  }
}

export default new RedisConfig();
