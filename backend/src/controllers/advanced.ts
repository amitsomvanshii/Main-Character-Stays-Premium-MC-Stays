import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import prisma from '../prismaClient';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export const generateQrCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = req.params.bookingId as string;
    
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    // Using the frontend URL so scanning the QR navigates to a visual page
    // Note: Since this is localhost, scanning with a mobile device won't work
    // unless you replace 'localhost' with your computer's local IP address. 
    const qrData = `${FRONTEND_URL}/checkin/${bookingId}`;
    const qrImage = await QRCode.toDataURL(qrData);

    res.status(200).json({ qrCodeUrl: qrImage });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const generateAgreement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = req.params.bookingId as string;
    
    const booking = await prisma.booking.findUnique({ 
      where: { id: bookingId },
      include: { user: true, bed: { include: { floor: { include: { pg: true } } } } }
    });

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Agreement_${bookingId}.pdf`);

    doc.pipe(res);

    doc.fontSize(20).text('Smart PG Finder - Rental Agreement', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();
    
    const residentName = booking.occupantName || booking.user.name;
    doc.text(`This agreement is between the PG Provider ("${booking.bed.floor.pg.name}") and the Student ("${residentName}").`);
    doc.moveDown();
    
    doc.text(`Student Identity (Aadhar): ${booking.aadharNumber || 'Not Provided'}`);
    doc.moveDown();

    doc.text(`Bed Allocated: ${booking.bed.identifier}`);
    doc.text(`Floor: ${booking.bed.floor.floorNumber}`);
    doc.text(`Monthly Rent: Rs ${booking.bed.floor.pg.rentMonthly * booking.bed.priceMultiplier}`);
    doc.moveDown();

    doc.text('Terms and Conditions:');
    doc.text('1. The rent is to be paid by the 5th of every month.');
    doc.text('2. A valid ID proof must be submitted at the time of check-in.');
    doc.text('3. The student is liable for any damages caused to the PG property.');
    doc.moveDown();
    
    doc.text('Signature of Owner: _________________');
    doc.text('Signature of Student: _________________');

    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const submitReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pgId = req.params.id as string;
    const { rating, text } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // --- Verified Resident Check ---
    const residentBooking = await prisma.booking.findFirst({
      where: {
        userId,
        bed: { floor: { pgId } }
      }
    });

    if (!residentBooking) {
      res.status(403).json({ message: 'Only verified residents who have stayed at this PG can leave a review.' });
      return;
    }

    const review = await prisma.review.create({
      data: {
        pgId,
        userId,
        rating: Number(rating),
        text
      }
    });

    const allReviews = await prisma.review.findMany({ where: { pgId } });
    const avgScore = allReviews.reduce((acc, curr) => acc + curr.rating, 0) / allReviews.length;

    await prisma.pg.update({
      where: { id: pgId },
      data: { pgScore: avgScore }
    });

    res.status(201).json({ review, newScore: avgScore });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// ─── ML Gateway Endpoints ─────────────────────────────────────────────────────

export const getMLRecommendations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { max_budget, facilities_count, importance_score } = req.body;

    // 1. Fetch all PGs from DB
    const allPgs = await prisma.pg.findMany();

    if (allPgs.length === 0) {
      res.status(200).json({ recommendations: [] });
      return;
    }

    // 2. Build ML payload
    const available_pgs = allPgs.map(pg => ({
      id: pg.id,
      rent: pg.rentMonthly,
      facilities_count: Array.isArray(pg.facilities) ? (pg.facilities as any[]).length : 0,
      pg_score: pg.pgScore ?? 0,
    }));

    const mlPayload = {
      preferences: {
        max_budget: Number(max_budget),
        preferred_facilities_count: Number(facilities_count),
        importance_score: Number(importance_score),
      },
      available_pgs,
    };

    // 3. Call Python ML service
    const mlRes = await fetch(`${ML_SERVICE_URL}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mlPayload),
    });

    if (!mlRes.ok) throw new Error('ML service error');

    const mlData: any = await mlRes.json();

    // 4. Hydrate recommendations — preserve ML sort order
    const matchDistanceMap: Record<string, number> = {};
    mlData.recommendations.forEach((r: any) => {
      matchDistanceMap[r.pg_id] = r.match_distance;
    });
    const pgById: Record<string, any> = {};
    allPgs.forEach(pg => { pgById[pg.id] = pg; });

    // Build in ML order, not DB order
    const hydratedPgs = mlData.recommendations
      .filter((r: any) => pgById[r.pg_id]) // safety check
      .map((r: any) => ({
        ...pgById[r.pg_id],
        matchDistance: r.match_distance,
      }));

    res.status(200).json({ recommendations: hydratedPgs });
  } catch (error) {
    res.status(500).json({ message: 'ML Gateway Error', error: String(error) });
  }
};

