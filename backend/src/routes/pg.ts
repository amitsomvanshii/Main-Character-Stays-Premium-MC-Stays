import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth';
import { 
  createPg, getPgs, getMyPgs, getPgLayout, addFloor, addBed, 
  bookBed, uploadPgPhotos, getMyBookings, cancelBooking, 
  uploadBedPhotos, deletePg, deleteFloor, deleteBed,
  updatePgDetails
} from '../controllers/pg';
import { upload } from '../middlewares/upload';

const router = Router();

// Public / Authenticated
router.get('/', authenticate, getPgs);
router.get('/mine', authenticate, requireRole('OWNER'), getMyPgs);
router.get('/my-bookings', authenticate, requireRole('STUDENT'), getMyBookings);
router.get('/:id/layout', authenticate, getPgLayout);
router.post('/book-bed', authenticate, requireRole('STUDENT'), upload.single('passportPhoto'), bookBed);
router.post('/booking/:id/cancel', authenticate, requireRole('STUDENT'), cancelBooking);

// Owner Only
router.post('/', authenticate, requireRole('OWNER'), createPg);
router.patch('/:pgId/details', authenticate, requireRole('OWNER'), updatePgDetails);
router.post('/floor', authenticate, requireRole('OWNER'), addFloor);
router.post('/bed', authenticate, requireRole('OWNER'), addBed);
router.post('/bed/:id/photos', authenticate, requireRole('OWNER'), upload.array('photos', 3), uploadBedPhotos);
router.post('/:pgId/photos', authenticate, requireRole('OWNER'), upload.array('photos', 8), uploadPgPhotos);

router.delete('/:id', authenticate, requireRole('OWNER'), deletePg);
router.delete('/floor/:id', authenticate, requireRole('OWNER'), deleteFloor);
router.delete('/bed/:id', authenticate, requireRole('OWNER'), deleteBed);

export default router;
