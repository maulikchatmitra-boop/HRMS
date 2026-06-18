import multer from 'multer';

// Use memory storage for buffer-based uploads directly to Cloudinary
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

export default upload;
