const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const { protect, authorize, checkRestaurantOwnership } = require('../middleware/auth');
const { uploadImage } = require('../config/cloudinary');

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
      .populate('reviews.userId', 'username') // 리뷰 작성자 정보 가져오기
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
    })
    .populate('reviews.userId', 'username') // 리뷰 작성자 정보 가져오기
    .lean();

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
    const restaurant = await Restaurant.findById(req.params.id)
      .populate('userId', 'username') // 레스토랑 작성자 정보 가져오기
      .populate('reviews.userId', 'username') // 리뷰 작성자 정보 가져오기
      .lean();
    
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

// 새 레스토랑 등록 (로그인 필수)
router.post('/', protect, uploadImage.single('image'), async (req, res) => {
  try {
    // req.body에서 필요한 데이터 추출 - placeId 포함
    const { name, category, address, city, lat, lng, placeId } = req.body;

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

    // 새 레스토랑 생성 - placeId 포함
    const newRestaurant = new Restaurant({
      name,
      category,
      address,
      city,
      lat,
      lng,
      placeId, // 추가: Google Place ID 저장
      image: req.file ? req.file.path : undefined,
      userId: req.user._id
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

// 레스토랑 업데이트 (소유자 또는 관리자만 가능)
router.put('/:id', protect, checkRestaurantOwnership, async (req, res) => {
  try {
    const { name, category, address, city, phone, hours, image } = req.body;

    // 업데이트할 필드 모음
    const updateFields = {};
    if (name) updateFields.name = name;
    if (category) updateFields.category = category;
    if (address) updateFields.address = address;
    if (city) updateFields.city = city;
    if (phone) updateFields.phone = phone;
    if (hours) updateFields.hours = hours;
    if (image) updateFields.image = image;
    
    // 업데이트 시간 갱신
    updateFields.updatedAt = Date.now();

    // 레스토랑 업데이트
    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedRestaurant) {
      return res.status(404).json({
        success: false,
        error: '해당 레스토랑을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: {
        ...updatedRestaurant,
        id: updatedRestaurant._id
      }
    });
  } catch (error) {
    console.error('레스토랑 업데이트 오류:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: Object.values(error.errors).map(val => val.message)[0]
      });
    }
    
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
});

// 레스토랑 삭제 (소유자 또는 관리자만 가능)
router.delete('/:id', protect, checkRestaurantOwnership, async (req, res) => {
  try {
    const deletedRestaurant = await Restaurant.findByIdAndDelete(req.params.id);
    
    if (!deletedRestaurant) {
      return res.status(404).json({
        success: false,
        error: '해당 레스토랑을 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('레스토랑 삭제 오류:', error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
});

module.exports = router; 