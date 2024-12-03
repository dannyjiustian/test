/**
 * English: Imports the modules used
 * Indonesian: Mengimpor modul yang digunakan
 */
import { PrismaClient } from "@prisma/client";
import handlerController from "../controllers/handler.controller.js";

/**
 * English: Initialize Prisma client
 * Indonesian: Inisialisasi Prisma client
 */
const prisma = new PrismaClient();

/**
 * English: Controller class for verifying API keys
 * Indonesian: Kelas controller untuk memverifikasi API key
 */
class verifyApiController {
  /**
   * English: Middleware to check the validity of an API key
   * Indonesian: Middleware untuk memeriksa validitas API key
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async checkVerifyApi(req, res, next) {
    const apiKey = req.headers["device-api-key"]; // Retrieve API key from headers
    if (!apiKey)
      return handlerController.sendResponse({
        res,
        message: "Please enter api key device!", // Missing API key
        status: false,
        code: 401,
      });

    try {
      // Check API key existence and status in the database
      const checkApiKey = await prisma.devices.count({
        where: {
          key: apiKey,
          status: "connected",
        },
      });

      // If API key not found or status is not 'connected'
      if (checkApiKey === 0)
        return handlerController.sendResponse({
          res,
          message: "API key device not found, please another api key device with status connected!",
          status: false,
          code: 404,
        });

      req.key = apiKey; // Attach API key to request object
      next(); // Proceed to the next middleware
    } catch (error) {
      return handlerController.sendResponse({
        res,
        message: "An error occurred during check API key.", // Handle server errors
        status: false,
        data: error.message,
        code: 500,
      });
    }
  }
}

/**
 * English: Export class instance
 * Indonesian: Ekspor instance kelas
 */
export default new verifyApiController();
