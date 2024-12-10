/**
 * English: Imports the modules used
 * Indonesian: Mengimpor modul yang digunakan
 */
import makeWASocket, { Browsers, DisconnectReason, isJidBroadcast } from "@whiskeysockets/baileys";
import { pino, qrcode } from "../../configs/server.config.js";
import { PrismaClient } from "@prisma/client";
import handlerController from "../handler.controller.js";
import uuidHashConfig from "../../configs/uuidHash.config.js";
import usePostgresqlAuthState from "./usePostgresqlAuthState.js";
import ioConfig from "../../configs/io.config.js";
import queueConfig from "../../configs/queue.config.js";

const prisma = new PrismaClient();

/**
 * English: Service for managing WhatsApp sessions.
 * Indonesian: Layanan untuk mengelola sesi WhatsApp.
 */
class WhatsAppService {
  constructor() {
    this.sessions = new Map(); // Map for storing active sessions
    this.retries = new Map(); // Map for tracking reconnection attempts
    this.init(); // Initialize service
  }

  /**
   * English: Initializes the service by loading stored sessions from the database.
   * Indonesian: Menginisialisasi layanan dengan memuat sesi yang disimpan dari database.
   */
  async init() {
    const storedSessions = await prisma.sessions.findMany({
      select: { id_device: true },
      where: { filename: { startsWith: "session-config" } },
    });
    storedSessions.forEach(({ id_device }) => this.createSession({ id_device }));
  }

  /**
   * English: Creates a new session for WhatsApp.
   * Indonesian: Membuat sesi baru untuk WhatsApp.
   * @param {object} options - Options for creating the session
   */
  async createSession(options) {
    const { res, id_device, use_number, number } = options;
    const configIdDevice = `session-config-${id_device}`;
    let connectionState = { connection: "close" };

    const destroy = async (logout = true) => {
      try {
        await Promise.all([logout && socket.logout(), prisma.sessions.deleteMany({ where: { id_device } })]);
        console.log({ id_device }, "Session destroyed");
      } catch (error) {
        console.log(error, "An error occurred during session destroy");
      } finally {
        this.sessions.delete(id_device);
        this.updateWhatsAppConnection(id_device, "disconnected");
      }
    };

    const handleNormalConnectionUpdate = async () => {
      if (connectionState.qr?.length) {
        if (res && !res.headersSent) {
          try {
            if (use_number) {
              const code = await socket.requestPairingCode(number);
              ioConfig.emitEvent("number.updated", uuidHashConfig.encrypt(id_device), {
                code,
              });
              return handlerController.sendResponse({
                res,
                message: "Generate Pairing Code Successful!",
                data: { pairing_code: code },
              });
            } else {
              const qrCode = await qrcode.toDataURL(connectionState.qr, {
                errorCorrectionLevel: "H",
              });
              this.updateWhatsAppConnection(id_device, "wait_for_auth");
              ioConfig.emitEvent("qrcode.updated", uuidHashConfig.encrypt(id_device), {
                qrCode,
              });
              return handlerController.sendResponse({
                res,
                message: "Generate QR Code Successful!",
                data: { image_qrcode: qrCode },
              });
            }
          } catch (error) {
            console.log(error, "An error occurred during QR generation");
            ioConfig.emitEvent("qrcode.updated", uuidHashConfig.encrypt(id_device), {
              error: "error",
              message: `Unable to generate QR code: ${error.message}`,
              data: undefined,
            });
            return handlerController.sendResponse({
              res,
              message: "Unable to generate QR Code or Pairing Code",
              data: error,
              status: false,
              code: 500,
            });
          }
        }
        destroy();
      }
    };

    const { state, saveCreds } = await usePostgresqlAuthState(id_device);
    const socket = makeWASocket.default({
      auth: state,
      logger: pino({ level: "silent" }),
      browser: Browsers.macOS("Chrome"),
      shouldIgnoreJid: isJidBroadcast,
    });

    this.sessions.set(id_device, {
      ...socket,
      destroy,
    });

    // Handle message updates after sending
    socket.ev.on("messages.update", async (updates) => {
      try {
        await Promise.all(
          updates.map(async (update) => {
            const checkMessage = await prisma.messages.count({
              where: { id_send: update.key.id },
            });
    
            if (checkMessage > 0) {
              const statusEnum = ["error", "pending", "in_server", "delivery", "read", "played"];
              const status = statusEnum[update.update.status];
    
              await prisma.messages.update({
                select: { id_send: true },
                data: { status },
                where: {
                  id_send: update.key.id,
                  id_device,
                },
              });
            }
          })
        );
      } catch (error) {
        console.error("Update message status failed!", error);
      }
    });

    // // Handle incoming messages
    // socket.ev.on("messages.upsert", async (message) => {
    //   console.log(message);
    // });

    // Handle incoming calls
    socket.ev.on("call", async (call) => {
      await socket.rejectCall(call[0].id, call[0].from);
    });

    socket.ev.on("creds.update", saveCreds);
    socket.ev.on("connection.update", (update) => {
      connectionState = update;
      const { connection } = update;

      if (connection === "open") {
        this.updateWhatsAppConnection(id_device, update.isNewLogin ? "authenticated" : "connected");
        this.retries.delete(id_device);
      }

      if (connection === "close") {
        const code = connectionState.lastDisconnect?.error?.output?.statusCode;
        const restartRequired = code === DisconnectReason.restartRequired;
        const doNotReconnect = !this.shouldReconnect(id_device);

        this.updateWhatsAppConnection(id_device, "disconnected");

        if (code === DisconnectReason.loggedOut || doNotReconnect) {
          if (res) {
            !res.headersSent &&
              handlerController.sendResponse({
                res,
                message: "Unable to create session!",
                status: false,
                code: 500,
              });
            res.end();
          }
          destroy(doNotReconnect);
          return;
        }

        if (!restartRequired) {
          console.log(
            {
              attempts: this.retries.get(id_device) || 1,
              id_device,
            },
            "Reconnecting..."
          );
        }
        setTimeout(() => this.createSession(options), restartRequired ? 0 : 5000);
      }

      if (connection === "connecting") this.updateWhatsAppConnection(id_device, "synchronizing");

      handleNormalConnectionUpdate();
    });

    await prisma.sessions.upsert({
      create: {
        filename: configIdDevice,
        id_device,
        data: JSON.stringify({ readMessageIncome: false }),
      },
      update: {},
      where: {
        id_device_filename: { filename: configIdDevice, id_device },
      },
    });
  }

