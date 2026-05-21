import asyncHandler from 'express-async-handler';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// @desc    Upload video to cloudinary
// @route   POST /api/upload/video
// @access  Private
export const uploadVideo = asyncHandler(async (req, res) => {
  // Configure Cloudinary lazily inside the handler to ensure dotenv has finished loading
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  if (!req.file) {
    res.status(400);
    throw new Error('No video file provided');
  }

  // Because the video comes from extension as a WebM file, we upload it
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: 'video', // Very important for video files!
      folder: 'jam_dev_clone/videos',
    });

    // Remove the temporary file created by multer
    fs.unlinkSync(req.file.path);

    // Return the secure url provided by Cloudinary
    res.json({
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    // Attempt to remove temp file if upload fails
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500);
    const msg = (error && error.error && error.error.message) || (error && error.message) || JSON.stringify(error);
    throw new Error('Cloudinary upload failed: ' + msg);
  }
});
