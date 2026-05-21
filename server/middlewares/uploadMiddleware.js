import multer from 'multer';
import path from 'path';

//for name genration and temparory store on the uploads folder 
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// Configure multer
const upload = multer({
  storage,
  limits: { fileSize: 100000000 }, //100 MB file size limit
});

export default upload;
