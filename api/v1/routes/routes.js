/**
 * English: imports the modules used
 * Indonesian: mengimpor modul yang digunakan
 */
import envConfig from "../configs/env.config.js";
import { express, notFound } from "../configs/server.config.js";
import user from "../controllers/basicService/user.controller.js";
import device from "../controllers/basicService/device.controller.js";
import contact from "../controllers/basicService/contact.controller.js";
import whatsApp from "../controllers/coreService/whatsapp.controller.js";
import message from "../controllers/basicService/message.controller.js";
import verifyTokenController from "../middleware/verifyToken.controller.js";
import verifyApiController from "../middleware/verifyApi.controller.js";

/**
 * English: call the router function in express
 * Indonesian: panggil fungsi router yang ada di express
 */
const route = express.Router();

/**
 * English: defines the url endpoint that will be used
 * Indonesian: mendefinisikan endpoint url yang akan digunakan
 */
const apiVersion = `/${envConfig.get("apiVersion")}`;

/**
 * English: endpoint url for user
 * Indonesian: endpoint url untuk user
 */
route.post(`${apiVersion}/login`, user.login);
route.post(`${apiVersion}/login/account-validation`, user.loginValidation);
route.post(`${apiVersion}/register`, user.register);
route.post(`${apiVersion}/register/account-activation`, user.accountActivation);

/**
 * English: endpoint url for refresh token
 * Indonesian: endpoint url untuk refresh token
 */
route.get(`${apiVersion}/refresh-token`, verifyTokenController.checkVerifyRefresh, user.refreshToken);

/**
 * English: endpoint url for device
 * Indonesian: endpoint url untuk device
 */
route.get(`${apiVersion}/devices`, verifyTokenController.checkVerifyAccess, device.index);
route.get(`${apiVersion}/devices/:idDevice`, verifyTokenController.checkVerifyAccess, device.show);
route.post(`${apiVersion}/devices`, verifyTokenController.checkVerifyAccess, device.store);
route.put(`${apiVersion}/devices/:idDevice`, verifyTokenController.checkVerifyAccess, device.update);
route.delete(`${apiVersion}/devices/:idDevice`, verifyTokenController.checkVerifyAccess, device.destroyRequest);
route.delete(
  `${apiVersion}/devices/:idDevice/confirm`,
  verifyTokenController.checkVerifyAccess,
  device.destroyConfirm
);

/**
 * English: endpoint url for contact
 * Indonesian: endpoint url untuk contact
 */
route.get(`${apiVersion}/contacts`, verifyTokenController.checkVerifyAccess, contact.index);
route.get(`${apiVersion}/contacts/:idContact`, verifyTokenController.checkVerifyAccess, contact.show);
route.post(`${apiVersion}/contacts`, verifyTokenController.checkVerifyAccess, contact.store);
route.put(`${apiVersion}/contacts/:idContact`, verifyTokenController.checkVerifyAccess, contact.update);
route.delete(`${apiVersion}/contacts/:idContact`, verifyTokenController.checkVerifyAccess, contact.destroy);

/**
 * English: endpoint url for whatsapp
 * Indonesian: endpoint url untuk whatsapp
 */
route.post(`${apiVersion}/device/auth`, verifyTokenController.checkVerifyAccess, whatsApp.authentication);
route.delete(`${apiVersion}/device/logout/:idDevice`, verifyTokenController.checkVerifyAccess, whatsApp.logout);
route.post(`${apiVersion}/whatsapp/send-web`, verifyTokenController.checkVerifyAccess, whatsApp.sendWeb);
route.post(`${apiVersion}/whatsapp/send-api`, verifyApiController.checkVerifyApi, whatsApp.sendApi);

/**
 * English: endpoint url for message
 * Indonesian: endpoint url untuk message
 */
route.get(`${apiVersion}/messages`, verifyTokenController.checkVerifyAccess, message.index);
route.get(`${apiVersion}/messages/:idMessage`, verifyTokenController.checkVerifyAccess, message.show);
route.delete(`${apiVersion}/messages/:idMessage`, verifyTokenController.checkVerifyAccess, message.destroy);

/**
 * English: endpoint url for those not found
 * Indonesian: endpoint url untuk yang tidak ditemukan
 */
route.use("/", notFound);

/**
 * English: export route
 * Indonesian: export route
 */
export default route;
