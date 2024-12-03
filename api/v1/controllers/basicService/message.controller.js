/**
 * English: Imports the modules used
 * Indonesian: Mengimpor modul yang digunakan
 */
import { PrismaClient } from "@prisma/client";
import validationController from "../validation.controller.js";
import handlerController from "../handler.controller.js";
import uuidHashConfig from "../../configs/uuidHash.config.js";
import queueConfig from "../../configs/queue.config.js";
import redisConfig from "../../configs/redis.config.js";

/**
 * English: Initialize Prisma client
 * Indonesian: Inisialisasi Prisma client
 */
const prisma = new PrismaClient();

/**
 * English: Functions that will be used in the endpoint
 * Indonesian: Fungsi-fungsi yang akan digunakan di endpoint
 */
const index = async (req, res) => {
  const { id_user } = req;
  try {
    const results = await prisma.messages.findMany({
      select: {
        id_message: true,
        phone_number: true,
        name: true,
        message: true,
        status: true,
      },
      where: {
        id_user,
      },
      orderBy: {
        created_at: "asc",
      },
    });

    if (results.length === 0)
      return handlerController.sendResponse({
        res,
        message: "The user doesn't have any data!",
        status: false,
        code: 404,
      });

    const transformedResults = results.map(({ id_message, phone_number, name, message, status }) => ({
      id_message: uuidHashConfig.encrypt(id_message),
      phone_number,
      name,
      message,
      status,
    }));

    return handlerController.sendResponse({
      res,
      message: "Get all messages successfully!",
      data: transformedResults,
    });
  } catch (error) {
    return handlerController.sendResponse({
      res,
      message: "An error occurred during get all messages.",
      status: false,
      data: error.message,
      code: 500,
    });
  }
};

const show = async (req, res) => {
  const { id_user } = req;
  const id_message = uuidHashConfig.decrypt(req.params.idMessage);
  try {
    const result = await prisma.messages.findFirst({
      select: {
        id_message: true,
        phone_number: true,
        name: true,
        message: true,
        status: true,
      },
      where: {
        id_user,
        id_message,
      },
    });

    if (!result)
      return handlerController.sendResponse({
        res,
        message: "Can't find the specific data message!",
        status: false,
        code: 404,
      });

    return handlerController.sendResponse({
      res,
      message: "Get message specific successfully!",
      data: {
        id_message: uuidHashConfig.encrypt(result.id_message),
        phone_number: result.phone_number,
        name: result.name,
        message: result.message,
        status: result.status,
      },
    });
  } catch (error) {
    return handlerController.sendResponse({
      res,
      message: "An error occurred during get message specific.",
      status: false,
      data: error.message,
      code: 500,
    });
  }
};

const destroy = async (req, res) => {
  const { id_user } = req;
  const id_message = uuidHashConfig.decrypt(req.params.idMessage);
  try {
    const destroyData = await prisma.messages.delete({
      select: {
        phone_number: true,
        name: true,
        message: true,
        status: true,
      },
      where: {
        id_user,
        id_message,
      },
    });

    return handlerController.sendResponse({
      res,
      message: "Delete Messsage Successfully!",
      data: { phone_number: destroyData.phone_number, name: destroyData.name, status: destroyData.status },
    });
  } catch (error) {
    if (error.code === "P2025")
      return handlerController.sendResponse({
        res,
        message: "Can't find the specific data message!",
        status: false,
        code: 404,
      });

    return handlerController.sendResponse({
      res,
      message: "An error occurred during delete message.",
      status: false,
      data: error.message,
      code: 500,
    });
  }
};

export default {
  index,
  show,
  destroy,
};
