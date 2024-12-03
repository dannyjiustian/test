/**
 * English: Imports the modules used
 * Indonesian: Mengimpor modul yang digunakan
 */
import { PrismaClient } from "@prisma/client";
import { io } from "./server.config.js";
import uuidHashConfig from "./uuidHash.config.js";

/**
 * English: Initialize Prisma client
 * Indonesian: Inisialisasi Prisma client
 */
const prisma = new PrismaClient();

/**
 * English: Service class for managing Socket.IO connections
 * Indonesian: Kelas layanan untuk mengelola koneksi Socket.IO
 */
class SocketService {
  constructor() {
    this.clients = new Map(); // Map to track connected clients by session ID
  }

  /**
   * English: Initializes the Socket.IO service
   * Indonesian: Menginisialisasi layanan Socket.IO
   */
  initialize() {
    // Middleware to validate token during handshake
    io.use(async (socket, next) => {
      const apiKey = socket.handshake.auth["account-api-key"]
        ? socket.handshake.auth["account-api-key"]
        : socket.handshake.headers["account-api-key"];

      if (!apiKey) return next(new Error("Please enter api key account!"));

      const checkApiKey = await prisma.users.count({
        where: {
          key: apiKey,
          is_active: true,
        },
      });

      if (checkApiKey === 0)
        return next(new Error("API key account not found, please another api key account with account active!"));

      next();
    });

    // Listener for new connections
    io.on("connection", async (socket) => {
      const { id_device } = socket.handshake.query;

      // Disconnect if session ID is invalid
      if (!id_device) {
        console.log("The id device is required!");
        socket.disconnect(true);
        return;
      }

      // check a device is registers at account
      const apiKey = socket.handshake.auth["account-api-key"]
        ? socket.handshake.auth["account-api-key"]
        : socket.handshake.headers["account-api-key"];

      const checkDevice = await prisma.devices.count({
        where: {
          id_device: uuidHashConfig.decrypt(id_device),
          user: {
            key: apiKey,
          },
        },
      });

      if (checkDevice === 0) {
        console.log("The id device not register at your account!");
        socket.disconnect(true);
        return;
      }

      this.addClient(id_device, socket.id);
      socket.join(id_device);

      console.log(`New Socket.IO connection: id_device=${id_device}`);
      socket.emit("connected", { id_device });

      // Listener for disconnect events
      socket.on("disconnect", () => {
        this.removeClient(id_device, socket.id);
        console.log(`Socket disconnected: id_device=${id_device}`);
      });
    });
  }

  /**
   * English: Adds a client to the clients map
   * Indonesian: Menambahkan klien ke peta klien
   * @param {string} idDevice - Session ID of the client
   * @param {string} socketId - Socket ID of the client
   */
  addClient(idDevice, socketId) {
    if (!this.clients.has(idDevice)) this.clients.set(idDevice, new Set());
    this.clients.get(idDevice).add(socketId);
  }

  /**
   * English: Removes a client from the clients map
   * Indonesian: Menghapus klien dari peta klien
   * @param {string} idDevice - Session ID of the client
   * @param {string} socketId - Socket ID of the client
   */
  removeClient(idDevice, socketId) {
    const clientSet = this.clients.get(idDevice);
    if (clientSet) {
      clientSet.delete(socketId);
      if (clientSet.size === 0) this.clients.delete(idDevice);
    }
  }

  /**
   * English: Emits an event to a specific session
   * Indonesian: Memancarkan event ke sesi tertentu
   * @param {string} event - Event name
   * @param {string} idDevice - Session ID to target
   * @param {object} data - Data to send with the event
   */
  emitEvent(event, idDevice, data) {
    console.log(`Emitting event ${event} to session ${idDevice}`);
    io.to(idDevice).emit(event, { event, idDevice, data });
  }

  /**
   * English: Gets the number of connected clients for a session
   * Indonesian: Mendapatkan jumlah klien yang terhubung untuk sesi tertentu
   * @param {string} idDevice - Session ID to check
   * @returns {number} - Number of connected clients
   */
  getConnectedClients(idDevice) {
    return this.clients.get(idDevice)?.size || 0;
  }
}

/**
 * English: Export class instance
 * Indonesian: Ekspor instance kelas
 */
export default new SocketService();
