const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const { protect } = require('../middleware/auth');
const { uploadImage } = require('../config/cloudinary');

/**
 * @route   POST /api/reviews
 * @desc    리뷰 추가하기
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { restaurantId, rating, text, menu, price, imageUrl } = req.body;
    
    // 필수 필드 검증
    if (!restaurantId || !rating || !text) {
      return res.status(400).json({
        success: false,
        error: '필수 정보를 모두 입력해주세요.'
      });
    }
    
    // 레스토랑 검색
    const restaurant = await Restaurant.findById(restaurantId);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: '해당 레스토랑을 찾을 수 없습니다.'
      });
    }
    
    // 리뷰 추가
    const newReview = {
      rating,
      text,
      menu: menu || '',
      price: price || 0,
      imageUrl: imageUrl || '',
      date: Date.now(),
      userId: req.body.userId || '익명'
    };
    
    restaurant.reviews.unshift(newReview);
    
    // 평점 평균 계산
    if (restaurant.reviews.length > 0) {
      const totalRating = restaurant.reviews.reduce((sum, review) => sum + review.rating, 0);
      restaurant.rating = +(totalRating / restaurant.reviews.length).toFixed(1);
    }
    
    await restaurant.save();
    
    res.status(201).json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
});

/**
 * @route   GET /api/reviews/:restaurantId
 * @desc    특정 레스토랑의 리뷰 가져오기
 * @access  Public
 */
router.get('/:restaurantId', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: '해당 레스토랑을 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      count: restaurant.reviews.length,
      data: restaurant.reviews
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
});

/**
 * @route   POST /api/reviews/reviews
 * @desc    리뷰 등록하기
 * @access  Protected
 */
router.post('/reviews', protect, uploadImage.single('reviewImage'), async (req, res) => {
  try {
    const { restaurantId, rating, text, menu, price } = req.body;
    
    // 필수 필드 검증
    if (!restaurantId || !rating || !text) {
      return res.status(400).json({
        success: false,
        error: '필수 정보를 모두 입력해주세요.'
      });
    }
    
    // 레스토랑 검색
    const restaurant = await Restaurant.findById(restaurantId);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: '해당 레스토랑을 찾을 수 없습니다.'
      });
    }
    
    // 리뷰 데이터 생성 - 이미지 URL 포함
    const newReview = {
      rating,
      text,
      menu: menu || '',
      price: parseFloat(price) || 0,
      imageUrl: req.file ? req.file.path : '',
      date: Date.now(),
      userId: req.user._id.toString()
    };
    
    restaurant.reviews.unshift(newReview);
    
    // 평점 평균 계산
    if (restaurant.reviews.length > 0) {
      const totalRating = restaurant.reviews.reduce((sum, review) => sum + review.rating, 0);
      restaurant.rating = +(totalRating / restaurant.reviews.length).toFixed(1);
    }
    
    await restaurant.save();
    
    res.status(201).json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
});

module.exports = router; 