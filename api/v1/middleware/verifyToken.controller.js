/**
 * English: Imports the modules used
 * Indonesian: Mengimpor modul yang digunakan
 */
import jwtConfig from "../configs/jwt.config.js";
import uuidHashConfig from "../configs/uuidHash.config.js";
import handlerController from "../controllers/handler.controller.js";

/**
 * English: Controller for verifying tokens
 * Indonesian: Controller untuk memverifikasi token
 */
class VerifyTokenController {
  /**
   * English: Verifies the refresh token
   * Indonesian: Memverifikasi token refresh
   * @param {object} req - The HTTP request object
   * @param {object} res - The HTTP response object
   * @param {function} next - The next middleware function
   */
  checkVerifyRefresh(req, res, next) {
    const bearer = req.headers.authorization;
    if (!bearer)
      return handlerController.sendResponse({
        res,
        message: "Please enter bearer authentication!",
        status: false,
        code: 401,
      });

    const token = bearer.split(" ")[1];
    try {
      const verif = jwtConfig.verifyRefreshJWT(token);
      req.id_user = uuidHashConfig.decrypt(verif.identity); // Decrypts the user ID
      next();
    } catch (error) {
      handlerController.sendResponse({
        res,
        message: "Access token verification failed!",
        data: Object.keys(error).length > 0 ? error : error.message, // Detailed error message
        status: false,
        code: 403,
      });
    }
  }

  /**
   * English: Verifies the access token
   * Indonesian: Memverifikasi token akses
   * @param {object} req - The HTTP request object
   * @param {object} res - The HTTP response object
   * @param {function} next - The next middleware function
   */
  checkVerifyAccess(req, res, next) {
    const bearer = req.headers.authorization;
    if (!bearer)
      return handlerController.sendResponse({
        res,
        message: "Please enter bearer authentication!",
        status: false,
        code: 401,
      });

    const token = bearer.split(" ")[1];
    try {
      const verif = jwtConfig.verifyAccessJWT(token);
      req.id_user = uuidHashConfig.decrypt(verif.identity); // Decrypts the user ID
      next();
    } catch (error) {
      handlerController.sendResponse({
        res,
        message: "Access token verification failed!",
        data: Object.keys(error).length > 0 ? error : error.message, // Detailed error message
        status: false,
        code: 403,
      });
    }
  }
}

/**
 * English: Export the VerifyTokenController class
 * Indonesian: Mengekspor kelas VerifyTokenController
 */
export default new VerifyTokenController();
