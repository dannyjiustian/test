/**
 * English: Imports the modules used
 * Indonesian: Mengimpor modul yang digunakan
 */
import { PrismaClient } from "@prisma/client";
import validationController from "../validation.controller.js";
import handlerController from "../handler.controller.js";
import uuidHashConfig from "../../configs/uuidHash.config.js";

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
    const results = await prisma.contacts.findMany({
      select: {
        id_contact: true,
        phone_number: true,
        name: true,
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

    const transformedResults = results.map(
      ({ id_contact, phone_number, name }) => ({
        id_contact: uuidHashConfig.encrypt(id_contact),
        phone_number,
        name,
      })
    );

    return handlerController.sendResponse({
      res,
      message: "Get all contacts successfully!",
      data: transformedResults,
    });
  } catch (error) {
    return handlerController.sendResponse({
      res,
      message: "An error occurred during get all contacts.",
      status: false,
      data: error.message,
      code: 500,
    });
  }
};

const show = async (req, res) => {
  const { id_user } = req;
  const id_contact = uuidHashConfig.decrypt(req.params.idContact);
  try {
    const result = await prisma.contacts.findFirst({
      select: {
        id_contact: true,
        phone_number: true,
        name: true,
      },
      where: {
        id_user,
        id_contact,
      },
    });

    if (!result)
      return handlerController.sendResponse({
        res,
        message: "Can't find the specific data contact!",
        status: false,
        code: 404,
      });

    return handlerController.sendResponse({
      res,
      message: "Get contact specific successfully!",
      data: {
        id_contact: uuidHashConfig.encrypt(result.id_contact),
        phone_number: result.phone_number,
        name: result.name,
      },
    });
  } catch (error) {
    return handlerController.sendResponse({
      res,
      message: "An error occurred during get contact specific.",
      status: false,
      data: error.message,
      code: 500,
    });
  }
};

const store = async (req, res) => {
  const validationErrors = handlerController.handleValidationError(
    validationController.contact(req.body)
  );
  if (Object.keys(validationErrors).length > 0)
    return handlerController.sendResponse({
      res,
      message: "Validation errors occurred.",
      data: validationErrors,
      status: false,
      code: 422,
    });

  const { id_user } = req;
  const { phone_number, name } = req.body;
  try {
    const checkExistsContact = await prisma.contacts.count({
      where: {
        id_user,
        phone_number,
      },
    });

    if (checkExistsContact > 0)
      return handlerController.sendResponse({
        res,
        message:
          "Phone number already registered at your account, please use another number!",
        status: false,
        code: 409,
      });

    const newContact = await prisma.contacts.create({
      select: {
        phone_number: true,
        name: true,
      },
      data: {
        id_user,
        phone_number,
        name,
      },
    });

    return handlerController.sendResponse({
      res,
      message: "Add new contact successfully!",
      data: {
        phone_number: newContact.phone_number,
        name: newContact.name,
      },
    });
  } catch (error) {
    return handlerController.sendResponse({
      res,
      message: "An error occurred during add new contact.",
      status: false,
      data: error.message,
      code: 500,
    });
  }
};

const update = async (req, res) => {
  const validationErrors = handlerController.handleValidationError(
    validationController.contact(req.body)
  );
  if (Object.keys(validationErrors).length > 0)
    return handlerController.sendResponse({
      res,
      message: "Validation errors occurred.",
      data: validationErrors,
      status: false,
      code: 422,
    });

  const { id_user } = req;
  const id_contact = uuidHashConfig.decrypt(req.params.idContact);
  const { phone_number, name } = req.body;

  try {
    const checkExistsContact = await prisma.contacts.count({
      where: {
        id_user,
        id_contact,
      },
    });

    if (checkExistsContact === 0)
      return handlerController.sendResponse({
        res,
        message: "Can't find the specific data contact!",
        status: false,
        code: 404,
      });

    const phoneConflict = await prisma.contacts.findFirst({
      where: {
        id_user,
        NOT: { id_contact },
        phone_number,
      },
    });

    if (phoneConflict)
      return handlerController.sendResponse({
        res,
        message: "Phone number already exists at your account!",
        status: false,
        code: 409, // Conflict
      });

    const updateContact = await prisma.contacts.update({
      select: {
        phone_number: true,
        name: true,
      },
      data: {
        phone_number,
        name,
      },
      where: {
        id_user,
        id_contact,
      },
    });

    return handlerController.sendResponse({
      res,
      message: "Update data contact successful!",
      data: {
        phone_number: updateContact.phone_number,
        name: updateContact.name,
      },
    });
  } catch (error) {
    return handlerController.sendResponse({
      res,
      message: "An error occurred during update contact.",
      status: false,
      data: error.message,
      code: 500,
    });
  }
};

const destroy = async (req, res) => {
  const { id_user } = req;
  const id_contact = uuidHashConfig.decrypt(req.params.idContact);
  try {
    const destroyData = await prisma.contacts.delete({
      select: {
        phone_number: true,
        name: true,
      },
      where: {
        id_user,
        id_contact,
      },
    });
    return handlerController.sendResponse({
      res,
      message: "Delete Contact Successfully!",
      data: { phone_number: destroyData.phone_number, name: destroyData.name },
    });
  } catch (error) {
    if (error.code === "P2025")
      return handlerController.sendResponse({
        res,
        message: "Can't find the specific data contact!",
        status: false,
        code: 404,
      });

    return handlerController.sendResponse({
      res,
      message: "An error occurred during delete contact.",
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
  destroy,
};
