/**
 * English: Imports the modules used
 * Indonesian: Mengimpor modul yang digunakan
 */
import { PrismaClient } from "@prisma/client";

/**
 * English: Initialize Prisma client
 * Indonesian: Inisialisasi Prisma client
 */
const prisma = new PrismaClient();

/**
 * English: A class to manage server responses and validation errors
 * Indonesian: Sebuah kelas untuk mengelola respons server dan error validasi
 */
class HandlerController {
  /**
   * English: Format the response payload
   * Indonesian: Memformat payload respons
   */
  sendResponseFormat(message, data = null, status = true, code = 200) {
    const payload = { status, code, message };
    if (data && Object.keys(data).length > 0) {
      payload.data = data;
    }
    return payload;
  }

  /**
   * English: Send a structured JSON response
   * Indonesian: Mengirimkan respons JSON terstruktur
   */
  sendResponse({ res, message, data = null, status = true, code = 200 }) {
    res.status(code).json(this.sendResponseFormat(message, data, status, code));
  }

  /**
   * English: Handle validation errors and format them into a usable object
   * Indonesian: Menangani error validasi dan memformatnya menjadi objek yang dapat digunakan
   */
  handleValidationError(validationResult) {
    if (!validationResult.error) return {};
    return validationResult.error.details.reduce(
      (errors, { path, message }) => {
        errors[path[0]] = message.replace(/"/g, "");
        return errors;
      },
      {}
    );
  }

  async generateRandomText(type, length = 50) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const result = Array.from({ length: Math.min(length, 50) }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join("");
    const table = type === "users" ? prisma.users : prisma.devices;
    const keyExists = await table.findFirst({ where: { key: result } });
    return keyExists ? this.generateRandomText(type, length) : result;
  }
}

/**
 * English: Export the HandlerController class for use in other files
 * Indonesian: Mengekspor kelas HandlerController untuk digunakan di file lain
 */
export default new HandlerController();
