// multer.config.ts
import multer from 'multer';
import { Request } from 'express';
import { extname } from 'path';

// Define storage location for uploaded files
const storage = multer.diskStorage({
  filename: (req: Request, file: Express.Multer.File, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    callback(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, callback: any) => {
  // Accept images only
  if (!file.mimetype.startsWith('image/')) {
    return callback(new Error('Only image files are allowed!'), false);
  }
  callback(null, true);
};

// Multer configuration
const upload = multer({ storage, fileFilter });

export default upload;
