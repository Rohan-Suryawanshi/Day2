import nodemailer from "nodemailer";
import { ApiError } from "./ApiError";

// Create a reusable transporter object
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // Use false for 587, true for 465
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends an email with dynamic parameters.
 * @param {string} to - Recipient email address.
 * @param {string} subject - Email subject.
 * @param {string} text - Plain text content.
 * @param {string} html - HTML formatted content.
 * @param {Array<Object>} [attachments=[]] - Array of attachment objects.
 * @returns {Promise<Object>} - Returns success response or throws an error.
 */
const sendEmail = async (to, subject, text, html, attachments = []) => {
  try {
    // Validate environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new ApiError(500, "Missing email credentials in .env file.");
    }

    // Validate recipient email
    if (!to) {
      throw new ApiError(400, "Recipient email is required.");
    }

    const mailOptions = {
      from: `"YouTube" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `✅ Email sent successfully to ${to}. Message ID: ${info.messageId}`
    );
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    throw new ApiError(500, error.message);
  }
};

export { sendEmail };
