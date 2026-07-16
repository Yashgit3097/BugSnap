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
      // Pre-generate the MP4 replay derivative during upload. Without this the
      // f_mp4 URL transcodes lazily on first view and streams without byte-range
      // support, which breaks timeline seeking the first time a session is opened.
      eager: [{ format: 'mp4', quality: 'auto' }],
      eager_async: false,
    });

    // Remove the temporary file created by multer
    fs.unlinkSync(req.file.path);

    // Fetch finalized metadata from Cloudinary
    let resourceInfo = {};
    try {
      resourceInfo = await cloudinary.api.resource(result.public_id, {
        resource_type: 'video',
      });
    } catch (apiErr) {
      console.warn('Failed to fetch detailed info from Cloudinary API:', apiErr);
    }

    // Prefer the eagerly generated (already cached, range-request capable) MP4;
    // fall back to the lazy transformation URL if eager processing failed.
    const eagerMp4 = result.eager && result.eager[0] && result.eager[0].secure_url;
    const replayVideoUrl = eagerMp4 || result.secure_url.replace('/video/upload/', '/video/upload/f_mp4,q_auto/');

    res.json({
      originalVideoUrl: result.secure_url,
      replayVideoUrl,
      duration: resourceInfo.duration || result.duration || 0,
      videoPublicId: result.public_id,
      metadata: {
        width: resourceInfo.width || result.width || 0,
        height: resourceInfo.height || result.height || 0,
        format: resourceInfo.format || result.format || 'webm',
        bytes: resourceInfo.bytes || result.bytes || 0,
        bitrate: resourceInfo.bit_rate || result.bit_rate || 0
      }
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
