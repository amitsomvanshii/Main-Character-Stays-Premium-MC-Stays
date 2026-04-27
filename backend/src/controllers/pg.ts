import { Response } from 'express'; // Triggering TS re-check 
import { AuthRequest } from '../middlewares/auth';
import prisma from '../prismaClient';
import path from 'path';
import { getFileUrl, getFileUrls } from '../utils/uploadHelper';

// ─── Photo Upload ─────────────────────────────────────────────────────────────
export const uploadPgPhotos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pgId = req.params.pgId as string;
    const ownerId = req.user?.id;

    const pg = await prisma.pg.findUnique({ where: { id: pgId } });
    if (!pg || pg.ownerId !== ownerId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ message: 'No files uploaded' });
      return;
    }

    const newUrls = getFileUrls(files);

    const updated = await prisma.pg.update({
      where: { id: pgId },
      data: { photos: { push: newUrls } },
    });

    res.status(200).json({ photos: updated.photos });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: String(error) });
  }
};

// 1. Owner: Create PG
export const createPg = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, state, city, address, rentMonthly, facilities } = req.body;
    const ownerId = req.user?.id;

    if (!ownerId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const pg = await prisma.pg.create({
      data: {
        ownerId,
        name,
        state,
        city,
        address,
        rentMonthly: Number(rentMonthly),
        facilities,
      },
    });

    // ─── AI Fraud Check ───
    try {
      // 1. Fetch other PGs to check for duplicates
      const otherPgs = await prisma.pg.findMany({
        where: { NOT: { id: pg.id } },
        select: { name: true, address: true, city: true }
      });

      // 2. Call ML Microservice
      const mlRes = await fetch(`http://localhost:8000/detect-fraud`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pg.name,
          rent: pg.rentMonthly,
          address: pg.address,
          city: pg.city,
          facilities: Array.isArray(pg.facilities) ? pg.facilities : [],
          other_pgs: otherPgs
        })
      });

      if (mlRes.ok) {
        const fraudResult: any = await mlRes.json();
        if (fraudResult.is_suspicious) {
          await prisma.pg.update({
            where: { id: pg.id as string },
            data: {
              isVerified: false,
              fraudReason: fraudResult.reasons.join(' | ')
            }
          });
        }

      }
    } catch (err) {
      console.error('Fraud Check Failed:', err);
    }

    res.status(201).json(pg);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// 1b. Owner: Update PG Description & Rules
export const updatePgDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pgId = req.params.pgId as string;
    const ownerId = req.user?.id;
    const { description, rules, securityDeposit, lockInDays, onboardingFee } = req.body;

    const pg = await prisma.pg.findUnique({ where: { id: pgId } });
    if (!pg || pg.ownerId !== ownerId) {
      res.status(403).json({ message: 'Forbidden: You do not own this PG' });
      return;
    }

    const rulesArray: string[] = Array.isArray(rules) ? rules : (pg.rules as string[]);

    const updated = await prisma.pg.update({
      where: { id: pgId },
      data: {
        description: (description as string | undefined) ?? pg.description,
        rules: rulesArray,
        securityDeposit: securityDeposit !== undefined ? Number(securityDeposit) : pg.securityDeposit,
        lockInDays: lockInDays !== undefined ? Number(lockInDays) : pg.lockInDays,
        onboardingFee: onboardingFee !== undefined ? Number(onboardingFee) : pg.onboardingFee,
      }
    });

    res.status(200).json(updated);
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error?.message });
  }
};

// 2a. Owner: Get only MY PGs

