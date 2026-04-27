import { Response } from 'express';
import prisma from '../prismaClient';
import { AuthRequest } from '../middlewares/auth';

export const getResidentHubData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // 1. Get user's active stay
    const myBooking = await prisma.booking.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { bed: { include: { floor: true } } }
    });

    if (!myBooking) {
      res.status(200).json({ active: false, message: 'No active residency found' });
      return;
    }

    const floorId = myBooking.bed.floorId;
    const pgId = myBooking.bed.floor.pgId;

    // 2. Get roommates (floor-mates)
    const floorMates = await prisma.booking.findMany({
      where: {
        bed: { floorId },
        status: 'ACTIVE',
        userId: { not: userId }
      },
      include: {
        user: {
          select: { id: true, name: true, lifestyle: true }
        }
      }
    });

    // 3. Get shared expenses
    const expenses = await prisma.expense.findMany({
      where: { floorId },
      include: {
        payer: { select: { name: true } },
        splits: { include: { user: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      active: true,
      pgName: myBooking.bed.floor.pgId, // We should get the name too ideally
      floorNumber: myBooking.bed.floor.floorNumber,
      roommates: floorMates.map(fm => ({
        id: fm.user.id,
        name: fm.user.name,
        lifestyle: fm.user.lifestyle
      })),
      expenses: expenses.map(e => ({
        id: e.id,
        description: e.description,
        amount: e.amount,
        payerId: e.payerId,
        payerName: e.payer.name,
        createdAt: e.createdAt,
        splits: e.splits.map(s => ({
          userId: s.userId,
          userName: s.user.name,
          amount: s.amount,
          status: s.status
        }))
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Resident Hub Error', error });
  }
};

export const createExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { description, totalAmount, involvedUserIds } = req.body;
    const payerId = req.user?.id;

    if (!payerId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Get current user's floor context
    const myBooking = await prisma.booking.findFirst({
      where: { userId: payerId, status: 'ACTIVE' },
      include: { bed: { include: { floor: true } } }
    });

    if (!myBooking) {
      res.status(403).json({ message: 'Only active residents can create expenses' });
      return;
    }

    const floorId = myBooking.bed.floorId;
    const pgId = myBooking.bed.floor.pgId;

    // Calc split (Total / (Selected Roommates + Payer))
    const totalPeople = involvedUserIds.length + 1;
    const splitAmount = totalAmount / totalPeople;

    const expense = await prisma.expense.create({
      data: {
        description,
        amount: totalAmount,
        payerId,
        pgId,
        floorId,
        splits: {
          create: involvedUserIds.map((uid: string) => ({
            userId: uid,
            amount: splitAmount,
            status: 'PENDING'
          }))
        }
      },
      include: { splits: true }
    });

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create expense', error });
  }
};

export const settleSplit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { expenseId, userId } = req.body; // userId is the debtor
    const currentUserId = req.user?.id;

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId }
    });

    if (!expense || expense.payerId !== currentUserId) {
      res.status(403).json({ message: 'Only the payer can mark a split as settled' });
      return;
    }

    await prisma.expenseSplit.updateMany({
      where: { expenseId, userId },
      data: { status: 'SETTLED' }
    });

    res.status(200).json({ message: 'Split settled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Settlement error', error });
  }
};
