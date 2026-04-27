import { Request, Response } from 'express';
import prisma from '../prismaClient';


interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

// 1. Get all flagged (unverified) PGs
export const getFlaggedPgs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pgs = await prisma.pg.findMany({
      where: { isVerified: false },
      include: {
        owner: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(pgs);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// 2. Verify a PG (Manual Review)
export const verifyPg = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const pg = await prisma.pg.update({
      where: { id },
      data: { 
        isVerified: true,
        fraudReason: null // Clear reason on manual vouch
      }
    });
    res.status(200).json({ message: 'PG successfully verified', pg });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// 3. Delete a Fraudulent PG
export const deleteFraudPg = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await prisma.pg.delete({ where: { id } });
    res.status(200).json({ message: 'Fraudulent PG removed permanently' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// 4. Admin Stats
export const getAdminStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [totalUsers, totalPgs, pendingPgs, totalLeads] = await Promise.all([
      prisma.user.count(),
      prisma.pg.count(),
      prisma.pg.count({ where: { isVerified: false } }),
      prisma.lead.count()
    ]);
    res.status(200).json({ totalUsers, totalPgs, pendingPgs, totalLeads });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};


// 6. Get all leads (for Admin Leads Hub)
export const getLeads = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(leads);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// 7. Delete Lead
export const deleteLead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await prisma.lead.delete({ where: { id } });
    res.status(200).json({ message: 'Lead record removed.' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};
// 8. Detailed Analytics for Charts
export const getAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const range = req.query.range as string || '30d'; 
    const now = new Date();
    const dataPoints = range === '30d' ? 30 : range === '90d' ? 90 : range === '180d' ? 180 : 365;
    
    // 1. Get real current counts and active bookings for revenue calculation
    const [totalBeds, occupiedBeds, leads, pgs] = await Promise.all([
      prisma.bed.count(),
      prisma.bed.count({ where: { status: 'OCCUPIED' } }),
      prisma.lead.findMany({ select: { createdAt: true, type: true } }),
      prisma.pg.findMany({ 
        include: { 
          floors: { 
            include: { 
              beds: { 
                include: { 
                  bookings: { 
                    where: { status: 'ACTIVE' }
                  } 
                } 
              } 
            } 
          } 
        } 
      })
    ]);

    // Calculate Real Monthly Revenue
    // We look at every PG -> Floor -> Bed -> Active Booking
    let totalPlatformRevenue = 0;
    const pgStats = pgs.map(p => {
      const pBeds = p.floors.flatMap(f => f.beds);
      const pOccupiedBeds = pBeds.filter(b => b.status === 'OCCUPIED');
      
      let pgMonthlyRevenue = 0;
      pBeds.forEach(bed => {
        const activeBooking = bed.bookings[0]; // status: 'ACTIVE' filter applied in include
        if (activeBooking) {
          const baseRent = p.rentMonthly || 0;
          const multi = bed.priceMultiplier || 1.0;
          pgMonthlyRevenue += (baseRent * multi);
        }
      });

      totalPlatformRevenue += pgMonthlyRevenue;

      return {
        id: p.id,
        name: p.name,
        city: p.city,
        occupancy: pBeds.length > 0 ? Math.round((pOccupiedBeds.length / pBeds.length) * 100) : 0,
        revenue: Math.round(pgMonthlyRevenue)
      };
    });

    // 2. Fetch Historical Events for Trend Analysis (Payments & Leads)
    const startDate = new Date(now.getTime() - (dataPoints * 24 * 60 * 60 * 1000));
    
    const [historicalPayments, historicalLeads] = await Promise.all([
      prisma.payment.findMany({
        where: { confirmedAt: { gte: startDate } },
        select: { amount: true, confirmedAt: true }
      }),
      prisma.lead.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true }
      })
    ]);

    // 3. Generate Time-Series Data (Aggregated from real historical events)
    const history = [];
    for (let i = dataPoints; i >= 0; i--) {
      const d = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d.getTime() + 24 * 60 * 60 * 1000);
      const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      
      // Filter real events for this specific day
      const dayPayments = historicalPayments.filter(p => p.confirmedAt >= d && p.confirmedAt < nextD);
      const dayLeads = historicalLeads.filter(l => l.createdAt >= d && l.createdAt < nextD);
      
      const dayRevenue = dayPayments.reduce((acc, p) => acc + p.amount, 0);

      // Occupancy Trend (Approximate based on active bookings at that time)
      // Since we don't have historical snapshots, we'll keep the current occupancy 
      // as a stable baseline for recent days, but with 0 simulation.
      const pointOccupancy = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

      history.push({
        name: dateStr,
        revenue: Math.round(dayRevenue),
        occupancy: pointOccupancy,
        leads: dayLeads.length
      });
    }

    // 5. Calculate Revenue Breakdown by City
    const cityDist: Record<string, number> = {};
    pgStats.forEach(p => {
      cityDist[p.city] = (cityDist[p.city] || 0) + p.revenue;
    });
    const cityBreakdown = Object.entries(cityDist).map(([name, value]) => ({ name, value }));

    res.status(200).json({
      summary: {
        currentOccupancy: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
        totalLeads: leads.length,
        totalRevenue: Math.round(totalPlatformRevenue),
        leadBreakdown: {
          tours: leads.filter(l => l.type === 'TOUR').length,
          callbacks: leads.filter(l => l.type === 'CALLBACK').length
        }
      },
      timeSeries: history,
      pgBreakdown: pgStats,
      cityBreakdown: cityBreakdown
    });
  } catch (error) {
    res.status(500).json({ message: 'Analytics Error', error });
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        createdAt: true,
        _count: {
          select: { bookings: true, pgs: true }
        },
        bookings: {
          orderBy: { startDate: 'desc' },
          take: 1,
          select: { startDate: true, status: true }
        },
        payments: {
          orderBy: { confirmedAt: 'desc' },
          take: 1,
          select: { confirmedAt: true, amount: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    // Use a transaction to clear everything tied to this user
    await prisma.$transaction(async (tx) => {
      // 1. Delete all reviews by or for this user
      await tx.review.deleteMany({ where: { userId: id } });

      // 2. Chat History
      await tx.message.deleteMany({ where: { senderId: id } });
      await tx.conversation.deleteMany({ where: { OR: [{ studentId: id }, { ownerId: id }] } });

      // 3. Financials
      await tx.expenseSplit.deleteMany({ where: { userId: id } });
      await tx.expense.deleteMany({ where: { payerId: id } });
      await tx.payment.deleteMany({ where: { userId: id } });

      // 4. Bookings & Issues
      await tx.issue.deleteMany({ where: { studentId: id } });
      await tx.booking.deleteMany({ where: { userId: id } });

      // 5. If they are an Owner, we must clear their PGs entirely
      const userPgs = await tx.pg.findMany({ where: { ownerId: id } });
      for (const pg of userPgs) {
        // Clear all nested data for each PG
        await tx.floor.deleteMany({ where: { pgId: pg.id } });
      }
      await tx.pg.deleteMany({ where: { ownerId: id } });

      // 6. Finally delete the user
      await tx.user.delete({ where: { id } });
    });

    res.status(200).json({ message: 'User and all associated data permanently deleted.' });
  } catch (error) {
    console.error('Delete User Error:', error);
    res.status(500).json({ message: 'Failed to delete user.', error });
  }
};
