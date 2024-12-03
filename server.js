/**
 * English: imports the modules used
 * Indonesian: mengimpor modul yang digunakan
 */
import { serverExpress, serverSocket } from "./api/v1/configs/server.config.js";
import route from "./api/v1/routes/routes.js";
import envConfig from "./api/v1/configs/env.config.js";
import queueConfig from "./api/v1/configs/queue.config.js";
import ioConfig from "./api/v1/configs/io.config.js";

queueConfig.configureQueueListeners();

/**
 * English: configuration of modules used
 * Indonesian: konfigurasi modul yang dipakai
 */
serverExpress.use(route);

/**
 * English: call of socket.io connection
 * Indonesian: panggil connection socket.io
 */
ioConfig.initialize();

/**
 * English: call of whatsapp connection
 * Indonesian: panggil connection whatsapp
 */
const portServerConfig = envConfig.get("portServerConfig");
serverSocket.listen(portServerConfig, () => {
  console.log(`Server runing on http://localhost:${portServerConfig}`);
  console.log(`Websocket runing on http://localhost:${portServerConfig}`);
});
