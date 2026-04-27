import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth';
import {
  generateQrCode,
  generateAgreement,
  submitReview,
  getMLRecommendations,
  predictOccupancy,
  getUserLifestyle,
  updateUserLifestyle,
  getRoommateCompatibility,
  checkCanReview,
  getPgReviewInsights,
  getPgVacancyInsights
} from '../controllers/advanced';
import { getResidentHubData, createExpense, settleSplit } from '../controllers/residentHub';

const router = Router();

router.get('/booking/:bookingId/qr', authenticate, generateQrCode);
router.get('/booking/:bookingId/agreement', authenticate, generateAgreement);
router.post('/pgs/:id/review', authenticate, requireRole('STUDENT'), submitReview);
router.get('/pgs/:pgId/can-review', authenticate, requireRole('STUDENT'), checkCanReview);
router.get('/pgs/:pgId/review-insights', getPgReviewInsights);
router.get('/pgs/:pgId/vacancy-forecast', authenticate, requireRole('OWNER'), getPgVacancyInsights);



// Resident Hub & Expense Tracker
router.get('/resident-hub', authenticate, requireRole('STUDENT'), getResidentHubData);
router.post('/expenses', authenticate, requireRole('STUDENT'), createExpense);
router.post('/expenses/settle', authenticate, requireRole('STUDENT'), settleSplit);

// Lifestyle Matching Routes
router.get('/lifestyle', authenticate, getUserLifestyle);
router.post('/lifestyle', authenticate, updateUserLifestyle);
router.post('/compatibility', authenticate, getRoommateCompatibility);

// ML Gateway Routes (public — no auth required so students can use without login)
router.post('/recommend', getMLRecommendations);
router.get('/predict/:pgId', predictOccupancy);

export default router;
