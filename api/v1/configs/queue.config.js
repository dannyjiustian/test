/**
 * English: Imports the modules used
 * Indonesian: Mengimpor modul yang digunakan
 */
import Queue from "bull";
import envConfig from "./env.config.js";
import { createTransport } from "nodemailer";
import redisConfig from "./redis.config.js";

/**
 * English: Class to configure and manage queues, OTP generation, Redis, and email sending.
 * Indonesian: Kelas untuk mengonfigurasi dan mengelola antrian, pembuatan OTP, Redis, dan pengiriman email.
 */
class QueueConfig {
  /**
   * English: Constructor to initialize the QueueConfig class
   * Indonesian: Konstruktor untuk menginisialisasi kelas QueueConfig
   */
  constructor() {
    // Redis and email configurations
    this.redisUrl = envConfig.get("redisUrl"); // Redis connection URL
    this.mailHost = envConfig.get("mailHost"); // Mail server host
    this.mailPort = envConfig.get("mailPort"); // Mail server port
    this.mailUsername = envConfig.get("mailUsername"); // Email server username
    this.mailPassword = envConfig.get("mailPassword"); // Email server password
    this.mailSecure = envConfig.get("mailSecure"); // Use secure connection (boolean)
    this.mailFromAddress = envConfig.get("mailFromAddress"); // Sender email address
    this.mailFromName = envConfig.get("mailFromName"); // Sender name

    /**
     * English: Creates the email transporter
     * Indonesian: Membuat transporter email
     */
    this.transporter = createTransport({
      host: this.mailHost,
      port: this.mailPort,
      secure: this.mailSecure,
      auth: {
        user: this.mailUsername,
        pass: this.mailPassword,
      },
    });

    /**
     * English: Verifies the Nodemailer transporter connection
     * Indonesian: Memverifikasi koneksi transporter Nodemailer
     */
    this.transporter.verify((error) => {
      error
        ? console.error("Nodemailer connection error:", error)
        : console.log("Nodemailer is ready to send emails");
    });

    /**
     * English: Email queue setup
     * Indonesian: Konfigurasi antrian email
     */
    this.emailQueue = this.createQueueConnection("emailQueue", "email");

    /**
     * English: WhatsApp queue setup
     * Indonesian: Konfigurasi antrian WhatsApp
     */
    this.whatsappQueue = this.createQueueConnection(
      "whatsappQueue",
      "whatsapp"
    );
  }

  /**
   * English: Creates a new queue connection for a specific purpose
   * Indonesian: Membuat koneksi antrian baru untuk tujuan tertentu
   * @param {string} name - The name of the queue.
   * @param {string} groupKey - Group key used for queue processing.
   * @returns {Queue} - A new Queue instance.
   */
  createQueueConnection(name, groupKey) {
    return new Queue(name, this.redisUrl, {
      limiter: {
        max: 10, // Maximum 10 jobs per second
        duration: 1000, // Time window in milliseconds
        groupKey, // Group key for job grouping
      },
    });
  }

  /**
   * English: Configures listeners and processing logic for the email queue
   * Indonesian: Mengonfigurasi pendengar dan logika pemrosesan untuk antrian email
   */
  configureQueueListeners() {
    /**
     * English: Listens for a successful Redis connection
     * Indonesian: Mendengarkan koneksi Redis yang berhasil
     */
    this.emailQueue.client.on("connect", () => {
      console.log("The job queue is in demand standby mode!");
      console.log("Redis client email queue connected successfully");
    });

    /**
     * English: Handles Redis connection errors
     * Indonesian: Menangani kesalahan koneksi Redis
     */
    this.emailQueue.client.on("error", (err) => {
      console.error("Redis client email queue connection error:", err);
    });

    /**
     * English: Processes email queue jobs
     * Indonesian: Memproses pekerjaan antrian email
     * @param {Object} job - The job object from the queue.
     * @param {function} done - Callback to indicate job completion.
     */
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

    /**
     * English: Handles successful email job completion
     * Indonesian: Menangani penyelesaian pekerjaan email yang berhasil
     */
    this.emailQueue.on("completed", (job) => {
      console.log(`Email sent successfully to ${job.data.to}`);
    });

    /**
     * English: Handles failed email jobs
     * Indonesian: Menangani pekerjaan email yang gagal
     * @param {Object} job - The job object that failed.
     * @param {Error} err - The error causing the failure.
     */
    this.emailQueue.on("failed", async (job, err) => {
      console.error(`Failed to send email to ${job.data.to}:`, err);
      if (job.attemptsMade >= 3) {
        console.log(`Job failed 3 times, removing job from queue.`);
      }
    });
  }

  /**
   * English: Adds an email to the queue with an OTP code
   * Indonesian: Menambahkan email ke dalam antrian dengan kode OTP
   * @param {string} email - The recipient's email address.
   */
  async queueEmail(email, type) {
    const otp = this.generateOtp();
    await this.saveOtpToRedis(email, otp, type);

    const emailFormats = {
      register: {
        subject: "Activate your account",
        text: `Your OTP code is: ${otp}. It will expire in 5 minutes. For new registration!`,
      },
      login: {
        subject: "Trying to Login!",
        text: `Your OTP code is: ${otp}. It will expire in 5 minutes. For Login!`,
      },
      removeDevice: {
        subject: "Trying to delete device!",
        text: `Your OTP code is: ${otp}. It will expire in 5 minutes. For device removal!`,
      },
    };

    const emailData = {
      from: `${this.mailFromName} <${this.mailFromAddress}>`,
      to: email,
      ...(emailFormats[type] || {}), // Dynamically select the email format based on type
    };

    await this.emailQueue.add(emailData, {
      attempts: 3,
      backoff: 5000,
      removeOnComplete: true,
      removeOnFail: true,
    });
  }

  /**
   * English: Generates a random 6-digit OTP code
   * Indonesian: Menghasilkan kode OTP acak 6 digit
   * @returns {string} - A randomly generated 6-digit OTP.
   */
  generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * English: Saves the OTP code to Redis with expiration
   * Indonesian: Menyimpan kode OTP ke Redis dengan waktu kedaluwarsa
   * @param {string} email - The email address to associate the OTP with.
   * @param {string} otp - The OTP code to save.
   */
  async saveOtpToRedis(email, otp, type) {
    try {
      redisConfig.saveOtp(email, otp, type);
    } catch (err) {
      throw new Error("Error saving OTP to Redis:", err);
    }
  }
}

export default new QueueConfig();
