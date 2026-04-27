import { Router } from 'express';
import { 
  raiseIssue, 
  signAgreement, 
  payRent,
  confirmRentReceipt, 
  closeIssue,
  simulateReminder,
  getStudentRentHistory,
  getOwnerRentHistory
} from '../controllers/resident';
import { submitCheckIn, downloadCheckInForm } from '../controllers/checkin';
import { authenticate } from '../middlewares/auth';
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/checkins/');
  },
  filename: (req, file, cb) => {
    cb(null, `checkin-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

const router = Router();

// Student Routes
router.post('/issue', authenticate, raiseIssue);
router.post('/sign', authenticate, signAgreement);
router.get('/history', authenticate, getStudentRentHistory);

// Phase 11: Digital Check-in
router.post('/checkin/:bookingId', authenticate, upload.single('photo'), submitCheckIn);
router.get('/checkin/:bookingId/download', authenticate, downloadCheckInForm);

// Manual Payment Workflow
router.post('/pay', authenticate, payRent);

// Owner Routes
router.post('/confirm-rent', authenticate, confirmRentReceipt);
router.get('/owner-history', authenticate, getOwnerRentHistory);
router.patch('/issue/:issueId/close', authenticate, closeIssue);

// Debug/Utility
router.post('/simulate-reminder', simulateReminder);

export default router;
