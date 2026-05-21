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

// @route   POST /api/sessions/create
// @desc    Create a new recording session
// @access  Private (only logged in users can create)
router.post('/create', protect, createSession);

// @route   POST /api/sessions/:id/complete
// @desc    Finish recording and save all logs
// @access  Private
router.post('/:id/complete', protect, completeSession);

// @route   GET /api/sessions/my
// @desc    Get all sessions for the dashboard
// @access  Private
router.get('/my', protect, getMySessions);

// @route   GET /api/sessions/public/:publicId
// @desc    Get session data for replay link
// @access  Public (anyone with the link can view)
router.get('/public/:publicId', getPublicSession);

// @route   DELETE /api/sessions/:id
// @desc    Delete session and its associated logs
// @access  Private
router.delete('/:id', protect, deleteSession);

export default router;
