const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// JWT 토큰 생성 함수
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'dutchmatzip_secret_key', {
    expiresIn: '30d'
  });
};

/**
 * @route   POST /api/auth/register
 * @desc    회원가입
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { account, username, password } = req.body;

    // 필수 필드 검증
    if (!account || !username || !password) {
      return res.status(400).json({
        success: false,
        error: '필수 정보를 모두 입력해주세요.'
      });
    }

    // 이미 존재하는 사용자 확인
    const existingAccount = await User.findOne({ account });
    if (existingAccount) {
      return res.status(400).json({
        success: false,
        error: '이미 사용 중인 계정명입니다.'
      });
    }

    // 신규 사용자 생성
    const user = await User.create({
      account,
      username,
      password
    });

    // 토큰 생성 및 응답
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        account: user.account,
        username: user.username,
        role: user.role,
        token
      }
    });
  } catch (error) {
    console.error('회원가입 오류:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages[0]
      });
    }
    
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    로그인
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { account, password } = req.body; 

    // 필수 필드 검증
    if (!account || !password) {
      return res.status(400).json({
        success: false,
        error: '계정명과 비밀번호를 모두 입력해주세요.'
      });
    }

    // 사용자 확인 (비밀번호 필드 포함하여 조회)
    const user = await User.findOne({ account }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: '계정명 또는 비밀번호가 일치하지 않습니다.'
      });
    }

    // 비밀번호 확인
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: '계정명 또는 비밀번호가 일치하지 않습니다.'
      });
    }

    // 토큰 생성 및 응답
    const token = generateToken(user._id);

    res.json({
      success: true,
      data: {
        id: user._id,
        account: user.account,
        username: user.username,
        role: user.role,
        token
      }
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    현재 로그인한 사용자 정보 조회
 * @access  Private
 */
router.get('/me', async (req, res) => {
  // 이 라우트에는 인증 미들웨어가 적용되어야 함
  // 지금은 임시로 간단하게 처리
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: '인증이 필요합니다.'
      });
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dutchmatzip_secret_key');
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: '사용자를 찾을 수 없습니다.'
        });
      }
      
      res.json({
        success: true,
        data: {
          id: user._id,
          account: user.account,
          username: user.username,
          role: user.role
        }
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: '인증이 유효하지 않습니다.'
      });
    }
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
});

module.exports = router; 