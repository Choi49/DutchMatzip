const mongoose = require('mongoose');

// 리뷰 스키마 정의
const ReviewSchema = new mongoose.Schema({
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  menu: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    min: 0
  },
  imageUrl: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: String,
    default: '익명'
  }
});

// 레스토랑 스키마 정의
const RestaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  placeId: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['한식', '일식', '중식', '양식', '카페', '기타']
  },
  city: {
    type: String,
    required: true,
    enum: ['amsterdam', 'rotterdam', 'hague', 'utrecht', 'eindhoven', 'other']
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  hours: {
    type: String,
    trim: true
  },
  lat: {
    type: Number,
    required: true
  },
  lng: {
    type: Number,
    required: true
  },
  image: {
    type: String
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviews: [ReviewSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Restaurant', RestaurantSchema); 