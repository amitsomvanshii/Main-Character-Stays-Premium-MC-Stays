import nodemailer from 'nodemailer';
import "dotenv/config";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendOtpEmail = async (email: string, otp: string) => {
  const mailOptions = {
    from: `"Smart PG Finder" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Your Verification Code - Smart PG Finder',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #FF385C; text-align: center;">Smart PG Finder</h2>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p>Hello,</p>
        <p>Thank you for signing up for Smart PG Finder. To complete your registration, please use the following one-time password (OTP):</p>
        <div style="background: #f9f9f9; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
          <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #333;">${otp}</span>
        </div>
        <p>This code is valid for <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
        <br />
        <p>Best regards,</p>
        <p>The Smart PG Finder Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to ${email}`);
  } catch (error: any) {
    console.error('SMTP Error:', error.message);
    if (error.code === 'EAUTH') {
      throw new Error('Email authentication failed. Check your App Password in .env');
    }
    throw new Error('Failed to send verification email. Ensure your .env SMTP settings are correct.');
  }
};
