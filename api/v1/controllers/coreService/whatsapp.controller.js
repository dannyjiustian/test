/**
 * English: Imports the modules used
 * Indonesian: Mengimpor modul yang digunakan
 */
import validationController from "../validation.controller.js";
import handlerController from "../handler.controller.js";
import uuidHashConfig from "../../configs/uuidHash.config.js";
import whatsAppService from "../coreWhatsApp/whatsAppService.controller.js";
import { PrismaClient } from "@prisma/client";
import queueConfig from "../../configs/queue.config.js";

/**
 * English: Initialize Prisma client
 * Indonesian: Inisialisasi Prisma client
 */
const prisma = new PrismaClient();

/**
 * English: Functions that will be used in the endpoint
 * Indonesian: Fungsi-fungsi yang akan digunakan di endpoint
 */
const authentication = async (req, res) => {
  const validationErrors = handlerController.handleValidationError(validationController.authWhatsApp(req.body));
  if (Object.keys(validationErrors).length > 0)
    return handlerController.sendResponse({
      res,
      message: "Validation errors occurred.",
      data: validationErrors,
      status: false,
      code: 422,
    });

  const { id_user } = req;
  const { id_device, use_number } = req.body;

  const idDevice = uuidHashConfig.decrypt(id_device);

  let result;
  if (use_number) {
    try {
      result = await prisma.devices.findFirst({
        select: {
          phone_number: true,
        },
        where: {
          id_user,
          id_device: idDevice,
        },
      });
    } catch (error) {
      return handlerController.sendResponse({
        res,
        message: "An error occurred during get phone number device.",
        status: false,
        data: error.message,
        code: 500,
      });
    }
  }

  if (whatsAppService.sessionExists(idDevice))
    return handlerController.sendResponse({
      res,
      message: "The account already connected!",
      status: false,
      code: 409,
    });

  whatsAppService.createSession({
    res,
    id_device: idDevice,
    use_number,
    number: result ? result.phone_number : null,
  });
};

const logout = async (req, res) => {
  const id_device = uuidHashConfig.decrypt(req.params.idDevice);

  if (!whatsAppService.sessionExists(id_device))
    return handlerController.sendResponse({
      res,
      message: "The account not connected!",
      status: false,
      code: 409,
    });

  whatsAppService.deleteSession(id_device);

  return handlerController.sendResponse({
    res,
    message: "The device has been logged out!",
  });
};

// await sock.sendMessage(`${to}@s.whatsapp.net`, {
//   image: {url: "https://images.tokopedia.net/img/cache/700/VqbcmM/2022/10/4/d62bafd6-ea56-459b-baee-c7ef33273e11.jpg"},
//   caption: "caption",
// });

const sendWeb = async (req, res) => {
  const validationErrors = handlerController.handleValidationError(validationController.sendWhatsAppWeb(req.body));
  if (Object.keys(validationErrors).length > 0)
    return handlerController.sendResponse({
      res,
      message: "Validation errors occurred.",
      data: validationErrors,
      status: false,
      code: 422,
    });

  const { id_user } = req;
  const { id_device, to_number, message } = req.body;
  const idDevice = uuidHashConfig.decrypt(id_device);

  try {
    const checkDevice = await prisma.devices.count({
      where: {
        id_device: idDevice,
        status: "connected",
        id_user,
      },
    });

    if (checkDevice === 0)
      return handlerController.sendResponse({
        res,
        message: "Device does not exist!",
        status: false,
        code: 404,
      });

    // Enqueue messages
    await queueConfig.queueWhatsAppMessage({
      sessionId: idDevice,
      to_number,
      message,
      idDevice,
      id_user,
      useWeb: true,
    });

    return handlerController.sendResponse({
      res,
      message: "Message queued for processing.",
    });
  } catch (error) {
    return handlerController.sendResponse({
      res,
      message: "An error occured during message send web.",
      data: error.message,
      status: false,
      code: 500,
    });
  }
};

const sendBulkWeb = async (req, res) => {
  const validationErrors = handlerController.handleValidationError(validationController.sendWhatsAppBulkWeb(req.body));
  if (Object.keys(validationErrors).length > 0)
    return handlerController.sendResponse({
      res,
      message: "Validation errors occurred.",
      data: validationErrors,
      status: false,
      code: 422,
    });

  const { id_user } = req;
  const { id_device, delay_per_number, message, numbers } = req.body;
  const idDevice = uuidHashConfig.decrypt(id_device);

  try {
    const checkDevice = await prisma.devices.count({
      where: {
        id_device: idDevice,
        status: "connected",
        id_user,
      },
    });

    if (checkDevice === 0)
      return handlerController.sendResponse({
        res,
        message: "Device does not exist!",
        status: false,
        code: 404,
      });

    // Enqueue messages
    numbers.forEach(async (to_number, index) => {
      const delay = index * delay_per_number; // Calculate delay for this number
      await queueConfig.queueWhatsAppBulkMessage(
        {
          sessionId: idDevice,
          to_number,
          message,
          idDevice,
          id_user,
          useWeb: true,
        },
        delay
      ); // Pass the calculated delay to the job
    });

    return handlerController.sendResponse({
      res,
      message: "Bulk Messages queued for processing.",
    });
  } catch (error) {
    return handlerController.sendResponse({
      res,
      message: "An error occured during message send web.",
      data: error.message,
      status: false,
      code: 500,
    });
  }
};

const sendApi = async (req, res) => {
  const validationErrors = handlerController.handleValidationError(validationController.sendWhatsAppAPI(req.body));
  if (Object.keys(validationErrors).length > 0)
    return handlerController.sendResponse({
      res,
      message: "Validation errors occurred.",
      data: validationErrors,
      status: false,
      code: 422,
    });

  const { key } = req;
  const { to_number, message } = req.body;

  try {
    const result = await prisma.devices.findFirst({
      select: { id_device: true },
      where: { key },
    });

    // Enqueue messages
    await queueConfig.queueWhatsAppMessage({
      sessionId: result.id_device,
      to_number,
      message,
      useWeb: false,
    });

    return handlerController.sendResponse({
      res,
      message: "Message queued for processing.",
    });
  } catch (error) {
    return handlerController.sendResponse({
      res,
      message: "An error occured during message send api.",
      data: error.message,
      status: false,
      code: 500,
    });
  }
};

const sendBulkApi = async (req, res) => {
  const validationErrors = handlerController.handleValidationError(validationController.sendWhatsAppBulkAPI(req.body));
  if (Object.keys(validationErrors).length > 0)
    return handlerController.sendResponse({
      res,
      message: "Validation errors occurred.",
      data: validationErrors,
      status: false,
      code: 422,
    });

  const { key } = req;
  const { delay_per_number, message, numbers } = req.body;

  try {
    const result = await prisma.devices.findFirst({
      select: { id_device: true },
      where: { key },
    });

    // Enqueue messages
    numbers.forEach(async (to_number, index) => {
      const delay = index * delay_per_number; // Calculate delay for this number
      await queueConfig.queueWhatsAppBulkMessage(
        {
          sessionId: result.id_device,
          to_number,
          message,
          useWeb: false,
        },
        delay
      ); // Pass the calculated delay to the job
    });

    return handlerController.sendResponse({
      res,
      message: "Bulk Messages queued for processing.",
    });
  } catch (error) {
    return handlerController.sendResponse({
      res,
      message: "An error occured during message send web.",
      data: error.message,
      status: false,
      code: 500,
    });
  }
};

export default { authentication, logout, sendWeb, sendBulkWeb, sendApi, sendBulkApi };
