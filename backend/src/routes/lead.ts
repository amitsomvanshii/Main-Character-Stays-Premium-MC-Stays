import { Router } from 'express';
import { submitLead } from '../controllers/lead';

const router = Router();

router.post('/submit', submitLead);

export default router;
