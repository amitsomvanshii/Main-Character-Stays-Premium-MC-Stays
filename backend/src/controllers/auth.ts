import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import "dotenv/config";
import prisma from '../prismaClient';
import { sendOtpEmail } from '../utils/mailer';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      if (existingUser.verified) {
        res.status(400).json({ message: 'User already exists' });
        return;
      } else {
        // User exists but is not verified - delete the old unverified account to allow new signup
        await prisma.user.delete({ where: { id: existingUser.id } });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Root Admin Enforcement
    let finalRole = role || 'STUDENT';
    const ADMIN_EMAIL = 'amitsomvanshi63@gmail.com';
    
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      finalRole = 'ADMIN';
    } else if (finalRole === 'ADMIN') {
      // Prevent unauthorized users from claiming ADMIN role
      finalRole = 'STUDENT';
    }

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: finalRole,
        otp,
        otpExpiry,
        verified: false,
      },
    });

    // Send the Real OTP Email
    try {
      await sendOtpEmail(email, otp);
    } catch (emailError) {
      // ROLLBACK: Delete the user if email failed so they can try again once SMTP is fixed
      await prisma.user.delete({ where: { id: user.id } });
      throw emailError;
    }

    res.status(201).json({ message: 'OTP sent to email. Please verify.' });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Server Error: ' + (error instanceof Error ? error.message : String(error)) });
  }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user.verified) {
      res.status(400).json({ message: 'Email already verified' });
      return;
    }

    if (user.otp !== otp || (user.otpExpiry && user.otpExpiry < new Date())) {
      res.status(400).json({ message: 'Invalid or expired OTP' });
      return;
    }

    // Success - Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verified: true,
        otp: null,
        otpExpiry: null
      }
    });

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name, profileImage: user.profileImage }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.status(200).json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        profileImage: user.profileImage
      } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: String(error) });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(400).json({ message: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ message: 'Invalid credentials' });
      return;
    }

    if (!user.verified) {
      res.status(401).json({ message: 'Email not verified. Please check your inbox for OTP.' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name, profileImage: user.profileImage }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.status(200).json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        profileImage: user.profileImage
      } 
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ 
      message: 'Server Error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// 6. DEVELOPMENT ONLY: Promote user to ADMIN
export const promoteToAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const userResult = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' }
    });
    res.status(200).json({ message: `User ${email} promoted to ADMIN`, user: { email: userResult.email, role: userResult.role } });
  } catch (error) {
    res.status(500).json({ message: 'Error promoting user', error });
  }
};
