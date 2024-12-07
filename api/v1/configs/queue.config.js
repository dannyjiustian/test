/**
 * English: Imports the modules used
 * Indonesian: Mengimpor modul yang digunakan
 */
import Queue from "bull";
import fs from "fs";
import handlebars from "handlebars";
import envConfig from "./env.config.js";
import { createTransport } from "nodemailer";
import redisConfig from "./redis.config.js";
import whatsAppService from "../controllers/coreWhatsApp/whatsAppService.controller.js";
import { PrismaClient } from "@prisma/client";

/**
 * English: Initialize Prisma client
 * Indonesian: Inisialisasi Prisma client
 */
const prisma = new PrismaClient();

/**
 * English: Class to configure and manage queues, OTP generation, Redis, and email sending
 * Indonesian: Kelas untuk mengonfigurasi dan mengelola antrian, pembuatan OTP, Redis, dan pengiriman email
 */
class QueueConfig {
  /**
   * English: Constructor to initialize the QueueConfig class
   * Indonesian: Konstruktor untuk menginisialisasi kelas QueueConfig
   */
  constructor() {
    this.redisUrl = envConfig.get("redisUrl");
    this.mailHost = envConfig.get("mailHost");
    this.mailPort = envConfig.get("mailPort");
    this.mailUsername = envConfig.get("mailUsername");
    this.mailPassword = envConfig.get("mailPassword");
    this.mailSecure = envConfig.get("mailSecure");
    this.mailFromAddress = envConfig.get("mailFromAddress");
    this.mailFromName = envConfig.get("mailFromName");

    // English: Creates the email transporter
    // Indonesian: Membuat transporter email
    this.transporter = createTransport({
      host: this.mailHost,
      port: this.mailPort,
      secure: this.mailSecure,
      auth: {
        user: this.mailUsername,
        pass: this.mailPassword,
      },
    });

    // English: Verifies the Nodemailer transporter connection
    // Indonesian: Memverifikasi koneksi transporter Nodemailer
    this.transporter.verify((error) => {
      error ? console.error("Nodemailer connection error:", error) : console.log("Nodemailer is ready to send emails");
    });

    // English: Email and WhatsApp queue setup
    // Indonesian: Konfigurasi antrian email dan WhatsApp
    this.emailQueue = this.createQueueConnection("emailQueue", "email");
    this.whatsappQueue = this.createQueueConnection("whatsappQueue", "whatsapp");
    this.whatsappBulkQueue = this.createQueueConnection("whatsappBulkQueue", "whatsappBulk");
  }

  /**
   * English: Creates a new queue connection for a specific purpose
   * Indonesian: Membuat koneksi antrian baru untuk tujuan tertentu
   * @param {string} name - Queue name
   * @param {string} groupKey - Group key for job grouping
   * @returns {Queue} - A new Queue instance
   */
  createQueueConnection(name, groupKey) {
    return new Queue(name, this.redisUrl, {
      limiter: {
        max: 10,
        duration: 1000,
        groupKey,
      },
    });
  }

