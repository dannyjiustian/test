/**
 * English: imports the modules used
 * Indonesian: mengimpor modul yang digunakan
 */
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import qrcode from "qrcode";
import pino from "pino";
import ControllerHandler from "../controllers/handler.controller.js";
import envConfig from "./env.config.js";

/**
 * English: read file enviroment
 * Indonesian: baca file enviroment
 */
const typeDevelop = envConfig.get("typeDevelop");

/**
 * English: add-on configuration
 * Indonesian: konfigurasi tambahan
 */

const corsServerConfig = {
  origin: typeDevelop === "production" ? envConfig.get("corsOriginServer") : "*",
};

const corsSocketConfig = {
  path: envConfig.get("pathSocket"),
  transports: ["websocket"],
  cors: {
    origin: typeDevelop === "production" ? envConfig.get("corsOriginSocket") : "*",
    credentials: true,
  },
};

/**
 * English: functions that will be used in the server
 * Indonesian: fungsi-fungsi yang akan digunakan di server
 */
const notFound = (req, res) => {
  return ControllerHandler.sendResponse({
    res,
    message: "Something wrong at url!, check again!",
    status: false,
    code: 500,
  });
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * English: configure express
 * Indonesian: konfigurasi express
 */
const serverExpress = express();

/**
 * English: configuration of modules used
 * Indonesian: konfigurasi modul yang dipakai
 */
serverExpress.use(cors(corsServerConfig));
serverExpress.use(bodyParser.json());
serverExpress.use(bodyParser.urlencoded({ extended: false }));
serverExpress.use(express.json());

/**
 * English: configure socket.io
 * Indonesian: konfigurasi socket.io
 */
const serverSocket = createServer(serverExpress);
const io = new Server(serverSocket, corsSocketConfig);

/**
 * English: export configuration
 * Indonesian: export konfigurasi
 */
export { express, serverExpress, serverSocket, io, pino, qrcode, notFound, delay };
