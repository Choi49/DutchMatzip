const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const { protect, authorize } = require('../middleware/auth');
const { uploadImage } = require('../config/cloudinary');
const mongoose = require('mongoose');

/**
 * @route   POST /api/reviews
 * @desc    리뷰 추가하기
 * @access  Protected
 */
router.post('/', protect, async (req, res) => {
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
    
    // 리뷰 추가 - userId를 ObjectId로 저장
    const newReview = {
      _id: new mongoose.Types.ObjectId(),
      rating,
      text,
      menu: menu || '',
      price: price || 0,
      imageUrl: imageUrl || '',
      date: Date.now(),
      userId: new mongoose.Types.ObjectId(req.user._id), // ObjectId 타입으로 저장
      username: req.user.username // 사용자 이름도 함께 저장
    };
    console.log(newReview);
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
 * @desc    리뷰 등록하기 (이미지 업로드 포함)
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
      _id: new mongoose.Types.ObjectId(), // 리뷰에 ID 할당
      rating,
      text,
      menu: menu || '',
      price: parseFloat(price) || 0,
      imageUrl: req.file ? req.file.path : '',
      date: Date.now(),
      userId: new mongoose.Types.ObjectId(req.user._id), // ObjectId 타입으로 저장
      username: req.user.username // 사용자 이름도 함께 저장
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
 * @route   PUT /api/reviews/:restaurantId/:reviewId
 * @desc    리뷰 수정하기
 * @access  Protected (본인 리뷰 또는 관리자만)
 */
router.put('/:restaurantId/:reviewId', protect, async (req, res) => {
  try {
    const { restaurantId, reviewId } = req.params;
    const { rating, text, menu, price } = req.body;
    
    // 필수 필드 검증
    if (!rating || !text) {
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
    
    // 리뷰 검색
    const reviewIndex = restaurant.reviews.findIndex(review => 
      review._id.toString() === reviewId
    );
    
    if (reviewIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '해당 리뷰를 찾을 수 없습니다.'
      });
    }
    
    const review = restaurant.reviews[reviewIndex];
    
    // 권한 확인: 본인 리뷰 또는 관리자인지 확인
    // ObjectId 비교를 위해 toString() 사용
    const reviewUserId = review.userId.toString();
    const currentUserId = req.user._id.toString();
    
    if (reviewUserId !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '이 리뷰를 수정할 권한이 없습니다.'
      });
    }
    
    // 리뷰 업데이트
    restaurant.reviews[reviewIndex].rating = rating;
    restaurant.reviews[reviewIndex].text = text;
    restaurant.reviews[reviewIndex].menu = menu || '';
    restaurant.reviews[reviewIndex].price = parseFloat(price) || 0;
    
    // 평점 평균 다시 계산
    if (restaurant.reviews.length > 0) {
      const totalRating = restaurant.reviews.reduce((sum, review) => sum + review.rating, 0);
      restaurant.rating = +(totalRating / restaurant.reviews.length).toFixed(1);
    }
    
    await restaurant.save();
    
    res.json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    console.error('리뷰 수정 오류:', error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
});

/**
 * @route   DELETE /api/reviews/:restaurantId/:reviewId
 * @desc    리뷰 삭제하기
 * @access  Protected (본인 리뷰 또는 관리자만)
 */
router.delete('/:restaurantId/:reviewId', protect, async (req, res) => {
  try {
    const { restaurantId, reviewId } = req.params;
    
    // 레스토랑 검색
    const restaurant = await Restaurant.findById(restaurantId);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: '해당 레스토랑을 찾을 수 없습니다.'
      });
    }
    
    // 리뷰 검색
    const reviewIndex = restaurant.reviews.findIndex(review => 
      review._id.toString() === reviewId
    );
    
    if (reviewIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '해당 리뷰를 찾을 수 없습니다.'
      });
    }
    
    const review = restaurant.reviews[reviewIndex];
    
    // 권한 확인: 본인 리뷰 또는 관리자인지 확인
    // ObjectId 비교를 위해 toString() 사용
    const reviewUserId = review.userId.toString();
    const currentUserId = req.user._id.toString();
    
    if (reviewUserId !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '이 리뷰를 삭제할 권한이 없습니다.'
      });
    }
    
    // 리뷰 삭제
    restaurant.reviews.splice(reviewIndex, 1);
    
    // 평점 평균 다시 계산
    if (restaurant.reviews.length > 0) {
      const totalRating = restaurant.reviews.reduce((sum, review) => sum + review.rating, 0);
      restaurant.rating = +(totalRating / restaurant.reviews.length).toFixed(1);
    } else {
      restaurant.rating = 0;
    }
    
    await restaurant.save();
    
    res.json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    console.error('리뷰 삭제 오류:', error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
});

module.exports = router; 