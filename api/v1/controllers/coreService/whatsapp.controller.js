/**
 * English: Imports the modules used
 * Indonesian: Mengimpor modul yang digunakan
 */
import validationController from "../validation.controller.js";
import handlerController from "../handler.controller.js";
import uuidHashConfig from "../../configs/uuidHash.config.js";
import whatsAppService from "../coreWhatsApp/whatsAppService.controller.js";
import { PrismaClient } from "@prisma/client";

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

    const session = whatsAppService.getSession(idDevice);

    const checkNumber = await whatsAppService.checkNumber(session, to_number);
    if (!checkNumber)
      return handlerController.sendResponse({
        res,
        message: "Number WhatsApp does not exist!",
        status: false,
        code: 404,
      });

    const result = await session.sendMessage(checkNumber, { text: message });

    // need save message to db for via web only
    const findName = await prisma.contacts.findFirst({
      select: {
        name: true,
      },
      where: {
        phone_number: to_number,
        id_user,
      },
    });

    const saveMessage = await prisma.messages.create({
      select: {
        id_send: true,
        phone_number: true,
        name: true,
        message: true,
        status: true,
      },
      data: {
        id_device: idDevice,
        id_user,
        id_send: result.key.id,
        phone_number: to_number,
        name: findName ? findName.name : null,
        message,
        status: "pending",
      },
    });

    return handlerController.sendResponse({
      res,
      message: "Successful send message!",
      data: {
        id_send: saveMessage.id_send,
        phone_number: saveMessage.phone_number,
        name: saveMessage.name,
        message: saveMessage.message,
        status: saveMessage.status,
      },
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

    const session = whatsAppService.getSession(result.id_device);

    const checkNumber = await whatsAppService.checkNumber(session, to_number);
    if (!checkNumber)
      return handlerController.sendResponse({
        res,
        message: "Number WhatsApp does not exist!",
        status: false,
        code: 404,
      });

    await session.sendMessage(checkNumber, { text: message });

    return handlerController.sendResponse({
      res,
      message: "Successful send message!",
      data: { to_number, message },
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

export default { authentication, logout, sendWeb, sendApi };