  /**
   * English: Configures listeners and processing logic for the email queue
   * Indonesian: Mengonfigurasi pendengar dan logika pemrosesan untuk antrian email
   */
  configureQueueListeners() {
    this.emailQueue.client.on("connect", () => console.log("Redis client email queue connected successfully"));
    this.emailQueue.client.on("error", (err) => console.error("Redis client email queue connection error:", err));

    this.emailQueue.process(async (job, done) => {
      try {
        console.log(`Sending email to ${job.data.to}...`);
        await this.transporter.sendMail(job.data);
        done();
      } catch (err) {
        console.error("Failed to send email:", err);
        done(err);
      }
    });

    this.emailQueue.on("completed", (job) => console.log(`Email sent successfully to ${job.data.to}`));

    this.emailQueue.on("failed", async (job, err) => {
      console.error(`Failed to send email to ${job.data.to}:`, err);
      if (job.attemptsMade >= 3) {
        console.log("Job email failed 3 times, removing job from queue.");
      }
    });

    this.whatsappQueue.client.on("connect", () =>
      console.log("Redis client whatsapp queue connected successfully")
    );
    this.whatsappQueue.client.on("error", (err) =>
      console.error("Redis client whatsapp queue connection error:", err)
    );

    this.whatsappQueue.process(async (job, done) => {
      const { sessionId, to_number, message, idDevice, id_user, useWeb } = job.data;
      try {
        const session = whatsAppService.getSession(sessionId); // Get session dynamically
        const checkNumber = await whatsAppService.checkNumber(session, to_number);
        if (!checkNumber) throw new Error(`Number ${to_number} does not exist`);

        const result = await session.sendMessage(checkNumber, { text: message });

        if (useWeb) {
          // Save to DB
          const findName = await prisma.contacts.findFirst({
            select: { name: true },
            where: {
              phone_number: to_number,
              id_user,
            },
          });
          await prisma.messages.create({
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
        }

        console.log(`Message sent to ${to_number}`);
        done();
      } catch (err) {
        console.error(`Failed to send message to ${to_number}:`, err);
        done(err);
      }
    });

    this.whatsappQueue.on("completed", (job) =>
      console.log(`Message Whatsapp successfully sent to ${job.data.to_number}`)
    );

    this.whatsappQueue.on("failed", async (job, err) => {
      console.error(`Failed to process WhatsApp job for ${job.data.to_number}:`, err);
      if (job.attemptsMade >= 3) {
        console.log("Job whatsapp failed 3 times, removing job from queue.");
      }
    });

    this.whatsappBulkQueue.client.on("connect", () =>
      console.log("Redis client whatsapp bulk queue connected successfully")
    );
    this.whatsappBulkQueue.client.on("error", (err) =>
      console.error("Redis client whatsapp bulk queue connection error:", err)
    );

    this.whatsappBulkQueue.process(async (job, done) => {
      const { sessionId, to_number, message, idDevice, id_user, useWeb } = job.data;
      try {
        const session = whatsAppService.getSession(sessionId); // Get session dynamically
        const checkNumber = await whatsAppService.checkNumber(session, to_number);
        if (!checkNumber) throw new Error(`Number ${to_number} does not exist`);

        const result = await session.sendMessage(checkNumber, { text: message });

        if (useWeb) {
          // Save to DB
          const findName = await prisma.contacts.findFirst({
            select: { name: true },
            where: {
              phone_number: to_number,
              id_user,
            },
          });
          await prisma.messages.create({
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
        }

        console.log(`Message sent to ${to_number}`);
        done();
      } catch (err) {
        console.error(`Failed to send message to ${to_number}:`, err);
        done(err);
      }
    });

    this.whatsappBulkQueue.on("completed", (job) =>
      console.log(`Message Bulk Whatsapp successfully sent to ${job.data.to_number}`)
    );

    this.whatsappBulkQueue.on("failed", async (job, err) => {
      console.error(`Failed to process WhatsApp Bulk job for ${job.data.to_number}:`, err);
      if (job.attemptsMade >= 3) {
        console.log("Job whatsapp bulk failed 3 times, removing job from queue.");
      }
    });
  }

  /**
   * English: Adds an email to the queue with an OTP code
   * Indonesian: Menambahkan email ke dalam antrian dengan kode OTP
   * @param {string} email - Recipient's email address
   * @param {string} type - Type of email (e.g., register, login, removeDevice)
   */
  async queueEmailOTP(email, type) {
    const otp = this.generateOtp();
    await this.saveOtpToRedis(email, otp, type);

    // Read and compile the HTML template
    const templateSource = fs.readFileSync("./email-template/template.html", "utf-8");
    const template = handlebars.compile(templateSource);

    // Define dynamic data for different types of emails
    const emailDataMap = {
      register: {
        subject: "🎉 Start Your Journey with FlowSend Today!",
        dynamicData: {
          title: "Welcome to FlowSend",
          subtitle: "Thank you for joining us at FlowSend by Djie's. We're excited to have you on board!",
          isRegister: true,
          showOtp: true,
          showRegister: true,
          otp,
        },
      },
      login: {
        subject: "📢 New Login Detected on Your Account!",
        dynamicData: {
          title: "Information",
          subtitle:
            "Welcome back to FlowSend by Djie's! We're glad to see you again. Access your account and enjoy our services.",
          showOtp: true,
          showLogin: true,
          showWarningLoginDelete: true,
          otp,
        },
      },
      removeDevice: {
        subject: "📢 Device Removal Requested for Your Account!",
        dynamicData: {
          title: "Information",
          subtitle:
            "A device removal request has been made for your FlowSend by Djie's account. Please verify to continue.",
          showOtp: true,
          showDeleteDevice: true,
          showWarningLoginDelete: true,
          otp,
        },
      },
    };

    // Check if the provided type is valid
    if (!emailDataMap[type]) throw new Error("Invalid email type provided.");

    // Generate HTML content using the dynamic data based on email type
    const { subject, dynamicData } = emailDataMap[type];
    const htmlContent = template(dynamicData);

    const emailData = {
      from: `${this.mailFromName} <${this.mailFromAddress}>`,
      to: email,
      subject,
      html: htmlContent,
    };

    await this.emailQueue.add(emailData, {
      attempts: 3,
      backoff: 5000,
      removeOnComplete: true,
      removeOnFail: true,
    });
  }

  /**
   * English: Adds an email to the queue for device disconnection
   * Indonesian: Menambahkan email ke dalam antrian untuk pemutusan perangkat
   * @param {string} email - Recipient's email address
   * @param {object} data - Device details
   */
  async queueEmailDeviceDisconnect(email, data) {
    // Read the HTML template file
    const templateSource = fs.readFileSync("./email-template/template.html", "utf-8");

    // Compile the template with Handlebars
    const template = handlebars.compile(templateSource);

    // Dynamic data
    const dynamicData = {
      title: "Information",
      subtitle: "Your device has been disconnected from WhatsApp. Please reconnect to continue using the service!",
      showDeviceDisconnect: true,
      phone_number: data.phone_number,
      name: data.name,
    };

    // Generate the final HTML content by passing dynamic data into the template
    const htmlContent = template(dynamicData);

    const emailData = {
      from: `${this.mailFromName} <${this.mailFromAddress}>`,
      to: email,
      subject: "🚨 Device Information!",
      html: htmlContent,
    };

    await this.emailQueue.add(emailData, {
      attempts: 3,
      backoff: 5000,
      removeOnComplete: true,
      removeOnFail: true,
    });
  }

  /**
   * English: Adds an message to the queue for send to whatsapp
   * Indonesian: Menambahkan pesan ke dalam antrian untuk kirim ke whatsapp
   * @param {object} data - Data message
   */
  async queueWhatsAppMessage(data) {
    await this.whatsappQueue.add(data, {
      attempts: 3,
      backoff: 5000,
      removeOnComplete: true,
      removeOnFail: true,
    });
  }

  /**
   * English: Adds an message bulk to the queue for send to whatsapp
   * Indonesian: Menambahkan pesan masal ke dalam antrian untuk kirim ke whatsapp
   * @param {object} data - Data message
   * @param {string} delay - Delay for every each message
   */
  async queueWhatsAppBulkMessage(data, delay) {
    await this.whatsappBulkQueue.add(data, {
      attempts: 3,
      backoff: 5000,
      delay,
      removeOnComplete: true,
      removeOnFail: true,
    });
  }

  /**
   * English: Generates a random 6-digit OTP code
   * Indonesian: Menghasilkan kode OTP acak 6 digit
   * @returns {string} - 6-digit OTP
   */
  generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * English: Saves the OTP code to Redis with expiration
   * Indonesian: Menyimpan kode OTP ke Redis dengan waktu kedaluwarsa
   * @param {string} email - Email address for OTP
   * @param {string} otp - OTP code
   * @param {string} type - Type of OTP
   */
  async saveOtpToRedis(email, otp, type) {
    try {
      redisConfig.saveOtp(email, otp, type);
    } catch (err) {
      throw new Error("Error saving OTP to Redis:", err);
    }
  }
}

/**
 * English: Export class
 * Indonesian: Mengekspor kelas
 */
export default new QueueConfig();
