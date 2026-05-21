import express from 'express';
import {
  createSession,
  completeSession,
  getMySessions,
  getPublicSession,
  deleteSession,
} from '../controllers/sessionController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

//Create a new recording session
router.post('/create', protect, createSession);

//Finish recording and save all logs
router.post('/:id/complete', protect, completeSession);

//Get all user sessions
router.get('/my', protect, getMySessions);

//Get session data for replay link
router.get('/public/:publicId', getPublicSession);

//Delete session and its associated logs
router.delete('/:id', protect, deleteSession);

export default router;