export const predictOccupancy = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pgId = req.params.pgId as string;

    // 1. Get the PG with all floors and beds
    const pg = await prisma.pg.findUnique({
      where: { id: pgId },
      include: {
        floors: {
          include: { beds: true }
        }
      }
    });

    if (!pg) {
      res.status(404).json({ message: 'PG not found' });
      return;
    }

    const allBeds = pg.floors.flatMap(f => f.beds);
    const totalBeds = allBeds.length;
    const occupiedBeds = allBeds.filter(b => b.status === 'OCCUPIED').length;

    if (totalBeds === 0) {
      res.status(200).json({ predicted_full_date: 'N/A', days_until_full: -1, occupiedBeds: 0, totalBeds: 0 });
      return;
    }

    // 2. Synthesize a realistic historical growth timeline using current occupancy as anchor.
    //    We simulate the past 30 days of data assuming a linear fill-up from ~30% capacity.
    const startOccupancy = Math.max(0, Math.round(occupiedBeds * 0.4)); // 30 days ago
    const history = [];
    for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
      const progress = (30 - daysAgo) / 30;
      const simulatedOccupants = Math.round(startOccupancy + progress * (occupiedBeds - startOccupancy));
      history.push({ days_ago: daysAgo, occupants: Math.min(simulatedOccupants, totalBeds) });
    }

    // 3. Call Python ML service
    const mlPayload = { pg_id: pgId, total_beds: totalBeds, history };
    const mlRes = await fetch(`${ML_SERVICE_URL}/predict-occupancy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mlPayload),
    });

    if (!mlRes.ok) throw new Error('ML service error');

    const mlData: any = await mlRes.json();

    res.status(200).json({
      ...mlData,
      occupiedBeds,
      totalBeds,
    });
  } catch (error) {
    res.status(500).json({ message: 'ML Gateway Error', error: String(error) });
  }
};

export const getUserLifestyle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: { lifestyle: true }
    });
    res.status(200).json(user?.lifestyle || null);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const updateUserLifestyle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const lifestyle = req.body;
    await prisma.user.update({
      where: { id: req.user?.id },
      data: { lifestyle }
    });
    res.status(200).json({ message: 'Lifestyle profile updated', lifestyle });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const getRoommateCompatibility = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userLifestyle, occupantsLifestyles } = req.body;
    
    if (!userLifestyle || !occupantsLifestyles || occupantsLifestyles.length === 0) {
      res.status(200).json({ scores: [] });
      return;
    }

    const mlRes = await fetch(`${ML_SERVICE_URL}/roommate-compatibility`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_lifestyle: userLifestyle,
        occupants_lifestyles: occupantsLifestyles
      }),
    });

    if (!mlRes.ok) throw new Error('ML service error');
    const data: any = await mlRes.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: 'ML Gateway Error', error: String(error) });
  }
};

export const checkCanReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pgId = req.params.pgId as string;
    const userId = req.user?.id;

    if (!userId) {
      res.status(200).json({ canReview: false });
      return;
    }

    const booking = await prisma.booking.findFirst({
      where: {
        userId,
        bed: { floor: { pgId } }
      }
    });

    res.status(200).json({ canReview: !!booking });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const getPgReviewInsights = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pgId = req.params.pgId as string;

    const reviews = await prisma.review.findMany({
      where: { pgId },
      select: { text: true }
    });

    if (reviews.length < 3) {
      res.status(200).json({ 
        hasInsights: false, 
        message: 'At least 3 reviews are needed to generate AI insights.' 
      });
      return;
    }

    const reviewTexts = reviews.map(r => r.text).filter(t => t && t.length > 5);

    const mlRes = await fetch(`${ML_SERVICE_URL}/summarize-reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviews: reviewTexts }),
    });

    if (!mlRes.ok) throw new Error('ML service error');
    const data: any = await mlRes.json();

    res.status(200).json({
      hasInsights: true,
      ...data
    });
  } catch (error) {
    res.status(500).json({ message: 'ML Gateway Error', error: String(error) });
  }
};

export const getPgVacancyInsights = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pgId = req.params.pgId as string;
    const userId = req.user?.id;

    const pg = await prisma.pg.findUnique({
      where: { id: pgId },
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
    });

    if (!pg) {
      res.status(404).json({ message: 'PG not found' });
      return;
    }

    if (pg.ownerId !== userId) {
      res.status(403).json({ message: 'Forbidden: You do not own this PG' });
      return;
    }

    const now = new Date();
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const floorData = pg.floors.map(floor => {
      const beds = floor.beds;
      const occupied = beds.filter(b => b.status === 'OCCUPIED');
      const upcomingVacancies = occupied.filter(b => {
        const activeBooking = b.bookings[0];
        if (!activeBooking || !activeBooking.endDate) return false;
        const endDate = new Date(activeBooking.endDate);
        return endDate <= in14Days;
      }).length;

      return {
        floor_number: floor.floorNumber,
        total_beds: beds.length,
        occupied_beds: occupied.length,
        upcoming_vacancies: upcomingVacancies
      };
    });

    const mlRes = await fetch(`${ML_SERVICE_URL}/vacancy-forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pg_id: pgId, floors: floorData }),
    });

    if (!mlRes.ok) throw new Error('ML service error');
    const data: any = await mlRes.json();

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: 'ML Gateway Error', error: String(error) });
  }
};