export const getMyPgs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    if (!ownerId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const pgs = await prisma.pg.findMany({
      where: { ownerId },
      include: {
        floors: {
          include: {
            beds: {
              include: {
                bookings: {
                  include: { 
                    user: { select: { name: true } },
                    issues: true 
                  },
                  orderBy: { startDate: 'desc' }
                }
              }
            }
          }
        }
      }
    });
    res.status(200).json(pgs);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// 2b. Both: Get all PGs (Search functionality)
export const getPgs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const city = req.query.city as string | undefined;
    const state = req.query.state as string | undefined;
    
    // Hide unverified (FRAUD) PGs in search results
    const filters: any = { isVerified: true };
    if (city) filters.city = { contains: city, mode: 'insensitive' };
    if (state) filters.state = { contains: state, mode: 'insensitive' };

    const pgs = await prisma.pg.findMany({ where: filters });
    res.status(200).json(pgs);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// 3. Both: Get PG detail with structure
export const getPgLayout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const pg = await prisma.pg.findUnique({
      where: { id },
      include: {
        reviews: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        },
        floors: {
          include: {
            beds: {
              include: {
                bookings: {
                  where: { status: 'ACTIVE' },
                  select: { 
                    id: true, 
                    user: { 
                      select: { 
                        name: true,
                        lifestyle: true 
                      } 
                    } 
                  }
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

    res.status(200).json(pg);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// 4. Owner: Add Floor
export const addFloor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { pgId, floorNumber } = req.body;
    const floor = await prisma.floor.create({
      data: {
        pgId,
        floorNumber: Number(floorNumber)
      }
    });
    res.status(201).json(floor);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// 5. Owner: Add Bed to Floor
export const addBed = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { floorId, identifier, priceMultiplier } = req.body;
    const bed = await prisma.bed.create({
      data: {
        floorId,
        identifier,
        priceMultiplier: Number(priceMultiplier || 1.0)
      }
    });
    res.status(201).json(bed);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// 6. Student: Book Bed
export const bookBed = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { bedId, aadharNumber, occupantName } = req.body;
    const userId = req.user?.id;

    console.log('[bookBed] body:', { bedId, aadharNumber, occupantName, userId });

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!aadharNumber || !/^\d{12}$/.test(aadharNumber)) {
      res.status(400).json({ message: 'Valid 12-digit Aadhar number is required' });
      return;
    }

    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ message: 'Passport size photo is required' });
      return;
    }

    const passportUrl = getFileUrl(file);
    console.log('[bookBed] passportUrl:', passportUrl);

    // Check if student already has an active booking
    const existingBooking = await prisma.booking.findFirst({
      where: { userId, status: 'ACTIVE' }
    });
    if (existingBooking) {
      res.status(400).json({ message: 'You already have an active booking. Cancel your current booking before booking a new bed.' });
      return;
    }

    // Check bed is EMPTY
    const bed = await prisma.bed.findUnique({ where: { id: bedId as string } });
    console.log('[bookBed] bed found:', bed?.id, bed?.status);

    if (!bed) {
      res.status(404).json({ message: 'Bed not found' });
      return;
    }

    if (bed.status === 'OCCUPIED') {
      res.status(400).json({ message: 'This bed is already occupied. Please choose another bed.' });
      return;
    }

    // Step 1: Create booking
    const bookingData: any = {
      userId,
      bedId,
      status: 'ACTIVE',
      aadharNumber,
      passportUrl,
    };

    // Safely add occupantName only if Prisma client supports it
    if (occupantName) {
      try {
        bookingData.occupantName = occupantName;
      } catch (_) {}
    }

    const booking = await prisma.booking.create({ data: bookingData });
    console.log('[bookBed] booking created:', booking.id);

    // Step 2: Mark bed as occupied
    const updatedBed = await prisma.bed.update({
      where: { id: bedId as string },
      data: { status: 'OCCUPIED' },
      include: { floor: true }
    });
    console.log('[bookBed] bed updated to OCCUPIED');

    // Step 3: Emit live update
    if (req.io) {
      req.io.to(`pg_${updatedBed.floor.pgId}`).emit('bed_status_changed', {
        pgId: updatedBed.floor.pgId,
        bedId: updatedBed.id,
        newStatus: updatedBed.status
      });
    }

    res.status(200).json({ booking, bed: updatedBed });
  } catch (error: any) {
    console.error('[bookBed ERROR]', error?.message, error?.code);
    res.status(500).json({ 
      message: 'Server Error', 
      error: error?.message || String(error),
      code: error?.code
    });
  }
};

// 7. Student: Get My Bookings

export const getMyBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        user: true, // Needed for AgreementSigner
        issues: true, // Needed for status checks
        bed: {
          include: {
            floor: {
              include: {
                pg: true
              }
            }
          }
        }
      },
      orderBy: { startDate: 'desc' }
    });

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// 8. Student: Cancel Booking
export const cancelBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = req.params.id as string;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { bed: { include: { floor: true } } }
    });

    if (!booking || booking.userId !== userId) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    if (booking.status !== 'ACTIVE') {
      res.status(400).json({ message: 'Booking is not active' });
      return;
    }

    const [updatedBooking, updatedBed] = await prisma.$transaction([
      prisma.booking.update({
        where: { id: bookingId as string },
        data: { status: 'CANCELLED', endDate: new Date() }
      }),
      prisma.bed.update({
        where: { id: booking.bedId as string },
        data: { status: 'EMPTY' }
      })
    ]);


    if (req.io && booking) {
      const pgId = (booking as any).bed?.floor?.pgId;
      if (pgId) {
        req.io.to(`pg_${pgId}`).emit('bed_status_changed', {
          pgId,
          bedId: booking.bedId,
          newStatus: 'EMPTY'
        });
      }
    }

    res.status(200).json({ message: 'Booking cancelled globally', booking: updatedBooking });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// 9. Owner: Upload Bed Photos
