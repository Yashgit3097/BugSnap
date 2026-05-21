import multer from 'multer';
import path from 'path';

// Define where to temporarily store the uploaded files before sending to Cloudinary
const storage = multer.diskStorage({
  destination(req, file, cb) {
    // We will save to a 'uploads/' folder temporarily
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// Configure multer
const upload = multer({
  storage,
  // Limit file size to 100MB (adjust as needed for 5min WebM)
  limits: { fileSize: 100000000 }, 
});

export default upload;
