/**
 * English: Imports the modules used
 * Indonesian: Mengimpor modul yang digunakan
 */
import jwt from "jsonwebtoken";
import envConfig from "./env.config.js";

/**
 * English: Class for handling JWT signing and verification.
 * Indonesian: Kelas untuk menangani penandatanganan dan verifikasi JWT.
 */
class JWTConfig {
  /**
   * English: Constructor to initialize JWT secret keys.
   * Indonesian: Konstruktor untuk menginisialisasi kunci rahasia JWT.
   */
  constructor() {
    /**
     * English: Secret key for signing access tokens.
     * Indonesian: Kunci rahasia untuk menandatangani token akses.
     */
    this.secretAccessKeyJWT = envConfig.get("secretAccessKeyJWT");

    /**
     * English: Secret key for signing refresh tokens.
     * Indonesian: Kunci rahasia untuk menandatangani token refresh.
     */
    this.secretRefreshKeyJWT = envConfig.get("secretRefreshKeyJWT");
  }

  /**
   * English: Signs an access JWT with the given payload.
   * Indonesian: Menandatangani JWT akses dengan payload yang diberikan.
   * @param {Object} payload - The payload data to embed in the token.
   * @returns {string} - The signed JWT.
   */
  signAccessJWT(payload) {
    return jwt.sign(payload, this.secretAccessKeyJWT, {
      expiresIn: "10m", // English: Token expires in 10 minutes. Indonesian: Token kedaluwarsa dalam 10 menit.
      algorithm: "HS512", // English: Hash algorithm used is HS512. Indonesian: Algoritma hash yang digunakan adalah HS512.
    });
  }

  /**
   * English: Verifies an access JWT token.
   * Indonesian: Memverifikasi token JWT akses.
   * @param {string} token - The JWT token to verify.
   * @returns {Object} - The decoded token payload if valid.
   * @throws {Error} - Throws an error if the token is invalid.
   */
  verifyAccessJWT(token) {
    try {
      return jwt.verify(token, this.secretAccessKeyJWT);
    } catch (error) {
      throw new Error("Invalid access token"); // English: Invalid token error. Indonesian: Kesalahan token tidak valid.
    }
  }

  /**
   * English: Signs a refresh JWT with the given payload.
   * Indonesian: Menandatangani JWT refresh dengan payload yang diberikan.
   * @param {Object} payload - The payload data to embed in the token.
   * @returns {string} - The signed JWT.
   */
  signRefreshJWT(payload) {
    return jwt.sign(payload, this.secretRefreshKeyJWT, {
      expiresIn: "1h", // English: Token expires in 1 hour. Indonesian: Token kedaluwarsa dalam 1 jam.
      algorithm: "HS512", // English: Hash algorithm used is HS512. Indonesian: Algoritma hash yang digunakan adalah HS512.
    });
  }

  /**
   * English: Verifies a refresh JWT token.
   * Indonesian: Memverifikasi token JWT refresh.
   * @param {string} token - The JWT token to verify.
   * @returns {Object} - The decoded token payload if valid.
   * @throws {Error} - Throws an error if the token is invalid.
   */
  verifyRefreshJWT(token) {
    try {
      return jwt.verify(token, this.secretRefreshKeyJWT);
    } catch (error) {
      throw new Error("Invalid refresh token"); // English: Invalid token error. Indonesian: Kesalahan token tidak valid.
    }
  }
}

/**
 * English: Export an instance of the JWTConfig class for global use.
 * Indonesian: Mengekspor instance dari kelas JWTConfig untuk penggunaan global.
 */
export default new JWTConfig();