export const uploadBedPhotos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bedId = req.params.id as string;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ message: 'No photos uploaded' });
      return;
    }

    const bed = await prisma.bed.findUnique({ where: { id: bedId } });
    if (!bed) {
      res.status(404).json({ message: 'Bed not found' });
      return;
    }

    const newPhotoUrls = getFileUrls(files);

    const updatedBed = await prisma.bed.update({
      where: { id: bedId },
      data: {
        photos: {
          push: newPhotoUrls
        }
      }
    });

    res.status(200).json({ message: 'Photos uploaded successfully', bed: updatedBed });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// 10. Owner: Delete PG
export const deletePg = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const ownerId = req.user?.id;

    const pg = await prisma.pg.findUnique({
      where: { id },
      include: { floors: { include: { beds: true } } }
    });

    if (!pg || pg.ownerId !== ownerId) {
      res.status(404).json({ message: 'PG not found' });
      return;
    }

    // Check if any bed in the PG is OCCUPIED
    const hasOccupied = pg.floors.some(f => f.beds.some(b => b.status === "OCCUPIED"));
    if (hasOccupied) {
      res.status(400).json({ message: 'Cannot delete PG while it has occupied beds' });
      return;
    }

    await prisma.pg.delete({ where: { id } });
    res.status(200).json({ message: 'PG deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// 11. Owner: Delete Floor
export const deleteFloor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const ownerId = req.user?.id;

    const floor = await prisma.floor.findUnique({
      where: { id },
      include: { pg: true, beds: true }
    });

    if (!floor || floor.pg.ownerId !== ownerId) {
      res.status(404).json({ message: 'Floor not found' });
      return;
    }

    // Check if any bed on the floor is OCCUPIED
    const hasOccupied = floor.beds.some(b => b.status === "OCCUPIED");
    if (hasOccupied) {
      res.status(400).json({ message: 'Cannot delete floor while it has occupied beds' });
      return;
    }

    await prisma.floor.delete({ where: { id } });
    res.status(200).json({ message: 'Floor deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// 12. Owner: Delete Bed
export const deleteBed = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const ownerId = req.user?.id;

    const bed = await prisma.bed.findUnique({
      where: { id },
      include: { floor: { include: { pg: true } } }
    });

    if (!bed || bed.floor.pg.ownerId !== ownerId) {
      res.status(404).json({ message: 'Bed not found' });
      return;
    }

    if (bed.status === "OCCUPIED") {
      res.status(400).json({ message: 'Cannot delete an occupied bed' });
      return;
    }

    await prisma.bed.delete({ where: { id } });
    res.status(200).json({ message: 'Bed deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};
