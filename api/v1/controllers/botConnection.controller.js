/**
 * English: imports the modules used
 * Indonesian: mengimpor modul yang digunakan
 */
import { Boom } from "@hapi/boom";
import { DisconnectReason } from "@whiskeysockets/baileys";

import { deleteAllFilesInDir, qrcode } from "../configs/server.config.js";
import { connectToWhatsApp, sock, session } from "./bot.controller.js";

/**
 * English: functions that will be used in the endpoint
 * Indonesian: fungsi-fungsi yang akan digunakan di endpoint
 */
let checkString = null,
  qrString = null;

const botConnection = async (update) => {
  const { connection, lastDisconnect, qr } = update;

  if (qr !== undefined) {
    checkString = "qrdone";
    qrString = qr;
    const data = await qrcode.toDataURL(qrString, {
      errorCorrectionLevel: "H",
    });
    console.log(data + "\n");
    // await deleteAllFilesInDir(`./${session}`);
    // const phoneNumber = "6285156277685"; // Static phone number
    // const code = await sock.requestPairingCode(phoneNumber); // Generate pairing code
    // console.log(`Pairing code for ${phoneNumber}: ${code}`);
  }

  if (connection === "close") {
    let reason = new Boom(lastDisconnect.error).output.statusCode;

    switch (reason) {
      case DisconnectReason.badSession:
        console.log(`Bad session file!. Process deleting file, restarting...`);
        await deleteAllFilesInDir(`./${session}`);
        connectToWhatsApp();
        break;
      case DisconnectReason.connectionClosed:
        console.log("Connection closed, reconnecting....");
        connectToWhatsApp();
        break;
      case DisconnectReason.connectionLost:
        console.log("Connection Lost from Server, reconnecting...");
        connectToWhatsApp();
        break;
      case DisconnectReason.connectionReplaced:
        console.log(
          "Connection Replaced, Another New Session Opened, Please Close Current Session First"
        );
        sock.logout();
        break;
      case DisconnectReason.loggedOut:
        console.log(`Device logged out!, Process deleting file, restarting...`);
        await deleteAllFilesInDir(`./${session}`);
        connectToWhatsApp();
        break;
      case DisconnectReason.restartRequired:
        console.log("Restart Required, restarting...");
        connectToWhatsApp();
        break;
      case DisconnectReason.timedOut:
        console.log("Connection TimedOut, reconnecting...");
        connectToWhatsApp();
        break;
      default:
        sock.end(`Unknown DisconnectReason: ${reason}|${lastDisconnect.error}`);
        break;
    }
  } else if (connection === "open") {
    console.log("opened connection");
    checkString = "qrconnected";
    qrString = null;
    return;
  }
};

export default botConnection;
export { checkString, qrString };
