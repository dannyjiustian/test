/**
 * English: imports the modules used
 * Indonesian: mengimpor modul yang digunakan
 */
import {
  serverExpress,
  portServerConfig,
} from "./api/v1/configs/server.config.js";
import route from "./api/v1/routes/routes.js";
import { connectToWhatsApp } from "./api/v1/controllers/bot.controller.js";

/**
 * English: configuration of modules used
 * Indonesian: konfigurasi modul yang dipakai
 */
serverExpress.use(route);

/**
 * English: call of whatsapp connection
 * Indonesian: panggil connection whatsapp
 */
connectToWhatsApp().catch((err) => console.log("unexpected error: " + err)); // catch any errors

serverExpress.listen(portServerConfig, () => {
  console.log(`Server runing on http://localhost:${portServerConfig}`);
});
