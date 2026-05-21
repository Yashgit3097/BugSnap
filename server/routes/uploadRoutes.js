import express from 'express';
import { uploadVideo } from '../controllers/uploadController.js';
import { protect } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/uploadMiddleware.js';

const router = express.Router();

//Upload video to cloudinary
router.post('/video', protect, upload.single('video'), uploadVideo);

export default router;
