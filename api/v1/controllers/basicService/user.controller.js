/**
 * English: Imports the modules used
 * Indonesian: Mengimpor modul yang digunakan
 */
import { PrismaClient } from "@prisma/client";
import validationController from "../validation.controller.js";
import jwtConfig from "../../configs/jwt.config.js";
import bcryptConfig from "../../configs/bcrypt.config.js";
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
const login = async (req, res) => {
  const validationErrors = handlerController.handleValidationError(validationController.userLogin(req.body));
  if (Object.keys(validationErrors).length > 0)
    return handlerController.sendResponse({
      res,
      message: "Validation errors occurred.",
      data: validationErrors,
      status: false,
      code: 422,
    });

  const { identity, password } = req.body;
  try {
    const user = await prisma.users.findFirst({
      where: {
        OR: [{ username: identity }, { email: identity }],
      },
    });

    if (!user)
      return handlerController.sendResponse({
        res,
        message: "Invalid username or password!",
        status: false,
        code: 401,
      });

    const checkAttempts = await redisConfig.handleRequestAttempt(user.email, "loginEmail", "blockedLoginEmail");

    if (checkAttempts && !checkAttempts.status)
      return handlerController.sendResponse({
        res,
        message: checkAttempts.message,
        status: false,
        code: 429,
      });

    if (!(await bcryptConfig.verify(password, user.password)))
      return handlerController.sendResponse({
        res,
        message: "Invalid username or password!",
        status: false,
        code: 401,
      });

    await queueConfig.queueEmailOTP(user.email, "login");
    return handlerController.sendResponse({
      res,
      message: "Login successfully, please validation login via OTP from email!",
      data: { email: user.email },
    });
  } catch (error) {
    return handlerController.sendResponse({
      res,
      message: "An error occurred during login.",
      status: false,
      data: error.message,
      code: 500,
    });
  }
};

