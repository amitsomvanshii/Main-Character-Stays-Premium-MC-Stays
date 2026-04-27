import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { sendOtpEmail } from '../utils/mailer';

export const submitLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, name, email, phone, state, city, budget, mode, referral, source } = req.body;

    if (!name || !phone || !type) {
      res.status(400).json({ message: 'Missing required fields (Name, Phone, Type)' });
      return;
    }

    const lead = await prisma.lead.create({
      data: {
        type: type as any,
        name,
        email,
        phone,
        state,
        city,
        budget,
        mode,
        referral,
        source
      }
    });

    // Notify Admin via Email
    const adminEmail = process.env.ADMIN_EMAIL || 'amitsomvanshi63@gmail.com';
    const alertSubject = `New Lead: [${type}] ${name} (${city || 'N/A'})`;
    const alertBody = `
      <h3>New Interest Query Received</h3>
      <p><strong>Type:</strong> ${type}</p>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Contact:</strong> ${phone} ${email ? `(${email})` : ''}</p>
      <p><strong>Location:</strong> ${city ? `${city}, ${state}` : 'N/A'}</p>
      ${budget ? `<p><strong>Budget:</strong> ${budget}</p>` : ''}
      ${mode ? `<p><strong>Visit Mode:</strong> ${mode}</p>` : ''}
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
    `;

    try {
      await sendOtpEmail(adminEmail, alertBody);
    } catch (mailErr) {
      console.error('Lead Notification Error:', mailErr);
    }

    res.status(201).json({ message: 'Interest registered successfully. Our team will contact you.', lead });
  } catch (error) {
    console.error('Submit Lead Error:', error);
    res.status(500).json({ message: 'Server Error', error });
  }
};