  /**
   * English: Updates WhatsApp connection status in the database and emits the update.
   * Indonesian: Memperbarui status koneksi WhatsApp di database dan mengirimkan pembaruan.
   * @param {string} idDevice - The device ID
   * @param {string} waStatus - The current status of the WhatsApp connection
   */
  async updateWhatsAppConnection(idDevice, waStatus) {
    if (this.sessions.has(idDevice)) {
      const session = this.sessions.get(idDevice);
      this.sessions.set(idDevice, { ...session, waStatus });
      ioConfig.emitEvent("connection.update", uuidHashConfig.encrypt(idDevice), {
        status: waStatus,
      });

      try {
        // Update the device status in the database
        const resultUpdate = await prisma.devices.update({
          select: {
            phone_number: true,
            name: true,
            user: {
              select: {
                email: true,
              },
            },
          },
          data: { status: waStatus },
          where: { id_device: idDevice },
        });
        if (waStatus === "disconnected") {
          await queueConfig.queueEmailDeviceDisconnect(resultUpdate.user.email, {
            phone_number: resultUpdate.phone_number,
            name: resultUpdate.name,
          });
        }
      } catch (error) {
        console.error(`Failed to update device status in database: ${error.message}`);
      }
    }
  }

  /**
   * English: Determines if the session should be reconnected based on the retry attempts.
   * Indonesian: Menentukan apakah sesi harus dihubungkan kembali berdasarkan jumlah percobaan ulang.
   * @param {string} idDevice - The device ID
   * @returns {boolean} - Whether the session should reconnect
   */
  shouldReconnect(idDevice) {
    let attempts = this.retries.get(idDevice) || 0;

    if (attempts < 5) {
      attempts += 1;
      this.retries.set(idDevice, attempts);
      return true;
    }
    return false;
  }

  /**
   * English: Retrieves the session for the given session ID.
   * Indonesian: Mengambil sesi untuk ID sesi yang diberikan.
   * @param {string} sessionId - The session ID
   * @returns {object} - The session object
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  /**
   * English: Deletes the session for the given device ID.
   * Indonesian: Menghapus sesi untuk ID perangkat yang diberikan.
   * @param {string} idDevice - The device ID
   */
  async deleteSession(idDevice) {
    this.sessions.get(idDevice)?.destroy();
  }

  /**
   * English: Checks if a session exists for the given device ID.
   * Indonesian: Memeriksa apakah sesi ada untuk ID perangkat yang diberikan.
   * @param {string} idDevice - The device ID
   * @returns {boolean} - Whether the session exists
   */
  sessionExists(idDevice) {
    return this.sessions.has(idDevice);
  }

  /**
   * English: Validates if a JID (WhatsApp ID) exists in the session.
   * Indonesian: Memvalidasi apakah JID (ID WhatsApp) ada di sesi.
   * @param {object} session - The WhatsApp session
   * @param {string} jid - The JID to check
   * @returns {string|null} - The JID if it exists, otherwise null
   */
  async checkNumber(session, jid) {
    try {
      const [result] = await session.onWhatsApp(jid);
      return result?.exists ? result.jid : null;
    } catch (e) {
      return null;
    }
  }
}

/**
 * English: Export the WhatsAppService class
 * Indonesian: Mengekspor kelas WhatsAppService
 */
export default new WhatsAppService();
