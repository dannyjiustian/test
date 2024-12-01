/**
 * English: imports the modules used
 * Indonesian: mengimpor modul yang digunakan
 */
import envConfig from "../configs/env.config.js";
import { express, notFound } from "../configs/server.config.js";
import user from "../controllers/basicService/user.controller.js";
import devices from "../controllers/basicService/device.controller.js";
import contacts from "../controllers/basicService/contact.controller.js";
import verifyTokenController from "../middleware/verifyToken.controller.js";

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
route.get(`${apiVersion}/refresh-token`, verifyTokenController.checkVerifRefresh, user.refreshToken);

/**
 * English: endpoint url for device
 * Indonesian: endpoint url untuk device
 */
route.get(`${apiVersion}/devices`, verifyTokenController.checkVerif, devices.index);
route.get(`${apiVersion}/devices/:idDevice`, verifyTokenController.checkVerif, devices.show);
route.post(`${apiVersion}/devices`, verifyTokenController.checkVerif, devices.store);
route.put(`${apiVersion}/devices/:idDevice`, verifyTokenController.checkVerif, devices.update);
route.delete(`${apiVersion}/devices/:idDevice`, verifyTokenController.checkVerif, devices.destroyRequest);
route.delete(`${apiVersion}/devices/:idDevice/confirm`, verifyTokenController.checkVerif, devices.destroyConfirm);

/**
 * English: endpoint url for contact
 * Indonesian: endpoint url untuk contact
 */
route.get(`${apiVersion}/contacts`, verifyTokenController.checkVerif, contacts.index);
route.get(`${apiVersion}/contacts/:idContact`, verifyTokenController.checkVerif, contacts.show);
route.post(`${apiVersion}/contacts`, verifyTokenController.checkVerif, contacts.store);
route.put(`${apiVersion}/contacts/:idContact`, verifyTokenController.checkVerif, contacts.update);
route.delete(`${apiVersion}/contacts/:idContact`, verifyTokenController.checkVerif, contacts.destroy);

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
