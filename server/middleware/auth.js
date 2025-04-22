const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

// 사용자 인증 확인
exports.protect = async (req, res, next) => {
  let token;

  // Authorization 헤더 확인
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 토큰이 없는 경우
  if (!token) {
    return res.status(401).json({
      success: false,
      error: '이 경로에 접근하기 위해서는 로그인이 필요합니다.'
    });
  }

  try {
    // 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dutchmatzip_secret_key');

    // 사용자 정보 가져오기
    req.user = await User.findById(decoded.id);
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '유효하지 않은 토큰입니다.'
      });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: '인증에 실패했습니다. 다시 로그인해주세요.'
    });
  }
};

// 관리자 권한 확인
exports.authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '인증이 필요합니다.'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: '이 기능에 접근할 권한이 없습니다.'
      });
    }
    
    next();
  };
};

// 레스토랑 소유자 또는 관리자만 접근 가능
exports.checkRestaurantOwnership = async (req, res, next) => {
  try {
    // 먼저 레스토랑 조회
    const restaurantId = req.params.id;
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: '레스토랑을 찾을 수 없습니다.'
      });
    }

    // 관리자인 경우 항상 접근 허용
    if (req.user.role === 'admin') {
      return next();
    }

    // 레스토랑 소유자인지 확인
    // userId가 null이면 이전에 등록된 레스토랑으로 모든 사용자가 수정 가능하도록 허용
    if (restaurant.userId === null || restaurant.userId.toString() === req.user._id.toString()) {
      return next();
    }

    // 권한이 없는 경우
    return res.status(403).json({
      success: false,
      error: '이 레스토랑을 수정/삭제할 권한이 없습니다.'
    });
  } catch (error) {
    console.error('레스토랑 소유권 확인 오류:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
}; 