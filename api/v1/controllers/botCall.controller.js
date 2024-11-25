/**
 * English: imports the modules used
 * Indonesian: mengimpor modul yang digunakan
 */
import { sock } from "./bot.controller.js";

/**
 * English: functions that will be used in the endpoint
 * Indonesian: fungsi-fungsi yang akan digunakan di endpoint
 */
const botCall = async (call) => {
  await sock.rejectCall(call[0].id, call[0].from);
};

export default botCall;
