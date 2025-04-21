const mongoose = require('mongoose');

// MongoDB 연결 설정
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dutchmatzip', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log(`MongoDB 연결 성공: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB 연결 오류: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB; 