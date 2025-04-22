const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Cloudinary 설정
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 저장소 설정
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'dutch_matzip', // 이미지가 저장될 폴더명
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'heic'],
    transformation: [
      { width: 1000, crop: 'limit' }, // 최대 너비 제한
      { quality: 'auto', fetch_format: 'auto' } // 자동 품질 및 포맷 최적화
    ]
  }
});

// 업로드 미들웨어 생성
const uploadImage = multer({ storage });

module.exports = { cloudinary, uploadImage };