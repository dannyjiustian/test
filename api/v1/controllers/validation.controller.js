/**
 * English: Imports the modules used
 * Indonesian: Mengimpor modul yang digunakan
 */
import joi from "joi";

class ValidationController {
  /**
   * English: Validates user login request data
   * Indonesian: Memvalidasi data permintaan login pengguna
   */
  userLogin(requestData) {
    const userLoginSchema = joi
      .object({
        identity: joi.string().lowercase().required(),
        password: joi.string().alphanum().min(8).required(),
      })
      .options({ abortEarly: false });
    return userLoginSchema.validate(requestData);
  }

  /**
   * English: Validates user login validation request data
   * Indonesian: Memvalidasi data permintaan login pengguna
   */
  userLoginValidation(requestData) {
    const userLoginValidationSchema = joi
      .object({
        identity: joi.string().lowercase().required(),
        password: joi.string().alphanum().min(8).required(),
        otp: joi.string().length(6).pattern(/^\d+$/).required(),
      })
      .options({ abortEarly: false });
    return userLoginValidationSchema.validate(requestData);
  }

  /**
   * English: Validates user registration request data
   * Indonesian: Memvalidasi data permintaan registrasi pengguna
   */
  userRegister(requestData) {
    const userRegisterSchema = joi
      .object({
        email: joi.string().email().lowercase().required(),
        name: joi.string().min(3).max(100).required(),
        username: joi.string().min(3).max(50).lowercase().required(),
        password: joi.string().alphanum().min(8).required(),
        retypePassword: joi.string().valid(joi.ref("password")).required().messages({
          "any.only": "Password do not match",
        }),
      })
      .options({ abortEarly: false });
    return userRegisterSchema.validate(requestData);
  }

  /**
   * English: Validates user registration account activation request data
   * Indonesian: Memvalidasi data permintaan pengiriman ulang registrasi
   */
  userRegisterActivation(requestData) {
    const userRegisterActivationSchema = joi
      .object({
        email: joi.string().email().lowercase().required(),
        otp: joi.string().length(6).pattern(/^\d+$/).required(),
      })
      .options({ abortEarly: false });
    return userRegisterActivationSchema.validate(requestData);
  }

  /**
   * English: Validates device account activation request data
   * Indonesian: Memvalidasi data permintaan pengiriman ulang registrasi
   */
  device(requestData) {
    const deviceSchema = joi
      .object({
        phone_number: joi.string().max(14).pattern(/^\d+$/).required(),
        name: joi.string().min(3).max(100).required(),
        desc: joi.string().required(),
      })
      .options({ abortEarly: false });
    return deviceSchema.validate(requestData);
  }

  /**
   * English: Validates update device account activation request data
   * Indonesian: Memvalidasi data permintaan pengiriman ulang registrasi
   */
  updateDevice(requestData) {
    const updateDeviceSchema = joi
      .object({
        name: joi.string().min(3).max(100).required(),
        desc: joi.string().required(),
      })
      .options({ abortEarly: false });
    return updateDeviceSchema.validate(requestData);
  }

  /**
   * English: Validates only otp account activation request data
   * Indonesian: Memvalidasi data permintaan pengiriman ulang registrasi
   */
  onlyOTP(requestData) {
    const onlyOTPSchema = joi
      .object({
        otp: joi.string().length(6).pattern(/^\d+$/).required(),
      })
      .options({ abortEarly: false });
    return onlyOTPSchema.validate(requestData);
  }

  /**
   * English: Validates device account activation request data
   * Indonesian: Memvalidasi data permintaan pengiriman ulang registrasi
   */
  contact(requestData) {
    const contactSchema = joi
      .object({
        phone_number: joi.string().max(14).pattern(/^\d+$/).required(),
        name: joi.string().min(3).max(100).required(),
      })
      .options({ abortEarly: false });
    return contactSchema.validate(requestData);
  }

  /**
   * English: Validates authentication whatsapp activation request data
   * Indonesian: Memvalidasi data permintaan pengiriman ulang registrasi
   */
  authWhatsApp(requestData) {
    const authWhatsAppSchema = joi
      .object({
        id_device: joi.string().max(40).required(),
        use_number: joi.boolean().required(),
      })
      .options({ abortEarly: false });
    return authWhatsAppSchema.validate(requestData);
  }

  /**
   * English: Validates send message whatsapp data
   * Indonesian: Memvalidasi data pengiriman pesan whatsapp
   */
  sendWhatsAppWeb(requestData) {
    const sendWhatsAppSchema = joi
      .object({
        id_device: joi.string().max(40).required(),
        to_number: joi.string().max(14).pattern(/^\d+$/).required(),
        message: joi.string().required(),
      })
      .options({ abortEarly: false });
    return sendWhatsAppSchema.validate(requestData);
  }

  /**
   * English: Validates send message whatsapp data
   * Indonesian: Memvalidasi data pengiriman pesan whatsapp
   */
  sendWhatsAppAPI(requestData) {
    const sendWhatsAppSchema = joi
      .object({
        to_number: joi.string().max(14).pattern(/^\d+$/).required(),
        message: joi.string().required(),
      })
      .options({ abortEarly: false });
    return sendWhatsAppSchema.validate(requestData);
  }
}

/**
 * English: Export validation configuration
 * Indonesian: Export konfigurasi validasi
 */
export default new ValidationController();
