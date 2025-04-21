const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Restaurant 스키마 정의
const RestaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['한식', '일식', '중식', '양식', '카페', '기타'],
    default: '기타'
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  lat: {
    type: Number,
    required: true
  },
  lng: {
    type: Number,
    required: true
  },
  placeId: {
    type: String
  },
  rating: {
    type: Number,
    default: 0
  },
  image: {
    type: String,
    default: "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?q=80&w=1470&auto=format&fit=crop"
  },
  reviews: [
    {
      rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
      },
      text: {
        type: String,
        required: true
      },
      menu: String,
      price: Number,
      imageUrl: String,
      date: {
        type: Date,
        default: Date.now
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 검색을 위한 인덱스 설정
RestaurantSchema.index({ name: 'text', category: 'text', address: 'text' });

const Restaurant = mongoose.model('Restaurant', RestaurantSchema);

// 모든 레스토랑 조회
router.get('/', async (req, res) => {
  try {
    // 필터링 옵션
    const filter = {};
    if (req.query.category) {
      const categories = req.query.category.split(',');
      filter.category = { $in: categories };
    }
    if (req.query.city) {
      filter.city = req.query.city;
    }

    // 정렬 옵션
    const sortOptions = {};
    if (req.query.sort === 'rating') {
      sortOptions.rating = -1;
    } else {
      sortOptions.createdAt = -1; // 기본: 최신순
    }

    const restaurants = await Restaurant.find(filter)
      .sort(sortOptions)
      .lean();

    res.json({
      success: true,
      count: restaurants.length,
      data: restaurants.map(restaurant => ({
        ...restaurant,
        id: restaurant._id
      }))
    });
  } catch (error) {
    console.error('레스토랑 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
});

// 레스토랑 검색
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    
    // 텍스트 검색과 부분 일치 검색 결합
    const result = await Restaurant.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } },
        { address: { $regex: query, $options: 'i' } }
      ]
    }).lean();

    res.json({
      success: true,
      count: result.length,
      data: result.map(restaurant => ({
        ...restaurant,
        id: restaurant._id
      }))
    });
  } catch (error) {
    console.error('레스토랑 검색 오류:', error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
});

// 특정 레스토랑 상세 조회
router.get('/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).lean();
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: '해당 레스토랑을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: {
        ...restaurant,
        id: restaurant._id
      }
    });
  } catch (error) {
    console.error('레스토랑 상세 조회 오류:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: '유효하지 않은 레스토랑 ID입니다.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
});

// 새 레스토랑 등록
router.post('/', async (req, res) => {
  try {
    const { name, category, address, city, lat, lng, placeId, image } = req.body;

    // 필수 필드 검증
    if (!name || !category || !city || !lat || !lng) {
      return res.status(400).json({
        success: false,
        error: '필수 정보가 누락되었습니다.'
      });
    }

    // 중복 확인: 동일한 위치 또는 place_id
    let duplicateQuery = {};
    
    if (placeId) {
      duplicateQuery.placeId = placeId;
    } else {
      // 위도/경도가 매우 가까운 경우 (약 30m 이내) 중복으로 간주
      const latRange = 0.0003; // 약 30미터
      const lngRange = 0.0003; // 약 30미터
      
      duplicateQuery = {
        lat: { $gt: lat - latRange, $lt: lat + latRange },
        lng: { $gt: lng - lngRange, $lt: lng + lngRange }
      };
    }

    const duplicate = await Restaurant.findOne(duplicateQuery);
    
    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: '이미 등록된 장소입니다.',
        duplicateId: duplicate._id
      });
    }

    // 새 레스토랑 생성
    const newRestaurant = new Restaurant({
      name,
      category,
      address,
      city,
      lat,
      lng,
      placeId,
      image: image || undefined
    });

    await newRestaurant.save();

    res.status(201).json({
      success: true,
      data: {
        ...newRestaurant.toObject(),
        id: newRestaurant._id
      }
    });
  } catch (error) {
    console.error('레스토랑 등록 오류:', error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
});

// 리뷰 등록
router.post('/reviews', async (req, res) => {
  try {
    const { restaurantId, rating, text, menu, price, imageUrl } = req.body;

    // 필수 필드 검증
    if (!restaurantId || !rating || !text) {
      return res.status(400).json({
        success: false,
        error: '필수 정보가 누락되었습니다.'
      });
    }

    // 레스토랑 찾기
    const restaurant = await Restaurant.findById(restaurantId);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: '해당 레스토랑을 찾을 수 없습니다.'
      });
    }

    // 리뷰 데이터 생성
    const newReview = {
      rating,
      text,
      menu: menu || '',
      price: price || 0,
      imageUrl: imageUrl || '',
      date: Date.now()
    };

    // 리뷰 추가
    restaurant.reviews.unshift(newReview);

    // 평점 재계산
    restaurant.rating = restaurant.reviews.reduce((acc, item) => acc + item.rating, 0) / restaurant.reviews.length;

    await restaurant.save();

    res.status(201).json({
      success: true,
      data: newReview
    });
  } catch (error) {
    console.error('리뷰 등록 오류:', error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
});

module.exports = router; 