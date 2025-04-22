const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');
require('dotenv').config();
const axios = require('axios');

// MongoDB 연결
connectDB();

// Express 앱 초기화
const app = express();
const PORT = process.env.PORT || 5000;

// 미들웨어 설정
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// 라우트 설정
app.use('/api/restaurants', require('./routes/restaurants'));
// 인증 라우트 추가
app.use('/api/auth', require('./routes/auth'));
// 리뷰 라우트 추가
app.use('/api/reviews', require('./routes/reviews'));

// 정적 파일 제공 설정
app.use(express.static(path.join(__dirname, '../')));


const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

app.get('/api/maps-api', async (req, res) => {
  try {
    const { libraries, callback } = req.query;
    const url = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=${libraries}&callback=${callback}`;
    const response = await axios.get(url);
    res.send(response.data);
  } catch (error) {
    res.status(500).send('오류가 발생했습니다');
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../', 'index.html'));
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
}); 