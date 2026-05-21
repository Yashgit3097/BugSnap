import express from 'express';
import { uploadVideo } from '../controllers/uploadController.js';
import { protect } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// @route   POST /api/upload/video
// @desc    Upload video to cloudinary
// @access  Private
// 'upload.single('video')' tells multer to look for a file field named 'video'
router.post('/video', protect, upload.single('video'), uploadVideo);

export default router;
