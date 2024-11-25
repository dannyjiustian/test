/**
 * English: imports the modules used
 * Indonesian: mengimpor modul yang digunakan
 */
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import qrcode from "qrcode";
import pino from "pino";
import { responseServer500 } from "./response.config.js";

/**
 * English: configure read env
 * Indonesian: konfigurasi baca env
 */
dotenv.config();

/**
 * English: read file enviroment for url
 * Indonesian: baca file enviroment untuk url
 */
const typeDevelop = process.env.APP_LOCAL || "local";
const corsOriginServer = process.env.CORS_SERVER_PRODUCTION || "*";
const baseURL = process.env.BASE_URL_API_VERSION || "v1";

/**
 * English: add-on configuration
 * Indonesian: konfigurasi tambahan
 */
const portServerConfig = process.env.PORT_SERVER || 3000;

const corsServerConfig = {
  origin: typeDevelop === "production" ? corsOriginServer : "*",
};

/**
 * English: functions that will be used in the server
 * Indonesian: fungsi-fungsi yang akan digunakan di server
 */
const notFound = (req, res) => {
  return responseServer500(res, "Something Wrong!, Check Again!");
};

const deleteAllFilesInDir = async (dirPath) => {
  try {
    const files = await fs.promises.readdir(dirPath);
    const deleteFilePromises = files.map((file) =>
      fs.promises.unlink(path.join(dirPath, file))
    );
    await Promise.all(deleteFilePromises);
  } catch (err) {
    console.log(err);
  }
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
 * English: export configuration
 * Indonesian: export konfigurasi
 */
export {
  express,
  serverExpress,
  cors,
  bodyParser,
  pino,
  qrcode,
  baseURL,
  portServerConfig,
  corsServerConfig,
  notFound,
  fs,
  deleteAllFilesInDir,
  delay,
};
