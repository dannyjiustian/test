/**
 * English: imports the modules used
 * Indonesian: mengimpor modul yang digunakan
 */
import { express, baseURL, notFound } from "../configs/server.config.js";
import send from "../controllers/send.controller.js";

/**
 * English: call the router function in express
 * Indonesian: panggil fungsi router yang ada di express
 */
const route = express.Router();

/**
 * English: defines the url endpoint that will be used
 * Indonesian: mendefinisikan endpoint url yang akan digunakan
 */
const basicURI = `/${baseURL}`;

/**
 * English: endpoint url
 * Indonesian: endpoint url
 */
route.post(`${basicURI}/send-whish-wedding`, send);

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
