/**
 * English: imports the modules used
 * Indonesian: mengimpor modul yang digunakan
 */
import { delay } from "../configs/server.config.js";
import {
  responseServer200,
  responseServer500,
} from "../configs/response.config.js";
import { sock } from "./bot.controller.js";
import { validateSend } from "./validation.controller.js";

let response_error;

const send = async (req, res) => {
  response_error = {};
  const { error } = validateSend(req.body);
  if (error)
    error.details.forEach((err_msg) => {
      response_error[err_msg.path[0]] = err_msg.message;
    });
  if (Object.keys(response_error).length === 0) {
    try {
      const { to, message } = req.body;
      await delay(2500);
      await sock.sendMessage(`${to}@s.whatsapp.net`, {
        text: message,
      });
      // await sock.sendMessage(`${to}@s.whatsapp.net`, {
      //   image: {url: "https://images.tokopedia.net/img/cache/700/VqbcmM/2022/10/4/d62bafd6-ea56-459b-baee-c7ef33273e11.jpg"},
      //   caption: "caption",
      // });
      responseServer200(res, "Successfully Send Whishs");
    } catch (error) {
      return responseServer500(res, "Error Send Whishs", error.message);
    }
  } else {
    responseServer500(
      res,
      "Failed to process endpoint, check",
      JSON.parse(JSON.stringify(response_error).replace(/\\"/g, ""))
    );
  }
};

export default send;
