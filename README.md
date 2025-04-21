# 화란여지도 - 네덜란드 한인 맛집 공유 플랫폼

네덜란드에 거주하는 한국인들이 현지 맛집 정보를 쉽게 공유하고 검색할 수 있는 커뮤니티 플랫폼입니다.

## 프로젝트 개요

화란여지도는 지도 기반 맛집 검색, 카테고리별 분류, 평점 및 리뷰 시스템, 레스토랑 상세 정보 제공 등의 기능을 갖춘 웹 애플리케이션입니다.

## 주요 기능

- Google Maps API를 활용한 지도 기반 맛집 탐색
- 카테고리별 필터링 (한식, 일식, 중식, 양식, 카페 등)
- 평점 기반 필터링
- 지역별 검색
- 맛집 상세 정보 조회
- 리뷰 및 평점 등록
- QR 코드 공유

## 기술 스택

- 프론트엔드: HTML, CSS, JavaScript
- UI 프레임워크: Bootstrap 5
- 지도 API: Google Maps JavaScript API
- 아이콘: Font Awesome

## 설치 및 실행 방법

1. 저장소 클론
   ```
   git clone https://github.com/yourusername/dutch-matzip.git
   cd dutch-matzip
   ```

2. Google Maps API 키 설정
   - `index.html`과 `detail.html` 파일에서 `YOUR_API_KEY` 부분을 유효한 Google Maps API 키로 대체하세요.

3. 웹 서버 실행
   - 로컬에서 테스트할 경우 간단한 웹 서버를 사용할 수 있습니다:
   ```
   # Python 3
   python -m http.server
   
   # Python 2
   python -m SimpleHTTPServer
   ```

4. 브라우저 접속
   - 웹 브라우저를 열고 `http://localhost:8000`으로 접속하세요.

## 프로젝트 구조

```
/
├── index.html              # 메인 페이지
├── detail.html             # 레스토랑 상세 페이지
├── css/
│   └── style.css           # 스타일시트
├── js/
│   ├── app.js              # 메인 페이지 자바스크립트
│   └── detail.js           # 상세 페이지 자바스크립트
└── README.md               # 프로젝트 설명
```

## 향후 개발 계획

- 사용자 인증 시스템 구현
- 실시간 데이터베이스 연동
- 새로운 맛집 등록 기능 구현
- 다국어 지원 (한국어, 영어, 네덜란드어)
- 백엔드 API 개발 (Node.js + Express.js)

## 기여 방법

프로젝트에 기여하고 싶으시다면 다음 단계를 따라주세요:

1. 이 저장소를 포크합니다.
2. 새로운 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`).
3. 변경사항을 커밋합니다 (`git commit -m '새로운 기능 추가'`).
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`).
5. Pull Request를 생성합니다.

## 라이선스

MIT 라이선스 