const loginValidation = async (req, res) => {
  const validationErrors = handlerController.handleValidationError(validationController.userLoginValidation(req.body));
  if (Object.keys(validationErrors).length > 0)
    return handlerController.sendResponse({
      res,
      message: "Validation errors occurred.",
      data: validationErrors,
      status: false,
      code: 422,
    });

  const { identity, password, otp } = req.body;
  try {
    const user = await prisma.users.findFirst({
      where: {
        OR: [{ username: identity }, { email: identity }],
      },
    });

    if (!user && !(await bcryptConfig.verify(password, user ? user.password : "")))
      return handlerController.sendResponse({
        res,
        message: "Invalid OTP entered!",
        status: false,
        code: 401,
      });

    const checkAttempts = await redisConfig.handleRequestAttempt(user.email, "loginOTP", "blockedLoginOTP");
    if (checkAttempts && !checkAttempts.status)
      return handlerController.sendResponse({
        res,
        message: checkAttempts.message,
        status: false,
        code: 429,
      });

    const existingOTP = await redisConfig.verifyOtp(user.email, otp, "login");

    if (existingOTP && !existingOTP.status)
      return handlerController.sendResponse({
        res,
        message: existingOTP.message,
        status: false,
        data: existingOTP.data ?? [],
        code: existingOTP.code,
      });

    const accessToken = jwtConfig.signAccessJWT({
      identity: uuidHashConfig.encrypt(user.id_user),
    });
    const refreshToken = jwtConfig.signRefreshJWT({
      identity: uuidHashConfig.encrypt(user.id_user),
    });

    await redisConfig.resetRequestAttempts(user.email, "loginEmail", "blockedLoginEmail");
    await redisConfig.resetRequestAttempts(user.email, "loginOTP", "blockedLoginOTP");

    return handlerController.sendResponse({
      res,
      message: "Login successfully!",
      data: {
        username: user.username,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    return handlerController.sendResponse({
      res,
      message: "An error occurred during validation otp.",
      status: false,
      data: error.message,
      code: 500,
    });
  }
};

const register = async (req, res) => {
  const validationErrors = handlerController.handleValidationError(validationController.userRegister(req.body));
  if (Object.keys(validationErrors).length > 0)
    return handlerController.sendResponse({
      res,
      message: "Validation errors occurred.",
      data: validationErrors,
      status: false,
      code: 422,
    });

  const { email, name, username, password } = req.body;

  try {
    const checkAttempts = await redisConfig.handleRequestAttempt(email);
    if (checkAttempts && !checkAttempts.status)
      return handlerController.sendResponse({
        res,
        message: checkAttempts.message,
        status: false,
        code: 429,
      });

    const existingUser = await prisma.users.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });
    if (existingUser) {
      if (existingUser.is_active) {
        await redisConfig.resetRequestAttempts(email);
        return handlerController.sendResponse({
          res,
          message: "Username or Email is already taken.",
          status: false,
          code: 409,
        });
      }

      const key = await handlerController.generateRandomText("users");
      const hashedPassword = bcryptConfig.hash(password);
      const updateUser = await prisma.users.update({
        data: {
          email,
          name,
          username,
          password: hashedPassword,
          key,
        },
        where: {
          id_user: existingUser.id_user,
        },
      });
      await queueConfig.queueEmailOTP(updateUser.email, "register");
      return handlerController.sendResponse({
        res,
        message: "Registration successfully, please active account via OTP from email!",
        data: { username: updateUser.username, email: updateUser.email },
      });
    }

    const key = await handlerController.generateRandomText("users");
    const hashedPassword = bcryptConfig.hash(password);
    const newUser = await prisma.users.create({
      data: {
        email,
        name,
        username,
        password: hashedPassword,
        key,
      },
    });

    await queueConfig.queueEmailOTP(newUser.email, "register");
    return handlerController.sendResponse({
      res,
      message: "Registration successfully, please active account via OTP from email!",
      data: { username: newUser.username, email: newUser.email },
    });
  } catch (error) {
    return handlerController.sendResponse({
      res,
      message: "An error occurred during registration.",
      status: false,
      data: error.message,
      code: 500,
    });
  }
};

const accountActivation = async (req, res) => {
  const validationErrors = handlerController.handleValidationError(validationController.userRegisterActivation(req.body));
  if (Object.keys(validationErrors).length > 0)
    return handlerController.sendResponse({
      res,
      message: "Validation errors occurred.",
      data: validationErrors,
      status: false,
      code: 422,
    });

  const { email, otp } = req.body;

  try {
    const checkAttempts = await redisConfig.handleRequestAttempt(email, "registerOTP", "blockedRegisterOTP");
    if (checkAttempts && !checkAttempts.status)
      return handlerController.sendResponse({
        res,
        message: checkAttempts.message,
        status: false,
        code: 429,
      });

    const existingOTP = await redisConfig.verifyOtp(email, otp, "register");

    if (existingOTP && !existingOTP.status)
      return handlerController.sendResponse({
        res,
        message: existingOTP.message,
        status: false,
        data: existingOTP.data ?? [],
        code: existingOTP.code,
      });

    await prisma.users.update({
      data: {
        is_active: true,
        is_verify: true,
      },
      where: {
        email,
        is_active: false,
      },
    });

    await redisConfig.resetRequestAttempts(email);
    await redisConfig.resetRequestAttempts(email, "registerOTP", "blockedRegisterOTP");

    return handlerController.sendResponse({
      res,
      message: "Your account activation has been successfully, please login!",
      data: { email },
    });
  } catch (error) {
    return handlerController.sendResponse({
      res,
      message: "An error occurred during account activation.",
      status: false,
      data: error.message,
      code: 500,
    });
  }
};

const refreshToken = async (req, res) => {
  const { id_user } = req;
  try {
    const user = await prisma.users.findUnique({ where: { id_user } });

    if (!user)
      return handlerController.sendResponse({
        res,
        message: "User not found. Unable to refresh token.",
        status: false,
        code: 404,
      });

    const accessToken = jwtConfig.signAccessJWT({
      identity: uuidHashConfig.encrypt(user.id_user),
    });
    const refreshToken = jwtConfig.signRefreshJWT({
      identity: uuidHashConfig.encrypt(user.id_user),
    });

    return handlerController.sendResponse({
      res,
      message: "Token refreshed successfully.",
      data: { accessToken, refreshToken },
    });
  } catch (error) {
    return handlerController.sendResponse({
      res,
      message: "An error occurred while refreshing the token.",
      status: false,
      data: error.message,
      code: 500,
    });
  }
};

export default {
  login,
  loginValidation,
  register,
  accountActivation,
  refreshToken,
};
