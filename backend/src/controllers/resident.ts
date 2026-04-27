import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { sendOtpEmail } from '../utils/mailer'; // We'll reuse/extend mailer for alerts

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

// 1. Student: Raise a Support Ticket / Issue
export const raiseIssue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { bookingId, category, description } = req.body;
    const studentId = req.user?.id;

    if (!studentId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Create Issue
    const issue = await prisma.issue.create({
      data: {
        bookingId,
        studentId,
        category,
        description,
        status: 'OPEN'
      },
      include: {
        booking: {
          include: {
            bed: { include: { floor: { include: { pg: { include: { owner: true } } } } } }
          }
        }
      }
    });

    // Notify Owner via Email (Simulated through existing mailer)
    const ownerEmail = issue.booking.bed.floor.pg.owner.email;
    const ownerName = issue.booking.bed.floor.pg.owner.name;
    const pgName = issue.booking.bed.floor.pg.name;

    try {
      // Re-using OTP mailer as a general alert for simplicity in this demo environment
      // In a real app, we'd have a separate 'sendAlertEmail'
      await sendOtpEmail(ownerEmail, `NEW ISSUE: [${category}] reported at ${pgName}. Details: ${description}`);
    } catch (mailError) {
      console.error('Failed to notify owner:', mailError);
    }

    res.status(201).json({ message: 'Ticket raised and owner notified.', issue });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// 2. Student: Sign Digital Agreement
export const signAgreement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.body;
    const studentId = req.user?.id;

    const booking = await prisma.booking.update({
      where: { id: bookingId, userId: studentId },
      data: { 
        isSigned: true,
        nextRentDate: new Date(new Date().setMonth(new Date().getMonth() + 1)) // Next month
      }
    });

    res.status(200).json({ message: 'Agreement signed successfully.', booking });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};


// 3c. Student: Pay Rent (Legacy fallback — kept for compatibility)
export const payRent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { bookingId, targetMonth } = req.body;
    const studentId = req.user?.id;
    const booking = await prisma.booking.update({
      where: { id: bookingId, userId: studentId },
      data: { 
        rentStatus: 'PENDING_CONFIRMATION',
        pendingRentMonth: targetMonth || new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
      }
    });
    res.status(200).json({ message: 'Payment sent for confirmation.', booking });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// 4. Owner: Confirm Rent Receipt
export const confirmRentReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.body;
    const ownerId = req.user?.id;

    // Verify ownership
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { bed: { include: { floor: { include: { pg: true } } } } }
    });

    if (!booking || booking.bed.floor.pg.ownerId !== ownerId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { 
        rentStatus: 'PAID',
        nextRentDate: new Date(new Date(booking.nextRentDate || new Date()).setMonth(new Date(booking.nextRentDate || new Date()).getMonth() + 1)),
        pendingRentMonth: null // Clear after confirmation
      }
    });

    // Create a historical payment record
    const monthYear = booking.pendingRentMonth || new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const rentAmount = (booking.bed.floor.pg.rentMonthly || 0) * (booking.bed.priceMultiplier || 1);

    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        userId: booking.userId,
        amount: rentAmount,
        month: monthYear,
        status: 'PAID',
        confirmedAt: new Date(),
      }
    });

    res.status(200).json({ message: 'Rent receipt confirmed.', booking: updatedBooking });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// 5. Owner: Close Support Ticket
export const closeIssue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { issueId } = req.params;
    const ownerId = req.user?.id;

    const issue = await prisma.issue.findUnique({
      where: { id: issueId as string },
      include: { booking: { include: { bed: { include: { floor: { include: { pg: true } } } } } } }
    }) as any;

    if (!issue || issue.booking.bed.floor.pg.ownerId !== ownerId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    await prisma.issue.update({
      where: { id: issueId as string },
      data: { status: 'CLOSED' }
    });

    res.status(200).json({ message: 'Issue resolved and closed.' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// 6. Owner: Get Rent History for All Residents
export const getOwnerRentHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ownerId = req.user?.id;

    const history = await prisma.payment.findMany({
      where: {
        booking: {
          bed: {
            floor: {
              pg: {
                ownerId
              }
            }
          }
        }
      },
      include: {
        user: { select: { name: true, email: true } },
        booking: { 
          include: { 
            bed: { 
              include: { 
                floor: { include: { pg: { select: { name: true } } } } 
              } 
            } 
          } 
        }
      },
      orderBy: { confirmedAt: 'desc' }
    });

    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// 7. Student: Get My Rent History
export const getStudentRentHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    const history = await prisma.payment.findMany({
      where: { userId },
      include: {
        booking: { 
          include: { 
            bed: { 
              include: { 
                floor: { include: { pg: { select: { name: true } } } } 
              } 
            } 
          } 
        }
      },
      orderBy: { confirmedAt: 'desc' }
    });

    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// 6. DEBUG: Simulate 1-day Reminder
export const simulateReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    await sendOtpEmail(email, `REMINDER: Your rent for SmartPG is due tomorrow! Please log in to pay.`);
    res.status(200).json({ message: 'Reminder notification simulated.' });
  } catch (error) {
    res.status(500).json({ message: 'Error simulating reminder', error });
  }
};
