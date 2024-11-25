/**
 * English: imports the modules used
 * Indonesian: mengimpor modul yang digunakan
 */
import { delay } from "../configs/server.config.js";
import { sock } from "./bot.controller.js";

/**
 * English: functions that will be used in the endpoint
 * Indonesian: fungsi-fungsi yang akan digunakan di endpoint
 */

const sendMessageWithoutQuoted = async (no, text) => {
  await delay(2500);
  await sock.sendMessage(no, { text: text });
};

const botPrompt = async ({ messages, type }) => {
  // if (type === "notify" && !messages[0].key.fromMe) {
  //   const noWa = messages[0].key.remoteJid;
  //   console.log(noWa);
  //   await delay(2500);
  //   await sock.readMessages([messages[0].key]);
  //   if (typeof messages[0].key.participant === "undefined") {
  //     await sendMessageWithoutQuoted(noWa, "Test");
  //   }
  // }
};

export default botPrompt;
