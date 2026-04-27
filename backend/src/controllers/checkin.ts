import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../prismaClient';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';

// Helper to send email to owner
const sendOwnerEmail = async (booking: any) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const ownerEmail = booking.bed.floor.pg.owner.email;
  const pgName = booking.bed.floor.pg.name;

  await transporter.sendMail({
    from: `"Smart PG Finder" <${process.env.SMTP_USER}>`,
    to: ownerEmail,
    subject: `New Resident Registration: ${booking.occupantName || booking.user.name}`,
    text: `Hello,\n\nA new student has completed the digital check-in for ${pgName}.\nPlease find the details in your dashboard.\n\nResident: ${booking.occupantName || booking.user.name}`,
    html: `
      <h3>New Resident Registration</h3>
      <p>A new student has completed the digital check-in for <strong>${pgName}</strong>.</p>
      <ul>
        <li><strong>Resident:</strong> ${booking.occupantName || booking.user.name}</li>
        <li><strong>Bed:</strong> ${booking.bed.identifier}</li>
        <li><strong>Phone:</strong> ${booking.phoneNumber}</li>
      </ul>
      <p>Log in to your dashboard to view the full registration form and photo.</p>
    `,
  });
};

export const submitCheckIn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = req.params.bookingId as string;
    const { profession, permanentAddress, phoneNumber, checkInDate } = req.body;
    const photoFile = req.file;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId as string },
      include: { 
        user: true, 
        bed: { include: { floor: { include: { pg: { include: { owner: true } } } } } } 
      }
    });

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId as string },
      data: {
        profession,
        permanentAddress,
        phoneNumber,
        checkInDate: new Date(checkInDate),
        checkInPhotoUrl: photoFile ? `/uploads/checkins/${photoFile.filename}` : null,
        checkInFormStatus: 'SUBMITTED'
      },
      include: { 
        user: true, 
        bed: { include: { floor: { include: { pg: { include: { owner: true } } } } } } 
      }
    });

    // Send email to owner
    try {
        await sendOwnerEmail(updatedBooking);
    } catch (emailErr) {
        console.error('Email failed:', emailErr);
    }

    res.status(200).json({ 
      message: 'Check-in form submitted successfully',
      booking: updatedBooking 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const downloadCheckInForm = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = req.params.bookingId as string;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId as string },
      include: { 
        user: true, 
        bed: { include: { floor: { include: { pg: true } } } } 
      }
    });

    if (!booking || booking.checkInFormStatus !== 'SUBMITTED') {
      res.status(404).json({ message: 'Registration data not found' });
      return;
    }

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Registration_${booking.id}.pdf`);
    
    doc.pipe(res);

    // Header
    doc.fontSize(22).text('Resident Registration Form', { align: 'center' });
    doc.fontSize(10).fillColor('grey').text('Smart PG Finder Official Document', { align: 'center' });
    doc.moveDown(2);

    // Resident Photo (if exists)
    if (booking.checkInPhotoUrl) {
      try {
        const photoPath = path.join(process.cwd(), booking.checkInPhotoUrl);
        if (fs.existsSync(photoPath)) {
          doc.image(photoPath, 430, 100, { width: 120 });
        }
      } catch (e) {
        console.error('PDF Photo Error:', e);
      }
    }

    // Details Grid
    const b = booking as any;
    doc.fillColor('black').fontSize(14).text('Personal Details', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Full Name: ${b.occupantName || b.user.name}`);
    doc.text(`Profession: ${b.profession || 'N/A'}`);
    doc.text(`Phone Number: ${b.phoneNumber || 'N/A'}`);
    doc.text(`Aadhar Number: ${b.aadharNumber || 'N/A'}`);
    doc.moveDown();

    doc.fontSize(14).text('Residential Details', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Permanent Address: ${b.permanentAddress || 'N/A'}`);
    doc.text(`Check-in Date: ${b.checkInDate ? new Date(b.checkInDate).toLocaleDateString() : 'N/A'}`);
    doc.moveDown();

    doc.fontSize(14).text('PG Assignment', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Property: ${b.bed.floor.pg.name}`);
    doc.text(`Address: ${b.bed.floor.pg.address}, ${b.bed.floor.pg.city}`);
    doc.text(`Bed Identifier: ${b.bed.identifier} (Floor ${b.bed.floor.floorNumber})`);
    doc.moveDown(2);

    // Footer
    doc.font('Helvetica-Bold').fontSize(10).text('Verification Declaration:');
    doc.font('Helvetica').text('I hereby declare that the information provided above is true to the best of my knowledge. I agree to abide by the PG rules and lock-in policies.');
    doc.moveDown(2);

    const checkInStr = b.checkInDate ? new Date(b.checkInDate).toLocaleDateString() : 'N/A';
    doc.text(`Signed digitally on: ${checkInStr}`);
    doc.moveDown();
    doc.text('__________________________', { align: 'left' });
    doc.text('Resident Signature');

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};
