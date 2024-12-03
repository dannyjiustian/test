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
    const results = await prisma.devices.findMany({
      select: {
        id_device: true,
        phone_number: true,
        name: true,
        desc: true,
        key: true,
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

    const transformedResults = results.map(({ id_device, phone_number, name, desc, key, status }) => ({
      id_device: uuidHashConfig.encrypt(id_device),
      phone_number,
      name,
      desc,
      key,
      status,
    }));

    return handlerController.sendResponse({
      res,
      message: "Get all devices successfully!",
      data: transformedResults,
    });
  } catch (error) {
    return handlerController.sendResponse({
      res,
      message: "An error occurred during get all devices.",
      status: false,
      data: error.message,
      code: 500,
    });
  }
};

const show = async (req, res) => {
  const { id_user } = req;
  const id_device = uuidHashConfig.decrypt(req.params.idDevice);
  try {
    const result = await prisma.devices.findFirst({
      select: {
        id_device: true,
        phone_number: true,
        name: true,
        desc: true,
        key: true,
        status: true,
      },
      where: {
        id_user,
        id_device,
      },
    });

    if (!result)
      return handlerController.sendResponse({
        res,
        message: "Can't find the specific data device!",
        status: false,
        code: 404,
      });

    return handlerController.sendResponse({
      res,
      message: "Get device specific successfully!",
      data: {
        id_device: uuidHashConfig.encrypt(result.id_device),
        phone_number: result.phone_number,
        name: result.name,
        desc: result.desc,
        key: result.key,
        status: result.status,
      },
    });
  } catch (error) {
    return handlerController.sendResponse({
      res,
      message: "An error occurred during get device specific.",
      status: false,
      data: error.message,
      code: 500,
    });
  }
};

const store = async (req, res) => {
  const validationErrors = handlerController.handleValidationError(validationController.device(req.body));
  if (Object.keys(validationErrors).length > 0)
    return handlerController.sendResponse({
      res,
      message: "Validation errors occurred.",
      data: validationErrors,
      status: false,
      code: 422,
    });

  const { id_user } = req;
  const { phone_number, name, desc } = req.body;
  try {
    const checkExistsDevice = await prisma.devices.count({
      where: {
        phone_number,
      },
    });

    if (checkExistsDevice > 0)
      return handlerController.sendResponse({
        res,
        message: "Phone number already registered at your account or another account, please use another number!",
        status: false,
        code: 409,
      });

    const key = await handlerController.generateRandomText("devices");
    const newDevice = await prisma.devices.create({
      select: {
        phone_number: true,
        name: true,
        desc: true,
        key: true,
        status: true,
      },
      data: {
        id_user,
        phone_number,
        name,
        desc,
        key,
        status: "disconnected",
      },
    });

    return handlerController.sendResponse({
      res,
      message: "Add new device successfully, please active device with linked device whatsapp!",
      data: {
        phone_number: newDevice.phone_number,
        name: newDevice.name,
        desc: newDevice.desc,
        key: newDevice.key,
        status: newDevice.status,
      },
    });
  } catch (error) {
    return handlerController.sendResponse({
      res,
      message: "An error occurred during add new device.",
      status: false,
      data: error.message,
      code: 500,
    });
  }
};

const update = async (req, res) => {
  const validationErrors = handlerController.handleValidationError(validationController.updateDevice(req.body));
  if (Object.keys(validationErrors).length > 0)
    return handlerController.sendResponse({
      res,
      message: "Validation errors occurred.",
      data: validationErrors,
      status: false,
      code: 422,
    });

  const { id_user } = req;
  const id_device = uuidHashConfig.decrypt(req.params.idDevice);
  const { name, desc } = req.body;

  try {
    const checkExistsDevice = await prisma.devices.count({
      where: {
        id_user,
        id_device,
      },
    });

    if (checkExistsDevice === 0)
      return handlerController.sendResponse({
        res,
        message: "Can't find the specific data device!",
        status: false,
        code: 404,
      });

    const updateDevice = await prisma.devices.update({
      select: {
        phone_number: true,
        name: true,
        desc: true,
      },
      data: {
        name,
        desc,
      },
      where: {
        id_user,
        id_device,
      },
    });

    return handlerController.sendResponse({
      res,
      message: "Update data device successful!",
      data: {
        phone_number: updateDevice.phone_number,
        name: updateDevice.name,
        desc: updateDevice.desc,
      },
    });
  } catch (error) {
    return handlerController.sendResponse({
      res,
      message: "An error occurred during update device.",
      status: false,
      data: error.message,
      code: 500,
    });
  }
};

const destroyRequest = async (req, res) => {
  const { id_user } = req;
  const id_device = uuidHashConfig.decrypt(req.params.idDevice);
  try {
    const result = await prisma.devices.findFirst({
      select: {
        user: {
          select: {
            email: true,
          },
        },
      },
      where: {
        id_user,
        id_device,
      },
    });

    if (!result)
      return handlerController.sendResponse({
        res,
        message: "Can't find the specific data device!",
        status: false,
        code: 404,
      });

    const checkAttempts = await redisConfig.handleRequestAttempt(result.user.email, "removeDeviceEmail", "blockedRemoveDeviceEmail");

    if (checkAttempts && !checkAttempts.status)
      return handlerController.sendResponse({
        res,
        message: checkAttempts.message,
        status: false,
        code: 429,
      });

    await queueConfig.queueEmailOTP(result.user.email, "removeDevice");
    return handlerController.sendResponse({
      res,
      message: "OTP sent to email successfully, please use OTP from email to delete the device!",
      data: { email: result.user.email },
    });
  } catch (error) {
    return handlerController.sendResponse({
      res,
      message: "An error occurred during checking and sending email for delete device.",
      status: false,
      data: error.message,
      code: 500,
    });
  }
};

const destroyConfirm = async (req, res) => {
  const validationErrors = handlerController.handleValidationError(validationController.onlyOTP(req.body));
  if (Object.keys(validationErrors).length > 0)
    return handlerController.sendResponse({
      res,
      message: "Validation errors occurred.",
      data: validationErrors,
      status: false,
      code: 422,
    });

  const { id_user } = req;
  const id_device = uuidHashConfig.decrypt(req.params.idDevice);
  const { otp } = req.body;
  try {
    const result = await prisma.devices.findFirst({
      select: {
        user: {
          select: {
            email: true,
          },
        },
      },
      where: {
        id_user,
        id_device,
      },
    });

    if (!result)
      return handlerController.sendResponse({
        res,
        message: "Can't find the specific data device!",
        status: false,
        code: 404,
      });

    const checkAttempts = await redisConfig.handleRequestAttempt(result.user.email, "removeDeviceOTP", "blockedRemoveDeviceOTP");

    if (checkAttempts && !checkAttempts.status)
      return handlerController.sendResponse({
        res,
        message: checkAttempts.message,
        status: false,
        code: 429,
      });

    const existingOTP = await redisConfig.verifyOtp(result.user.email, otp, "removeDevice");

    if (existingOTP && !existingOTP.status)
      return handlerController.sendResponse({
        res,
        message: existingOTP.message,
        status: false,
        data: existingOTP.data ?? [],
        code: existingOTP.code,
      });

    const destroyData = await prisma.devices.delete({
      select: {
        phone_number: true,
        name: true,
      },
      where: {
        id_device,
        id_user,
      },
    });

    await redisConfig.resetRequestAttempts(result.user.email, "removeDeviceEmail", "blockedRemoveDeviceEmail");
    await redisConfig.resetRequestAttempts(result.user.email, "removeDeviceOTP", "blockedRemoveDeviceOTP");

    return handlerController.sendResponse({
      res,
      message: "Delete device successfully!",
      data: {
        phone_number: destroyData.phone_number,
        name: destroyData.name,
      },
    });
  } catch (error) {
    return handlerController.sendResponse({
      res,
      message: "An error occurred during checking and sending email for delete device.",
      status: false,
      data: error.message,
      code: 500,
    });
  }
};

export default {
  index,
  show,
  store,
  update,
  destroyRequest,
  destroyConfirm,
};
