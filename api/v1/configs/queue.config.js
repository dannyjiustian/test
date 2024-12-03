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
        console.log("Job failed 3 times, removing job from queue.");
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
    // Thank you for joining us at FlowSend by Djie's. We're excited to have you on board!
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
