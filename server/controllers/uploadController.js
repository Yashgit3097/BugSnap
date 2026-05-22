import asyncHandler from 'express-async-handler';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

//Upload video to cloudinary
export const uploadVideo = asyncHandler(async (req, res) => {
  //configure cloudinary 
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  if (!req.file) {
    res.status(400);
    throw new Error('No video file provided');
  }

  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: 'video',
      folder: 'debugsnap/videos',
    });

    // Remove the temporary file created by multer
    fs.unlinkSync(req.file.path);

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500);
    const msg = (error && error.error && error.error.message) || (error && error.message) || JSON.stringify(error);
    throw new Error('Cloudinary upload failed: ' + msg);
  }
});
