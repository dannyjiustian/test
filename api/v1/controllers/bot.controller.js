/**
 * English: imports the modules used
 * Indonesian: mengimpor modul yang digunakan
 */
import {
  makeInMemoryStore,
  useMultiFileAuthState,
  downloadMediaMessage,
} from "@whiskeysockets/baileys";
import { pino } from "../configs/server.config.js";
import botSocket from "../configs/bot.config.js";
import botConnection, {
  checkString,
  qrString,
} from "./botConnection.controller.js";
import botCall from "./botCall.controller.js";
import botPrompt from "./botPrompt.controller.js";

/**
 * English: functions that will be used in the endpoint
 * Indonesian: fungsi-fungsi yang akan digunakan di endpoint
 */
const { session } = { session: "wa_data/auth_info_wa" };
const store = makeInMemoryStore({
  logger: pino().child({ level: "silent", stream: "store" }),
});

let sock;

const connectToWhatsApp = async () => {
  const { state, saveCreds } = await useMultiFileAuthState(session);
  sock = botSocket(state);
  store.bind(sock.ev);
  sock.multi = true;
  sock.ev.on("connection.update", botConnection);
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("call", botCall);
  sock.ev.on("messages.upsert", botPrompt);
};

export {
  connectToWhatsApp,
  checkString,
  qrString,
  sock,
  session,
  downloadMediaMessage,
};
