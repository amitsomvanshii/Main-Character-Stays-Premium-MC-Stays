import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth';
import { 
  getFlaggedPgs, verifyPg, deleteFraudPg, getAdminStats, 
  getAllUsers, getLeads, deleteLead, getAnalytics, deleteUser
} from '../controllers/admin';

const router = Router();

// All routes here require ADMIN role
router.use(authenticate, requireRole('ADMIN'));

router.get('/flagged', getFlaggedPgs);
router.get('/stats', getAdminStats);
router.get('/analytics', getAnalytics);
router.get('/users', getAllUsers);
router.get('/leads', getLeads);
router.delete('/lead/:id', deleteLead);
router.delete('/user/:id', deleteUser);
router.post('/verify/:id', verifyPg);
router.delete('/fraud/:id', deleteFraudPg);

export default router;
