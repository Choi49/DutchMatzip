const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  account: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: [4, '계정명은 최소 4자 이상이어야 합니다']
  },
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 비밀번호 암호화 미들웨어
UserSchema.pre('save', async function(next) {
  // 비밀번호가 변경된 경우에만 해싱
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    console.error('비밀번호 해싱 오류:', error);
    next(error);
  }
});

// 비밀번호 확인 메소드
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema); 