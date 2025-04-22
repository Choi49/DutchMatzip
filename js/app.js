// 전역 변수
let map;
let markers = [];
let currentInfoWindow = null;
let restaurants = [];
let currentRestaurantId = null; // 현재 선택된 레스토랑 ID
const API_URL = 'http://localhost:5000/api';

// 유저 상태 관리를 위한 전역 변수
let currentUser = null;

// 로컬 스토리지에서 토큰 가져오기
function getToken() {
    return localStorage.getItem('token');
}

// 로컬 스토리지에 토큰 저장
function setToken(token) {
    localStorage.setItem('token', token);
}

// 로컬 스토리지에서 토큰 삭제
function removeToken() {
    localStorage.removeItem('token');
}

// 인증 헤더 생성 함수
function getAuthHeaders() {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
}

// API 호출 함수들
async function fetchRestaurants(filters = {}) {
    try {
        // URL 쿼리 파라미터 생성
        const queryParams = new URLSearchParams();
        if (filters.category) queryParams.append('category', filters.category);
        if (filters.city) queryParams.append('city', filters.city);
        if (filters.sort) queryParams.append('sort', filters.sort);
        
        const url = `${API_URL}/restaurants?${queryParams}`;
        console.log('API 호출:', url);
        
        // API 호출
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('API 응답 (restaurants):', data);
        
        if (data.success) {
            restaurants = data.data;
            return restaurants;
        } else {
            console.error('레스토랑 데이터를 가져오는데 실패했습니다:', data.error);
            return [];
        }
    } catch (error) {
        console.error('API 요청 중 오류가 발생했습니다:', error);
        return [];
    }
}

async function fetchRestaurantById(restaurantId) {
    try {
        const url = `${API_URL}/restaurants/${restaurantId}`;
        console.log('API 호출 (fetchRestaurantById):', url);
        
        const response = await fetch(url);
        const result = await response.json();
        
        console.log('API 응답 (fetchRestaurantById):', result);
        
        if (result.success) {
            console.log('레스토랑 정보 조회 성공:', result.data);
            return result.data;
        } else {
            console.error('레스토랑 정보 조회 실패:', result.error);
            return null;
        }
    } catch (error) {
        console.error('API 요청 중 오류가 발생했습니다:', error);
        return null;
    }
}

async function searchRestaurants(query) {
    try {
        const url = `${API_URL}/restaurants/search/${query}`;
        console.log('API 호출:', url);
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('API 응답 (search):', data);
        
        if (data.success) {
            return data.data;
        } else {
            console.error('레스토랑 검색에 실패했습니다:', data.error);
            return [];
        }
    } catch (error) {
        console.error('API 요청 중 오류가 발생했습니다:', error);
        return [];
    }
}

async function addRestaurant(restaurantData) {
    try {
        // 토큰 확인
        const token = getToken();
        if (!token) {
            alert('맛집 등록을 위해 로그인이 필요합니다.');
            // 로그인 모달 표시
            const loginModal = new bootstrap.Modal(document.getElementById('login-modal'));
            loginModal.show();
            return { success: false, error: '로그인이 필요합니다.' };
        }

        const response = await fetch(`${API_URL}/restaurants`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(restaurantData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('레스토랑 등록 성공:', result.data);
            return { success: true, data: result.data };
        } else {
            console.error('레스토랑 등록 실패:', result.error);
            
            // 중복 장소 처리
            if (result.duplicateId) {
                return { 
                    success: false, 
                    error: result.error,
                    duplicateId: result.duplicateId 
                };
            }
            
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('레스토랑 등록 API 호출 오류:', error);
        return { success: false, error: '서버 연결 오류가 발생했습니다.' };
    }
}

async function addReview(restaurantId, reviewData) {
    try {
        // 토큰 확인
        const token = getToken();
        if (!token) {
            alert('리뷰 작성을 위해 로그인이 필요합니다.');
            // 로그인 모달 표시
            const loginModal = new bootstrap.Modal(document.getElementById('login-modal'));
            loginModal.show();
            return null;
        }

        const url = `${API_URL}/reviews`;
        console.log('API 호출 (POST):', url, { restaurantId, ...reviewData });
        
        const response = await fetch(url, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                restaurantId,
                ...reviewData
            })
        });
        
        const data = await response.json();
        
        console.log('API 응답 (add review):', data);
        
        if (data.success) {
            return data.data;
        } else {
            console.error('리뷰 추가에 실패했습니다:', data.error);
            return null;
        }
    } catch (error) {
        console.error('API 요청 중 오류가 발생했습니다:', error);
        return null;
    }
}

// 전역 변수 추가
let placesService;
let placesMarkers = [];

// 지도 스타일 설정
const mapStyle = [
    {
        featureType: "all",
        elementType: "labels",
        stylers: [{ visibility: "off" }]
    },
    {
        featureType: "administrative.locality",
        elementType: "labels",
        stylers: [{ visibility: "on" }]
    },
    {
        featureType: "landscape",
        elementType: "geometry",
        stylers: [{ color: "#f4ecd8" }]
    },
    {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#c9bea8" }]
    },
    {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#d4b886" }]
    },
    {
        featureType: "poi",
        stylers: [{ visibility: "off" }]
    }
];

// 현재 선택된 레스토랑 ID
let selectedRating = 0;

// 사이드바 상태
let sidebarVisible = false;

// 이미지 URL 캐싱 유틸리티 (파일 상단에 추가)
const imageCache = {
  // 이미지 URL 캐시에 저장 (24시간 유효)
  setImageUrl: function(placeId, imageUrl) {
    const now = new Date();
    const cacheItem = {
      url: imageUrl,
      timestamp: now.getTime(),
      expires: now.getTime() + (24 * 60 * 60 * 1000) // 24시간 유효
    };
    
    localStorage.setItem(`restaurant_img_${placeId}`, JSON.stringify(cacheItem));
    return imageUrl;
  },
  
  // 캐시에서 이미지 URL 가져오기
  getImageUrl: function(placeId) {
    const cacheJson = localStorage.getItem(`restaurant_img_${placeId}`);
    if (!cacheJson) return null;
    
    const cacheItem = JSON.parse(cacheJson);
    const now = new Date().getTime();
    
    // 캐시 만료 확인
    if (now > cacheItem.expires) {
      localStorage.removeItem(`restaurant_img_${placeId}`);
      return null;
    }
    
    return cacheItem.url;
  },
  
  // 캐시 정리 함수
  cleanupCache: function() {
    if (localStorage.length > 100) { // 캐시 항목이 많아지면 정리
      const now = new Date().getTime();
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('restaurant_img_')) {
          try {
            const item = JSON.parse(localStorage.getItem(key));
            // 12시간 이상 된 항목 삭제
            if (item.timestamp && (now - item.timestamp > 12 * 60 * 60 * 1000)) {
              localStorage.removeItem(key);
            }
          } catch(e) { /* 오류 처리 */ }
        }
      }
    }
  }
};

// 지도 초기화
function initMap() {
    // 네덜란드 암스테르담 중심 좌표
    const amsterdam = { lat: 52.3676, lng: 4.9041 };
    
    // 지도 생성
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 13,
        center: amsterdam,
        mapTypeControl: false, // 지도 유형 컨트롤(Map/Satellite) 제거
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        styles: mapStyle // 사용자 정의 스타일 적용
    });
    
    // Google Places 서비스 초기화
    placesService = new google.maps.places.PlacesService(map);
    
    // 서버에서 레스토랑 데이터 가져오기
    loadRestaurantsFromServer();
    
    // 필터링 이벤트 리스너 설정
    setupFilterListeners();
    
    // 검색 기능 설정
    setupSearch();
    
    // 레스토랑 카드 닫기 버튼 이벤트 리스너
    document.getElementById("close-restaurant-card").addEventListener("click", hideRestaurantCard);
    
    // 리뷰 작성 버튼 이벤트 리스너
    document.getElementById("write-review-btn").addEventListener("click", showReviewModal);
    
    // 리뷰 제출 버튼 이벤트 리스너
    document.getElementById("submit-review-btn").addEventListener('click', submitReview);
    
    // 리뷰 수정 제출 버튼 이벤트 리스너
    document.getElementById("update-review-btn").addEventListener('click', submitEditReview);
    
    // 별점 선택 이벤트 리스너 설정
    setupRatingStars();
    
    // 사이드바 토글 버튼 이벤트 리스너
    setupSidebar();
    
    imageCache.cleanupCache();
}

// 서버에서 레스토랑 데이터 로드
async function loadRestaurantsFromServer() {
    const restaurantsData = await fetchRestaurants();
    if (restaurantsData.length >= 0) {
        restaurants = restaurantsData;
        addRestaurantMarkers();
    } else {
        alert('레스토랑 데이터를 불러오는데 실패했습니다. 서버가 실행 중인지 확인해주세요.');
    }
}

// 레스토랑 마커 추가 함수
function addRestaurantMarkers() {
    // 기존 마커 제거
    clearMarkers();
    
    // 중복 제거를 위한 Set 생성
    const addedLocations = new Set();
    
    restaurants.forEach((restaurant) => {
        // 위치 기반 중복 확인 (위도와 경도가 매우 가까운 경우 동일 장소로 간주)
        const locationKey = `${restaurant.lat.toFixed(5)}-${restaurant.lng.toFixed(5)}`;
        if (addedLocations.has(locationKey)) {
            // 이미 추가된 위치는 건너뜀
            console.log('중복 위치의 레스토랑 마커 제외:', restaurant.name);
            return;
        }
        
        // 중복이 아닌 경우 Set에 추가
        addedLocations.add(locationKey);
        
        // 레스토랑 카테고리에 따라 다른 아이콘 색상 지정
        let markerColor;
        switch(restaurant.category) {
            case '한식':
                markerColor = '#e74c3c'; // 빨간색
                break;
            case '일식':
                markerColor = '#3498db'; // 파란색
                break;
            case '중식':
                markerColor = '#f39c12'; // 주황색
                break;
            case '양식':
                markerColor = '#2ecc71'; // 초록색
                break;
            case '카페':
                markerColor = '#9b59b6'; // 보라색
                break;
            default:
                markerColor = '#95a5a6'; // 회색
        }
        
        // 커스텀 마커 아이콘 정의
        const markerIcon = {
            path: 'M12,2C8.13,2,5,5.13,5,9c0,5.25,7,13,7,13s7-7.75,7-13C19,5.13,15.87,2,12,2z M12,11.5c-1.38,0-2.5-1.12-2.5-2.5s1.12-2.5,2.5-2.5s2.5,1.12,2.5,2.5S13.38,11.5,12,11.5z',
            fillColor: markerColor,
            fillOpacity: 1,
            strokeWeight: 1,
            strokeColor: '#ffffff',
            scale: 1.5,
            anchor: new google.maps.Point(12, 22)
        };
        
        // 마커 생성
        const marker = new google.maps.Marker({
            position: { lat: restaurant.lat, lng: restaurant.lng },
            map: map,
            title: restaurant.name,
            icon: markerIcon,
            animation: google.maps.Animation.DROP
        });
        
        // 마커 클릭 이벤트 추가
        marker.addListener("click", () => {
            showRestaurantCard(restaurant);
        });
        
        // 마커 배열에 추가
        markers.push({
            marker: marker,
            category: restaurant.category,
            rating: restaurant.rating,
            restaurant: restaurant
        });
    });
    
    console.log(`처리된 마커 수: ${addedLocations.size}/${restaurants.length}`);
    
    // 사이드바에 식당 목록 표시
    updateRestaurantList();
}

// 마커 전체 제거 함수
function clearMarkers() {
    markers.forEach((markerObj) => {
        markerObj.marker.setMap(null);
    });
    markers = [];
}

// 카테고리에 따른 클래스 반환 함수
function getCategoryClass(category) {
    switch (category) {
        case '한식': return 'korean';
        case '일식': return 'japanese';
        case '중식': return 'chinese';
        case '양식': return 'western';
        case '카페': return 'cafe';
        default: return '';
    }
}

// 카테고리에 따른 색상 반환 함수
function getCategoryColor(category) {
    switch (category) {
        case '한식': return '#e74c3c';
        case '일식': return '#3498db';
        case '중식': return '#f39c12';
        case '양식': return '#2ecc71';
        case '카페': return '#9b59b6';
        default: return '#95a5a6';
    }
}

// 필터링 이벤트 리스너 설정 함수
function setupFilterListeners() {
    // 카테고리 필터
    const categoryCheckboxes = document.querySelectorAll('.category-filters input[type="checkbox"]');
    categoryCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener('change', filterRestaurants);
    });
    
    // 평점 필터
    const ratingRadios = document.querySelectorAll('.rating-filters input[type="radio"]');
    ratingRadios.forEach((radio) => {
        radio.addEventListener('change', filterRestaurants);
    });
    
    // 지역 필터
    document.getElementById('city-select').addEventListener('change', filterRestaurants);
}

// 필터링된 레스토랑 가져오기
async function filterRestaurants() {
    const selectedCategories = getSelectedCategories();
    const selectedCity = document.getElementById("city-select").value;
    
    // 필터 객체 생성
    const filters = {};
    
    if (selectedCategories.length > 0) {
        filters.category = selectedCategories.join(',');
    }
    
    if (selectedCity && selectedCity !== "도시 선택") {
        filters.city = selectedCity;
    }
    
    // API 호출하여 필터링된 레스토랑 가져오기
    const filteredRestaurants = await fetchRestaurants(filters);
    
    // 전역 restaurants 변수를 새로운 결과로 완전히 대체
    restaurants = filteredRestaurants;
    
    // 마커 및 목록 업데이트
    addRestaurantMarkers();
    
    // 식당 목록 UI 갱신 - 명시적으로 호출
    updateRestaurantList();
}

// 선택된 카테고리 가져오기
function getSelectedCategories() {
    const categoryCheckboxes = document.querySelectorAll('.category-filters input[type="checkbox"]:checked');
    return Array.from(categoryCheckboxes).map(checkbox => checkbox.value);
}

// 검색 기능 설정 함수
function setupSearch() {
    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-input');
    
    searchButton.addEventListener('click', () => {
        performSearch(searchInput.value);
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch(searchInput.value);
        }
    });
}

// 검색 실행 함수
async function performSearch(query) {
    // 검색어가 비어 있는 경우, 현재 필터링된 데이터로 목록을 복원
    if (!query.trim()) {
        // 구글 검색 마커들 제거
        clearPlacesMarkers();
        
        // 현재 선택된 필터로 다시 데이터 불러오기
        await filterRestaurants();
        
        // 지도 뷰 조정
        fitMapToMarkers();
        
        console.log('검색어가 비어 있어 필터링된 맛집 목록을 표시합니다.');
        return;
    }
    
    // 검색 시작 시 로딩 표시 (선택적)
    console.log(`"${query}" 검색 중...`);
    
    // 구글 검색 마커들 제거
    clearPlacesMarkers();
    
    try {
        // 1. 서버 API를 통한 레스토랑 검색
        const searchResults = await searchRestaurants(query);
        
        // 서버 검색 결과로 맛집 목록 업데이트
        if (searchResults.length > 0) {
            restaurants = searchResults;
            
            // 마커와 목록 업데이트
            addRestaurantMarkers();
            updateRestaurantList();
            
            // 지도 뷰 조정
            fitMapToMarkers();
            
            console.log(`서버에서 ${searchResults.length}개의 맛집을 찾았습니다.`);
        } else {
            // 검색 결과가 없으면 모든 마커 숨기기
            markers.forEach(m => m.marker.setVisible(false));
            
            // 빈 목록 업데이트
            updateRestaurantList();
            
            console.log('서버에서 일치하는 맛집을 찾지 못했습니다.');
        }
        
        // 2. 동시에 Google Places API 검색 수행 (결과 유무와 관계없이)
        searchGooglePlaces(query);
        
    } catch (error) {
        console.error('검색 중 오류 발생:', error);
        
        // 오류 발생 시 Google Places 검색으로 대체
        searchGooglePlaces(query);
    }
}

// Google Places API로 장소 검색 수행 함수
function searchGooglePlaces(query) {
    const request = {
        location: map.getCenter(),
        radius: 5000,
        query: query,
        type: 'restaurant'
    };
    
    console.log("Google Places 검색 요청:", request);
    
    placesService.textSearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            console.log("Google Places 검색 결과:", results.length + "개 항목");
            
            // 이 부분을 수정: 맛집 마커를 숨기지 않고 구글 검색 결과 추가
            showPlacesResults(results, false);
        } else {
            console.log('Google Places 검색 실패:', status);
            
            // 저장된 결과도 없고 구글 검색도 실패한 경우에만 알림
            if (markers.every(m => !m.marker.getVisible()) && placesMarkers.length === 0) {
                alert('검색 결과가 없습니다.');
            }
        }
    });
}

// Google Places 검색 결과 표시 함수
function showPlacesResults(places, hideRestaurantMarkers = true) {
    // 이전 Places 마커 제거
    clearPlacesMarkers();
    
    // 검색 결과가 없으면 종료
    if (!places || places.length === 0) return;
    
    // 숨김 옵션이 활성화된 경우에만 저장된 맛집 마커 숨기기
    if (hideRestaurantMarkers) {
        markers.forEach(m => m.marker.setVisible(false));
    }
    
    // 검색 결과 저장 (사이드바 표시용)
    const placeResults = [];
    
    // 결과 마커 생성
    places.forEach(place => {
        // 이미 저장된 식당과 중복될 수 있으므로 위치 기준으로 중복 확인
        const isDuplicate = markers.some(m => {
            if (place.geometry && place.geometry.location) {
                const placePos = place.geometry.location;
                const markerPos = m.marker.getPosition();
                // 거리가 30미터 이내면 중복으로 판단
                return google.maps.geometry.spherical.computeDistanceBetween(placePos, markerPos) < 30;
            }
            return false;
        });
        
        // 중복이 아닌 경우에만 표시
        if (!isDuplicate && place.geometry && place.geometry.location) {
            // 검색 결과 저장
            placeResults.push(place);
            
            // 마커 생성
            const markerIcon = {
                path: 'M12,2C8.13,2,5,5.13,5,9c0,5.25,7,13,7,13s7-7.75,7-13C19,5.13,15.87,2,12,2z M12,11.5c-1.38,0-2.5-1.12-2.5-2.5s1.12-2.5,2.5-2.5s2.5,1.12,2.5,2.5S13.38,11.5,12,11.5z',
                fillColor: '#888888', // 회색으로 구분
                fillOpacity: 1,
                strokeWeight: 1,
                strokeColor: '#ffffff',
                scale: 1.5,
                anchor: new google.maps.Point(12, 22)
            };
            
            const marker = new google.maps.Marker({
                map: map,
                position: place.geometry.location,
                title: place.name,
                icon: markerIcon,
                animation: google.maps.Animation.DROP
            });
            
            // 정보창 생성
            const infoWindow = new google.maps.InfoWindow({
                content: createPlaceInfoContent(place)
            });
            
            // 마커 클릭 이벤트
            marker.addListener('click', () => {
                // 이전 정보창 닫기
                if (currentInfoWindow) {
                    currentInfoWindow.close();
                }
                
                // 정보창 열기
                infoWindow.open(map, marker);
                currentInfoWindow = infoWindow;
                
                // 저장된 레스토랑 카드 닫기
                hideRestaurantCard();
            });
            
            // 마커 객체에 장소 정보 저장
            marker.place = place;
            
            // 마커 배열에 추가
            placesMarkers.push(marker);
        }
    });
    
    // 검색 결과를 사이드바에 표시
    updateSidebarWithPlacesResults(placeResults);
    
    // 지도 뷰를 모든 마커가 보이도록 조정 (저장된 맛집이 없는 경우에만)
    if (markers.every(m => !m.marker.getVisible()) && placesMarkers.length > 0) {
        fitMapToMarkers();
    } else if (placesMarkers.length > 0) {
        // 저장된 맛집과 검색 결과가 모두 있는 경우 모든 마커가 보이도록 조정
        fitMapToMarkers();
    }
}

// Places 검색 결과를 사이드바에 표시하는 함수
function updateSidebarWithPlacesResults(places) {
    const listContainer = document.querySelector('.restaurant-items');
    const noRestaurantsMsg = document.getElementById('no-restaurants-message');
    
    // 저장된 맛집 중 표시 가능한 것을 먼저 가져옴
    const visibleRestaurants = markers.filter(m => m.marker.getVisible());
    
    // 기존 식당 목록을 업데이트하여 표시
    updateRestaurantList();
    
    // 기존 검색 결과 섹션 제거 (구분선, 제목, 결과 항목들)
    const existingGoogleResults = Array.from(listContainer.querySelectorAll('.google-place-item, .dropdown-divider, h6.text-muted'));
    existingGoogleResults.forEach(item => listContainer.removeChild(item));
    
    // 표시할 식당이 없고 검색 결과도 없으면 메시지 표시
    if (visibleRestaurants.length === 0 && (!places || places.length === 0)) {
        noRestaurantsMsg.style.display = 'block';
        return;
    }
    
    // 메시지 숨기기
    noRestaurantsMsg.style.display = 'none';
    
    // 구글 검색 결과 항목 추가
    if (places && places.length > 0) {
        // 구글 검색 결과 섹션 구분선 추가 (저장된 맛집이 있는 경우에만)
        if (visibleRestaurants.length > 0) {
            const divider = document.createElement('div');
            divider.className = 'dropdown-divider my-3';
            listContainer.appendChild(divider);
            
            const heading = document.createElement('h6');
            heading.className = 'text-muted px-3 py-1';
            heading.textContent = '구글 검색 결과';
            listContainer.appendChild(heading);
        }
        
        // 검색 결과 목록 추가
        places.forEach(place => {
            const item = document.createElement('a');
            item.className = 'list-group-item list-group-item-action google-place-item';
            item.href = '#';
            
            // 해당 장소의 마커 찾기
            const placeMarker = placesMarkers.find(m => m.place && m.place.place_id === place.place_id);
            
            // 항목 내용 생성
            let placeType = '기타';
            if (place.types) {
                if (place.types.includes('restaurant')) placeType = '음식점';
                else if (place.types.includes('cafe')) placeType = '카페';
                else if (place.types.includes('bar')) placeType = '바';
            }
            
            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0">${place.name}</h6>
                        <div class="d-flex align-items-center">
                            <span class="badge bg-secondary me-2">${placeType}</span>
                            <small class="text-muted">${place.formatted_address ? place.formatted_address.split(',')[0] : ''}</small>
                        </div>
                    </div>
                    ${place.rating ? `
                    <span class="badge bg-light text-dark border">
                        <i class="fas fa-star text-warning"></i> ${place.rating.toFixed(1)}
                    </span>
                    ` : ''}
                </div>
            `;
            
            // 클릭 이벤트 추가
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                // 이전 정보창 닫기
                if (currentInfoWindow) {
                    currentInfoWindow.close();
                }
                
                if (placeMarker) {
                    // 정보창 생성 및 열기
                    const infoWindow = new google.maps.InfoWindow({
                        content: createPlaceInfoContent(place)
                    });
                    
                    infoWindow.open(map, placeMarker);
                    currentInfoWindow = infoWindow;
                }
                
                // 위치로 지도 이동
                if (place.geometry && place.geometry.location) {
                    map.setCenter(place.geometry.location);
                    map.setZoom(16);
                }
                
                // 저장된 레스토랑 카드 닫기
                hideRestaurantCard();
            });
            
            // 목록에 추가
            listContainer.appendChild(item);
        });
    }
}

// Places 마커 제거 함수
function clearPlacesMarkers() {
    placesMarkers.forEach(marker => {
        marker.setMap(null);
    });
    placesMarkers = [];
}

// Google Places 정보창 내용 생성 함수
function createPlaceInfoContent(place) {
    let content = `
        <div class="place-info-window">
            <h5>${place.name}</h5>
    `;
    
    if (place.formatted_address) {
        content += `<p><i class="fas fa-map-marker-alt"></i> ${place.formatted_address}</p>`;
    }
    
    if (place.rating) {
        content += `
            <p>
                <span class="text-warning">
                    ${getStarsHTML(place.rating)}
                </span>
                <span>${place.rating.toFixed(1)}</span>
                ${place.user_ratings_total ? `(${place.user_ratings_total})` : ''}
            </p>
        `;
    }
    
    if (place.price_level) {
        content += `<p>가격대: ${getPriceSymbols(place.price_level)}</p>`;
    }
    
    content += `
        <div class="mt-2">
            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}" target="_blank" class="btn btn-sm btn-outline-primary">
                Google Maps에서 보기
            </a>
            <button onclick="showSaveRestaurantForm('${place.place_id}')" class="btn btn-sm btn-success ms-2">
                맛집으로 저장
            </button>
        </div>
    `;
    
    content += `</div>`;
    return content;
}

// 별점 HTML 생성 함수
function getStarsHTML(rating) {
    let html = '';
    const fullStars = Math.floor(rating);
    const halfStar = rating - fullStars >= 0.5;
    
    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            html += '<i class="fas fa-star"></i>';
        } else if (i === fullStars && halfStar) {
            html += '<i class="fas fa-star-half-alt"></i>';
        } else {
            html += '<i class="far fa-star"></i>';
        }
    }
    
    return html;
}

// 가격대 기호 생성 함수
function getPriceSymbols(priceLevel) {
    let symbols = '';
    for (let i = 0; i < priceLevel; i++) {
        symbols += '€';
    }
    return symbols;
}

// 지도 뷰 조정 함수
function fitMapToMarkers() {
    const bounds = new google.maps.LatLngBounds();
    
    // 표시된 저장 마커 포함
    markers.forEach(markerObj => {
        if (markerObj.marker.getVisible()) {
            bounds.extend(markerObj.marker.getPosition());
        }
    });
    
    // Places 검색 결과 마커 포함
    placesMarkers.forEach(marker => {
        bounds.extend(marker.getPosition());
    });
    
    // 검색 결과가 있는 경우만 뷰 조정
    if (!bounds.isEmpty()) {
        map.fitBounds(bounds);
        
        // 줌 레벨 제한 (너무 가깝게 확대되는 것 방지)
        const listener = google.maps.event.addListener(map, 'idle', () => {
            if (map.getZoom() > 16) {
                map.setZoom(16);
            }
            google.maps.event.removeListener(listener);
        });
    }
}

// 레스토랑 카드 표시 함수
function showRestaurantCard(restaurant) {
    const card = document.getElementById('restaurant-card');
    
    // 다른 레스토랑을 보는 경우, 이전 레스토랑의 리뷰를 모두 비웁니다
    if (currentRestaurantId !== restaurant.id) {
        const reviewsContainer = document.getElementById('reviews-container');
        const noReviewsMessage = document.getElementById('no-reviews-message');
        
        // 이전 리뷰 전체 삭제 (lastChild부터 지우기)
        while (reviewsContainer.lastChild && reviewsContainer.lastChild !== noReviewsMessage) {
            reviewsContainer.removeChild(reviewsContainer.lastChild);
        }
        
        // 리뷰 없음 메시지 표시
        noReviewsMessage.style.display = 'block';
    }
    
    // 현재 선택된 레스토랑 ID 설정
    currentRestaurantId = restaurant.id;
    
    // 카드 내용 채우기
    card.querySelector('.restaurant-name').textContent = restaurant.name;
    card.querySelector('.rating-value').textContent = restaurant.rating.toFixed(1);
    card.querySelector('.restaurant-category').textContent = restaurant.category;
    card.querySelector('.restaurant-address span').textContent = restaurant.address;
    
    // 구글 맵스 링크 설정
    const mapsLink = card.querySelector('.maps-link');
    let googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name + ' ' + restaurant.address)}`;
    if (restaurant.placeId) {
        googleMapsUrl += `&query_place_id=${restaurant.placeId}`;
    }
    mapsLink.href = googleMapsUrl;
    
    // 레스토랑 이미지 표시 부분 수정
    const imageContainer = document.querySelector('.restaurant-image');
    
    // 1. 커스텀 이미지가 있는 경우
    if (restaurant.image) {
        imageContainer.innerHTML = `<img src="${restaurant.image}" class="img-fluid rounded" alt="${restaurant.name}">`;
    } 
    // 2. 커스텀 이미지가 없고 placeId가 있는 경우
    else if (restaurant.placeId) {
        // 캐시 확인
        const cachedImageUrl = imageCache.getImageUrl(restaurant.placeId);
        
        if (cachedImageUrl) {
            // 캐시된 이미지 URL 사용
            imageContainer.innerHTML = `<img src="${cachedImageUrl}" class="img-fluid rounded" alt="${restaurant.name}">`;
        } else {
            // 로딩 표시
            imageContainer.innerHTML = `<div class="text-center p-3"><div class="spinner-border text-primary" role="status"></div></div>`;
            
            // Google Places API로 이미지 가져오기
            placesService.getDetails({ placeId: restaurant.placeId }, (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && place.photos && place.photos.length > 0) {
                    // 최신 이미지 URL 가져오기
                    const imageUrl = place.photos[0].getUrl({ maxWidth: 1000, maxHeight: 600 });
                    
                    // 이미지 표시
                    imageContainer.innerHTML = `<img src="${imageUrl}" class="img-fluid rounded" alt="${restaurant.name}">`;
                    
                    // 캐시에 저장
                    imageCache.setImageUrl(restaurant.placeId, imageUrl);
                } else {
                    // 기본 이미지 표시
                    imageContainer.innerHTML = `<img src="/images/default-restaurant.jpg" class="img-fluid rounded" alt="${restaurant.name}">`;
                }
            });
        }
    } 
    // 3. 아무 이미지도 없는 경우
    else {
        imageContainer.innerHTML = `<img src="/images/default-restaurant.jpg" class="img-fluid rounded" alt="${restaurant.name}">`;
    }
    
    // 삭제 버튼 관련 로직
    const headerActions = card.querySelector('.card-header .d-flex');
    
    // 기존 삭제 버튼이 있다면 제거
    const existingDeleteBtn = card.querySelector('#delete-restaurant-btn');
    if (existingDeleteBtn) {
        existingDeleteBtn.remove();
    }
    
    // 로그인한 사용자이고, 이 레스토랑의 작성자이거나 관리자인 경우에만 삭제 버튼 표시
    if (currentUser) {
        // 레스토랑의 userId가 없거나(이전 데이터) 현재 사용자의 ID와 일치하거나 관리자인 경우
        if (!restaurant.userId || restaurant.userId === currentUser.id || currentUser.role === 'admin') {
            const deleteBtn = document.createElement('button');
            deleteBtn.id = 'delete-restaurant-btn';
            deleteBtn.className = 'btn btn-sm btn-outline-danger me-2';
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteBtn.title = '맛집 삭제';
            deleteBtn.addEventListener('click', confirmDeleteRestaurant);
            
            // 평점 앞에 삭제 버튼 추가
            headerActions.prepend(deleteBtn);
        }
    }
    
    // 카드 표시
    card.classList.remove('d-none');
    card.classList.add('fade-in');
    
    // 리뷰 작성 버튼에 레스토랑 ID 설정
    document.getElementById('write-review-btn').dataset.restaurantId = restaurant.id;
    
    // 리뷰 로드
    loadReviews(restaurant.id);
}

// 레스토랑 삭제 확인
function confirmDeleteRestaurant() {
    if (confirm('정말로 이 맛집을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        deleteRestaurant(currentRestaurantId)
            .then(result => {
                if (result.success) {
                    alert('맛집이 삭제되었습니다.');
                    hideRestaurantCard();
                } else {
                    alert(`삭제 실패: ${result.error}`);
                }
            })
            .catch(err => {
                console.error('삭제 중 오류 발생:', err);
                alert('맛집 삭제 중 오류가 발생했습니다.');
            });
    }
}

// 레스토랑 카드 숨기기 함수
function hideRestaurantCard() {
    const card = document.getElementById('restaurant-card');
    card.classList.add('d-none');
    
    // 레스토랑 카드를 숨길 때 리뷰 컨테이너도 초기화
    const reviewsContainer = document.getElementById('reviews-container');
    const noReviewsMessage = document.getElementById('no-reviews-message');
    
    // 모든 리뷰 삭제 (lastChild부터 지우기)
    while (reviewsContainer.lastChild && reviewsContainer.lastChild !== noReviewsMessage) {
        reviewsContainer.removeChild(reviewsContainer.lastChild);
    }
    
    // 리뷰 없음 메시지 표시
    noReviewsMessage.style.display = 'block';
    
    // 현재 레스토랑 ID 초기화
    currentRestaurantId = null;
}

// 리뷰 모달 표시 함수
function showReviewModal() {
    // 모달에 레스토랑 ID 설정
    document.getElementById('review-restaurant-id').value = currentRestaurantId;
    
    // 별점 초기화
    resetStars();
    selectedRating = 0;
    
    // 폼 초기화
    document.getElementById('review-text').value = '';
    document.getElementById('review-menu').value = '';
    document.getElementById('review-price').value = '';
    document.getElementById('review-image').value = '';
    
    // 모달 표시
    const reviewModal = new bootstrap.Modal(document.getElementById('review-modal'));
    reviewModal.show();
}

// 별점 시스템 설정
function setupRatingStars() {
    const stars = document.querySelectorAll('.rating-stars i');
    
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.dataset.rating);
            selectedRating = rating;
            updateStars(rating);
        });
        
        star.addEventListener('mouseover', function() {
            const rating = parseInt(this.dataset.rating);
            highlightStars(rating);
        });
        
        star.addEventListener('mouseout', function() {
            resetStarsWithSelected();
        });
    });
}

// 별점 하이라이트
function highlightStars(rating) {
    const stars = document.querySelectorAll('.rating-stars i');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('far');
            star.classList.add('fas');
        } else {
            star.classList.remove('fas');
            star.classList.add('far');
        }
    });
}

// 별점 업데이트
function updateStars(rating) {
    const stars = document.querySelectorAll('.rating-stars i');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('far');
            star.classList.add('fas', 'text-warning');
        } else {
            star.classList.remove('fas', 'text-warning');
            star.classList.add('far');
        }
    });
}

// 별점 초기화
function resetStars() {
    const stars = document.querySelectorAll('.rating-stars i');
    stars.forEach(star => {
        star.classList.remove('fas', 'text-warning');
        star.classList.add('far');
    });
}

// 선택된 별점을 유지하며 초기화
function resetStarsWithSelected() {
    if (selectedRating > 0) {
        updateStars(selectedRating);
    } else {
        resetStars();
    }
}

// 리뷰 제출 함수
async function submitReview() {
    // 별점이 선택되지 않은 경우
    if (selectedRating === 0) {
        alert("평점을 선택해주세요.");
        return;
    }
    
    // 리뷰 텍스트가 비어있는 경우
    const reviewText = document.getElementById("review-text").value.trim();
    if (!reviewText) {
        alert("리뷰 내용을 입력해주세요.");
        return;
    }
    
    // 리뷰 데이터 수집
    const reviewData = {
        rating: selectedRating,
        text: reviewText,
        menu: document.getElementById("review-menu").value.trim(),
        price: parseFloat(document.getElementById("review-price").value) || 0
    };
    
    // 이미지 업로드는 현재 기능 미구현
    
    try {
        // API를 통해 리뷰 제출
        const result = await addReview(currentRestaurantId, reviewData);
        
        if (result) {
            // 리뷰 추가 성공 시 레스토랑 정보 다시 로드
            const updatedRestaurant = await fetchRestaurantById(currentRestaurantId);
            if (updatedRestaurant) {
                // 레스토랑 객체 업데이트
                const index = restaurants.findIndex(r => r._id === currentRestaurantId);
                if (index !== -1) {
                    restaurants[index] = updatedRestaurant;
                }
                
                // 리뷰 목록 업데이트
                loadReviews(currentRestaurantId);
                
                // 레스토랑 평점 업데이트
                updateRestaurantRating(updatedRestaurant);
            }
            
            // 모달 닫기
            bootstrap.Modal.getInstance(document.getElementById('review-modal')).hide();
            
            // 폼 초기화
            document.getElementById("review-form").reset();
            selectedRating = 0;
            resetStars();
        }
    } catch (error) {
        console.error("리뷰 제출 중 오류 발생:", error);
        alert("리뷰를 제출하는 중 오류가 발생했습니다.");
    }
}

// 레스토랑 평점 업데이트
function updateRestaurantRating(restaurant) {
    if (restaurant.reviews.length === 0) return;
    
    // 모든 리뷰의 평점 평균 계산
    const totalRating = restaurant.reviews.reduce((sum, review) => sum + review.rating, 0);
    restaurant.rating = totalRating / restaurant.reviews.length;
    
    // 카드에 새 평점 표시
    const card = document.getElementById('restaurant-card');
    card.querySelector('.rating-value').textContent = restaurant.rating.toFixed(1);
    
    // 마커 찾기 및 업데이트
    const markerObj = markers.find(m => m.restaurant.id === restaurant.id);
    if (markerObj) {
        markerObj.rating = restaurant.rating;
    }
}

// 리뷰 로드 함수
function loadReviews(restaurantId) {
    const restaurant = restaurants.find(r => r.id === restaurantId);
    const reviewsContainer = document.getElementById('reviews-container');
    const noReviewsMessage = document.getElementById('no-reviews-message');
    
    // 이전 리뷰 전체 삭제 (lastChild부터 지우기)
    while (reviewsContainer.lastChild && reviewsContainer.lastChild !== noReviewsMessage) {
        reviewsContainer.removeChild(reviewsContainer.lastChild);
    }
    
    // 리뷰가 없으면 메시지 표시
    if (!restaurant || restaurant.reviews.length === 0) {
        noReviewsMessage.style.display = 'block';
        return;
    }
    
    // 리뷰가 있으면 메시지 숨기기
    noReviewsMessage.style.display = 'none';
    
    // 리뷰 표시
    restaurant.reviews.forEach(review => {
        const reviewElement = createReviewElement(review);
        reviewsContainer.appendChild(reviewElement);
    });
}

// 리뷰 요소 생성 함수
function createReviewElement(review) {
    console.log("review", review);
    const reviewDiv = document.createElement('div');
    reviewDiv.className = 'card mb-3 review-card';
    reviewDiv.dataset.reviewId = review._id;
    
    // 날짜 포맷팅
    const reviewDate = new Date(review.date);
    const formattedDate = `${reviewDate.getFullYear()}년 ${reviewDate.getMonth() + 1}월 ${reviewDate.getDate()}일`;
    
    // 별점 HTML 생성
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= review.rating) {
            starsHtml += '<i class="fas fa-star text-warning"></i>';
        } else {
            starsHtml += '<i class="far fa-star"></i>';
        }
    }
    
    // 리뷰 작성자 표시
    // userId가 객체인 경우 (populate된 경우)
    let authorDisplay = '사용자';
    if (review.userId && typeof review.userId === 'object' && review.userId.username) {
        authorDisplay = review.userId.username;
    } else if (review.username) {
        // fallback: 직접 저장된 username 사용
        authorDisplay = review.username;
    }
    
    let isOwner = false;
    let isAdmin = false;
    
    // 현재 로그인한 사용자인지 확인
    if (currentUser && currentUser.id) {
        isAdmin = currentUser.role === 'admin';
        
        // userId 비교 - 모두 문자열로 변환하여 비교
        const currentUserId = currentUser.id.toString();
        let reviewUserId;
        
        if (review.userId && typeof review.userId === 'object' && review.userId._id) {
            reviewUserId = review.userId._id.toString();
        } else if (review.userId) {
            reviewUserId = review.userId.toString();
        }
        
        if (reviewUserId === currentUserId) {
            authorDisplay = `내 리뷰 (${currentUser.username})`;
            isOwner = true;
        }
    }
    
    // 수정/삭제 버튼 (본인 리뷰 또는 관리자만 표시)
    let actionButtons = '';
    if (isOwner || isAdmin) {
        actionButtons = `
            <div class="review-actions mt-2">
                <button class="btn btn-sm btn-outline-primary edit-review-btn" data-review-id="${review._id}">
                    <i class="fas fa-edit"></i> 수정
                </button>
                <button class="btn btn-sm btn-outline-danger ms-1 delete-review-btn" data-review-id="${review._id}">
                    <i class="fas fa-trash-alt"></i> 삭제
                </button>
            </div>
        `;
    }
    
    // 리뷰 내용 HTML 생성
    let reviewContent = `
        <div class="card-body">
            <div class="d-flex justify-content-between mb-2">
                <h6 class="mb-0">${authorDisplay}</h6>
                <div>
                    ${starsHtml}
                    <span class="text-muted ms-2">${review.rating.toFixed(1)}</span>
                </div>
            </div>
            <p class="text-muted small mb-2">${formattedDate}</p>
            <p class="review-text">${review.text}</p>
    `;
    
    // 추천 메뉴가 있으면 추가
    if (review.menu) {
        reviewContent += `<p class="small text-success review-menu"><i class="fas fa-utensils me-1"></i> 추천 메뉴: ${review.menu}</p>`;
    }
    
    // 가격이 있으면 추가
    if (review.price) {
        reviewContent += `<p class="small text-primary review-price"><i class="fas fa-euro-sign me-1"></i> 가격: €${review.price.toFixed(2)}</p>`;
    }
    
    // 이미지가 있으면 추가
    if (review.imageUrl) {
        reviewContent += `
            <div class="review-images mt-2">
                <img src="${review.imageUrl}" alt="리뷰 이미지" class="review-image img-thumbnail" style="max-width: 100px; max-height: 100px;">
            </div>
        `;
    }
    
    // 수정/삭제 버튼 추가
    reviewContent += actionButtons;
    
    reviewContent += `</div>`;
    reviewDiv.innerHTML = reviewContent;
    
    // 이벤트 리스너 추가
    if (isOwner || isAdmin) {
        // 수정 버튼 이벤트
        const editBtn = reviewDiv.querySelector('.edit-review-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                showEditReviewModal(review);
            });
        }
        
        // 삭제 버튼 이벤트
        const deleteBtn = reviewDiv.querySelector('.delete-review-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                confirmDeleteReview(review._id);
            });
        }
    }
    
    return reviewDiv;
}

// 리뷰 수정 모달 표시 함수
function showEditReviewModal(review) {
    // 모달에 리뷰 ID 설정
    document.getElementById('edit-review-id').value = review._id;
    document.getElementById('edit-restaurant-id').value = currentRestaurantId;
    
    // 기존 리뷰 내용 채우기
    document.getElementById('edit-review-text').value = review.text;
    document.getElementById('edit-review-menu').value = review.menu || '';
    document.getElementById('edit-review-price').value = review.price || '';
    
    // 별점 설정
    selectedRating = review.rating;
    updateEditStars(review.rating);
    
    // 모달 표시
    const reviewModal = new bootstrap.Modal(document.getElementById('edit-review-modal'));
    reviewModal.show();
}

// 리뷰 삭제 확인
function confirmDeleteReview(reviewId) {
    if (confirm('이 리뷰를 삭제하시겠습니까? 삭제한 리뷰는 복구할 수 없습니다.')) {
        deleteReview(currentRestaurantId, reviewId);
    }
}

// 리뷰 수정 함수
async function updateReview(restaurantId, reviewId, reviewData) {
    try {
        // 토큰 확인
        const token = getToken();
        if (!token) {
            alert('리뷰 수정을 위해 로그인이 필요합니다.');
            return null;
        }

        const url = `${API_URL}/reviews/${restaurantId}/${reviewId}`;
        console.log('API 호출 (PUT):', url, reviewData);
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(reviewData)
        });
        
        const data = await response.json();
        
        console.log('API 응답 (update review):', data);
        
        if (data.success) {
            return data.data;
        } else {
            alert(`리뷰 수정에 실패했습니다: ${data.error}`);
            return null;
        }
    } catch (error) {
        console.error('API 요청 중 오류가 발생했습니다:', error);
        alert('리뷰 수정 중 오류가 발생했습니다.');
        return null;
    }
}

// 리뷰 삭제 함수
async function deleteReview(restaurantId, reviewId) {
    try {
        // 토큰 확인
        const token = getToken();
        if (!token) {
            alert('리뷰 삭제를 위해 로그인이 필요합니다.');
            return null;
        }

        const url = `${API_URL}/reviews/${restaurantId}/${reviewId}`;
        console.log('API 호출 (DELETE):', url);
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        console.log('API 응답 (delete review):', data);
        
        if (data.success) {
            // 리뷰 목록 다시 로드
            const updatedRestaurant = data.data;
            
            // 레스토랑 객체 업데이트
            const index = restaurants.findIndex(r => r._id === currentRestaurantId);
            if (index !== -1) {
                restaurants[index] = updatedRestaurant;
            }
            
            // 리뷰 목록 업데이트
            loadReviews(currentRestaurantId);
            
            // 레스토랑 평점 업데이트
            updateRestaurantRating(updatedRestaurant);
            
            alert('리뷰가 삭제되었습니다.');
            return updatedRestaurant;
        } else {
            alert(`리뷰 삭제에 실패했습니다: ${data.error}`);
            return null;
        }
    } catch (error) {
        console.error('API 요청 중 오류가 발생했습니다:', error);
        alert('리뷰 삭제 중 오류가 발생했습니다.');
        return null;
    }
}

// 리뷰 수정 폼 제출 이벤트 핸들러
async function submitEditReview() {
    // 별점이 선택되지 않은 경우
    if (selectedRating === 0) {
        alert("평점을 선택해주세요.");
        return;
    }
    
    // 리뷰 텍스트가 비어있는 경우
    const reviewText = document.getElementById("edit-review-text").value.trim();
    if (!reviewText) {
        alert("리뷰 내용을 입력해주세요.");
        return;
    }
    
    const reviewId = document.getElementById("edit-review-id").value;
    const restaurantId = document.getElementById("edit-restaurant-id").value;
    
    // 리뷰 데이터 수집
    const reviewData = {
        rating: selectedRating,
        text: reviewText,
        menu: document.getElementById("edit-review-menu").value.trim(),
        price: parseFloat(document.getElementById("edit-review-price").value) || 0
    };
    
    try {
        // API를 통해 리뷰 수정
        const result = await updateReview(restaurantId, reviewId, reviewData);
        
        if (result) {
            // 레스토랑 객체 업데이트
            const index = restaurants.findIndex(r => r._id === currentRestaurantId);
            if (index !== -1) {
                restaurants[index] = result;
            }
            
            // 리뷰 목록 업데이트
            loadReviews(currentRestaurantId);
            
            // 레스토랑 평점 업데이트
            updateRestaurantRating(result);
            
            // 모달 닫기
            bootstrap.Modal.getInstance(document.getElementById('edit-review-modal')).hide();
            
            alert('리뷰가 수정되었습니다.');
        }
    } catch (error) {
        console.error("리뷰 수정 중 오류 발생:", error);
        alert("리뷰를 수정하는 중 오류가 발생했습니다.");
    }
}

// 수정 모달의 별점 업데이트
function updateEditStars(rating) {
    const stars = document.querySelectorAll('.edit-rating-stars i');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('far');
            star.classList.add('fas', 'text-warning');
        } else {
            star.classList.remove('fas', 'text-warning');
            star.classList.add('far');
        }
    });
}

// 별점 시스템 설정 함수 확장
function setupRatingStars() {
    // 기존 리뷰 작성 모달의 별점
    const stars = document.querySelectorAll('.rating-stars i');
    
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.dataset.rating);
            selectedRating = rating;
            updateStars(rating);
        });
        
        star.addEventListener('mouseover', function() {
            const rating = parseInt(this.dataset.rating);
            highlightStars(rating);
        });
        
        star.addEventListener('mouseout', function() {
            resetStarsWithSelected();
        });
    });
    
    // 리뷰 수정 모달의 별점
    const editStars = document.querySelectorAll('.edit-rating-stars i');
    
    editStars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.dataset.rating);
            selectedRating = rating;
            updateEditStars(rating);
        });
        
        star.addEventListener('mouseover', function() {
            const rating = parseInt(this.dataset.rating);
            highlightEditStars(rating);
        });
        
        star.addEventListener('mouseout', function() {
            resetEditStarsWithSelected();
        });
    });
}

// 수정 모달의 별점 하이라이트
function highlightEditStars(rating) {
    const stars = document.querySelectorAll('.edit-rating-stars i');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('far');
            star.classList.add('fas');
        } else {
            star.classList.remove('fas');
            star.classList.add('far');
        }
    });
}

// 수정 모달의 선택된 별점 유지
function resetEditStarsWithSelected() {
    if (selectedRating > 0) {
        updateEditStars(selectedRating);
    } else {
        resetEditStars();
    }
}

// 수정 모달의 별점 초기화
function resetEditStars() {
    const stars = document.querySelectorAll('.edit-rating-stars i');
    stars.forEach(star => {
        star.classList.remove('fas', 'text-warning');
        star.classList.add('far');
    });
}

// 맛집 등록 폼 표시 함수
function showAddRestaurantForm() {
    // 모달 표시
    const addRestaurantModal = new bootstrap.Modal(document.getElementById('add-restaurant-modal'));
    addRestaurantModal.show();
    
    // 폼 초기화
    document.getElementById('restaurant-form').reset();
    
    // 선택된 레스토랑 섹션 숨기기
    document.querySelector('.selected-restaurant').style.display = 'none';
    
    // 지도 클릭 이벤트 추가 (위치 선택)
    enableMapLocationPicker();
}

// 지도에서 위치 선택 기능 활성화
function enableMapLocationPicker() {
    // 안내 메시지 표시
    const positionInfoElement = document.getElementById('position-info');
    positionInfoElement.textContent = '지도에서 위치를 선택해주세요 (클릭)';
    positionInfoElement.style.color = '#e74c3c';
    
    // 기존 이벤트 리스너 제거
    if (window.locationPickerListener) {
        google.maps.event.removeListener(window.locationPickerListener);
    }
    
    // 마커 생성 (아직 지도에 표시 안 함)
    if (window.tempMarker) {
        window.tempMarker.setMap(null);
    }
    
    window.tempMarker = new google.maps.Marker({
        icon: {
            path: 'M12,2C8.13,2,5,5.13,5,9c0,5.25,7,13,7,13s7-7.75,7-13C19,5.13,15.87,2,12,2z M12,11.5c-1.38,0-2.5-1.12-2.5-2.5s1.12-2.5,2.5-2.5s2.5,1.12,2.5,2.5S13.38,11.5,12,11.5z',
            fillColor: '#e74c3c',
            fillOpacity: 1,
            strokeWeight: 1,
            strokeColor: '#ffffff',
            scale: 1.5,
            anchor: new google.maps.Point(12, 22)
        },
        draggable: true,
        animation: google.maps.Animation.DROP
    });
    
    // 지도 클릭 이벤트 추가
    window.locationPickerListener = map.addListener('click', function(e) {
        const clickedPosition = e.latLng;
        
        // 마커 위치 설정 및 지도에 표시
        window.tempMarker.setPosition(clickedPosition);
        window.tempMarker.setMap(map);
        
        // 위도, 경도 입력란에 값 설정
        document.getElementById('restaurant-lat').value = clickedPosition.lat();
        document.getElementById('restaurant-lng').value = clickedPosition.lng();
        
        // 안내 메시지 업데이트
        positionInfoElement.textContent = '위치가 선택되었습니다. 드래그하여 미세 조정할 수 있습니다.';
        positionInfoElement.style.color = '#2ecc71';
        
        // 마커 드래그 이벤트 추가
        google.maps.event.addListener(window.tempMarker, 'dragend', function() {
            const newPosition = window.tempMarker.getPosition();
            document.getElementById('restaurant-lat').value = newPosition.lat();
            document.getElementById('restaurant-lng').value = newPosition.lng();
        });
        
        // 지도 중심 이동
        map.panTo(clickedPosition);
    });
    
    // 모달이 닫힐 때 이벤트 리스너 제거
    document.getElementById('add-restaurant-modal').addEventListener('hidden.bs.modal', function() {
        if (window.locationPickerListener) {
            google.maps.event.removeListener(window.locationPickerListener);
            window.locationPickerListener = null;
        }
        
        if (window.tempMarker) {
            window.tempMarker.setMap(null);
        }
    });
}

// 맛집 저장 폼 표시 함수
function showSaveRestaurantForm(placeId) {
    // 장소 세부 정보 가져오기
    placesService.getDetails({ placeId: placeId }, (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK) {
            alert('장소 정보를 가져오는데 실패했습니다.');
            return;
        }
        
        // 폼 초기화
        document.getElementById('restaurant-form').reset();
        
        // 장소 정보 설정
        document.getElementById('restaurant-place-id').value = place.place_id;
        document.getElementById('restaurant-name').value = place.name;
        
        if (place.geometry && place.geometry.location) {
            document.getElementById('restaurant-lat').value = place.geometry.location.lat();
            document.getElementById('restaurant-lng').value = place.geometry.location.lng();
        }
        
        // 주소 필드 설정 (hidden 필드)
        if (place.formatted_address) {
            document.getElementById('restaurant-address').value = place.formatted_address;
        } else if (place.vicinity) {
            document.getElementById('restaurant-address').value = place.vicinity;
        } else {
            document.getElementById('restaurant-address').value = '주소 정보 없음';
        }
        
        // 선택된 장소 정보 표시
        const infoContainer = document.getElementById('selected-restaurant-info');
        
        let photoHtml = '';
        if (place.photos && place.photos.length > 0) {
            photoHtml = `
                <div class="mt-3 mb-2">
                    <img src="${place.photos[0].getUrl({maxWidth: 300, maxHeight: 200})}" 
                        class="img-fluid rounded" alt="${place.name}">
                </div>
            `;
        }
        
        // 주소 정보 표시 (UI에만 표시, 수정 불가)
        const addressText = place.formatted_address || place.vicinity || '주소 정보 없음';
        
        infoContainer.innerHTML = `
            ${photoHtml}
            <h5 class="card-title">${place.name}</h5>
            <p class="mb-2"><i class="fas fa-map-marker-alt me-1"></i> ${addressText}</p>
        `;
        
        // 선택된 레스토랑 섹션 표시
        document.querySelector('.selected-restaurant').style.display = 'block';
        
        // 모달 표시
        const addRestaurantModal = new bootstrap.Modal(document.getElementById('add-restaurant-modal'));
        addRestaurantModal.show();
        
        // 정보창 닫기
        if (currentInfoWindow) {
            currentInfoWindow.close();
        }
    });
}

// 맛집 등록 처리 함수
async function submitNewRestaurant() {
    console.log('레스토랑 등록 시작');
    
    // 필수 입력값 검증
    const name = document.getElementById('restaurant-name').value;
    const category = document.getElementById('restaurant-category').value;
    const city = document.getElementById('restaurant-city').value;
    const lat = document.getElementById('restaurant-lat').value;
    const lng = document.getElementById('restaurant-lng').value;
    const address = document.getElementById('restaurant-address').value;
    
    if (!name || !category || !city || !lat || !lng || !address) {
        alert('필수 정보를 모두 입력해주세요.');
        return;
    }
    
    // FormData 객체 생성 (파일 업로드를 위해)
    const formData = new FormData();
    
    // 텍스트 필드 추가
    formData.append('name', name);
    formData.append('category', category);
    formData.append('city', city);
    formData.append('lat', lat);
    formData.append('lng', lng);
    formData.append('address', address);
    
    // 이미지 파일 추가 (있는 경우)
    const imageFile = document.getElementById('restaurant-image').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }
    
    // Place ID 저장 (Google 이미지 URL을 동적으로 가져오기 위함)
    const placeId = document.getElementById('restaurant-place-id');
    if (placeId && placeId.value) {
        formData.append('placeId', placeId.value);
        
        // 사용자가 이미지를 업로드하지 않았고, Google 이미지가 있다면 미리 캐싱
        if (!imageFile) {
            placesService.getDetails({ placeId: placeId.value }, (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && 
                    place.photos && place.photos.length > 0) {
                    const imageUrl = place.photos[0].getUrl({ maxWidth: 1000, maxHeight: 600 });
                    imageCache.setImageUrl(placeId.value, imageUrl);
                }
            });
        }
    }
    
    // 화면에 로딩 표시
    const submitBtn = document.querySelector('#add-restaurant-modal .modal-footer .btn-primary');
    if (submitBtn) {
        submitBtn.textContent = '등록 중...';
        submitBtn.disabled = true;
    }
    
    try {
        // 토큰 확인
        const token = getToken();
        if (!token) {
            alert('맛집 등록을 위해 로그인이 필요합니다.');
            // 로그인 모달 표시
            const loginModal = new bootstrap.Modal(document.getElementById('login-modal'));
            loginModal.show();
            return { success: false, error: '로그인이 필요합니다.' };
        }
        
        // API 호출 (FormData 사용)
        const response = await fetch(`${API_URL}/restaurants`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // Content-Type은 FormData에서 자동으로 설정됨
            },
            body: formData
        });
        
        const result = await response.json();
        
        // 결과 처리
        if (result.success) {
            console.log('레스토랑 등록 성공:', result.data);
            
            // 새로 등록된 레스토랑 데이터 추가
            if (result.data) {
                // 레스토랑 목록에 추가
                restaurants.push(result.data);
                
                // 마커 추가
                addRestaurantMarkers();
                
                // 레스토랑 목록 업데이트
                updateRestaurantList();
                
                // 새 레스토랑 위치로 지도 이동
                map.setCenter({ lat: parseFloat(lat), lng: parseFloat(lng) });
                map.setZoom(15);
                
                // 레스토랑 카드 표시
                showRestaurantCard(result.data);
            }
            
            // 모달 닫기
            const modal = bootstrap.Modal.getInstance(document.getElementById('add-restaurant-modal'));
            if (modal) {
                modal.hide();
            }
            
            // 성공 알림 표시
            alert('맛집이 성공적으로 등록되었습니다!');
            
            return { success: true, data: result.data };
        } else {
            console.error('레스토랑 등록 실패:', result.error);
            
            // 실패 알림 표시
            alert(`맛집 등록에 실패했습니다: ${result.error || '알 수 없는 오류'}`);
            
            // 중복 장소 처리
            if (result.duplicateId) {
                alert('이미 등록된 장소입니다. 기존 정보를 확인합니다.');
                
                // 중복된 레스토랑 정보 조회 및 표시
                const duplicateRestaurant = await fetchRestaurantById(result.duplicateId);
                if (duplicateRestaurant) {
                    showRestaurantCard(duplicateRestaurant);
                    map.setCenter({ lat: duplicateRestaurant.lat, lng: duplicateRestaurant.lng });
                    map.setZoom(15);
                }
                
                // 모달 닫기
                const modal = bootstrap.Modal.getInstance(document.getElementById('add-restaurant-modal'));
                if (modal) {
                    modal.hide();
                }
            }
            
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('레스토랑 등록 API 호출 오류:', error);
        alert('맛집 등록 중 오류가 발생했습니다. 나중에 다시 시도해주세요.');
        return { success: false, error: '서버 연결 오류가 발생했습니다.' };
    } finally {
        // 버튼 상태 복원
        if (submitBtn) {
            submitBtn.textContent = '등록하기';
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-plus-circle me-1"></i> 등록하기';
        }
    }
}

// 사이드바 설정 함수
function setupSidebar() {
    const toggleButton = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const closeButton = document.querySelector('.close-sidebar');
    
    // 사이드바 backdrop 엘리먼트 생성
    const backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
    
    // 햄버거 버튼 클릭 이벤트
    toggleButton.addEventListener('click', () => {
        toggleSidebar();
    });
    
    // 닫기 버튼 클릭 이벤트
    closeButton.addEventListener('click', () => {
        toggleSidebar(false);
    });
    
    // 백드롭 클릭 이벤트
    backdrop.addEventListener('click', () => {
        toggleSidebar(false);
    });
    
    // 윈도우 리사이즈 이벤트
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768 && sidebarVisible) {
            toggleSidebar(false);
        }
    });
}

// 사이드바 토글 함수
function toggleSidebar(show) {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.querySelector('.sidebar-backdrop');
    
    if (show === undefined) {
        show = !sidebarVisible;
    }
    
    if (show) {
        sidebar.classList.add('show');
        backdrop.classList.add('show');
        sidebarVisible = true;
    } else {
        sidebar.classList.remove('show');
        backdrop.classList.remove('show');
        sidebarVisible = false;
    }
}

// 지도 크기 조정 함수
function resizeMap() {
    if (map) {
        google.maps.event.trigger(map, 'resize');
    }
}

// 레스토랑 리스트 업데이트
function updateRestaurantList() {
    const container = document.querySelector('.restaurant-items');
    const noRestaurantsMsg = document.getElementById('no-restaurants-message');
    
    // 모든 식당 목록 항목 완전히 제거 (노드 리스트를 배열로 변환하여 반복)
    const existingItems = Array.from(container.children).filter(child => child !== noRestaurantsMsg);
    existingItems.forEach(item => container.removeChild(item));
    
    // 레스토랑이 없는 경우 메시지 표시
    if (restaurants.length === 0) {
        noRestaurantsMsg.style.display = 'block';
        return;
    }
    
    // 메시지 숨기기
    noRestaurantsMsg.style.display = 'none';
    
    // 중복 제거를 위한 Set 생성
    const addedRestaurants = new Set();
    
    // 레스토랑 항목 추가
    restaurants.forEach(restaurant => {
        // 중복 검사: 이름과 주소를 기준으로 
        const restaurantKey = `${restaurant.name}-${restaurant.address}`;
        if (addedRestaurants.has(restaurantKey)) {
            // 이미 추가된 레스토랑은 건너뜀
            console.log('중복 레스토랑 제외:', restaurant.name);
            return;
        }
        
        // 중복이 아닌 경우 Set에 추가
        addedRestaurants.add(restaurantKey);
        
        const item = document.createElement('a');
        item.href = '#';
        item.className = 'list-group-item list-group-item-action d-flex align-items-center';
        item.dataset.id = restaurant._id; // MongoDB ID 사용
        
        const categoryStyle = getCategoryStyle(restaurant.category);
        const cityName = getCityNameInKorean(restaurant.city) || '기타';
        
        item.innerHTML = `
            <div class="me-2">
                <i class="fas fa-circle" style="color: ${categoryStyle.color}; font-size: 0.7rem;"></i>
            </div>
            <div class="flex-grow-1">
                <div class="fw-bold">${restaurant.name}</div>
                <div class="small text-muted">${cityName}</div>
            </div>
            <div class="text-warning small">
                <i class="fas fa-star"></i> ${restaurant.rating.toFixed(1)}
            </div>
        `;
        
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // 해당 레스토랑 찾기
            const restaurant = restaurants.find(r => r._id === item.dataset.id);
            if (restaurant) {
                // 지도 중심 이동
                map.setCenter({ lat: restaurant.lat, lng: restaurant.lng });
                map.setZoom(16);
                
                // 레스토랑 카드 표시
                showRestaurantCard(restaurant);
            }
        });
        
        container.appendChild(item);
    });
    
    console.log(`처리된 레스토랑 수: ${addedRestaurants.size}/${restaurants.length}`);
}

// 카테고리에 따른 부트스트랩 스타일 반환 함수
function getCategoryStyle(category) {
    switch (category) {
        case '한식': return 'danger';
        case '일식': return 'primary';
        case '중식': return 'warning';
        case '양식': return 'success';
        case '카페': return 'info';
        default: return 'secondary';
    }
}

// 도시 영문명을 한글명으로 변환하는 함수
function getCityNameInKorean(cityCode) {
    if (!cityCode) return '기타';
    
    switch (cityCode.toLowerCase()) {
        case 'amsterdam': return '암스테르담';
        case 'rotterdam': return '로테르담';
        case 'hague': 
        case 'the hague': return '헤이그';
        case 'utrecht': return '위트레흐트';
        case 'eindhoven': return '아인트호벤';
        case 'other': return '기타';
        default: return cityCode;
    }
}

// Google Places 장소를 저장된 맛집으로 추가하는 함수
function saveGooglePlace(placeId) {
    // 장소 세부 정보 가져오기
    placesService.getDetails({ placeId: placeId }, (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK) {
            alert('장소 정보를 가져오는데 실패했습니다.');
            return;
        }
        
        // 장소의 카테고리 추측
        let category = '기타';
        if (place.types) {
            if (place.types.includes('restaurant')) {
                category = '양식';
            } else if (place.types.includes('cafe')) {
                category = '카페';
            } else if (place.types.includes('bar')) {
                category = '양식';
            }
        }
        
        // 영업시간 정보 가져오기
        let hours = '정보 없음';
        if (place.opening_hours && place.opening_hours.weekday_text) {
            hours = place.opening_hours.weekday_text.join(', ');
        }
        
        // 새 맛집 ID 생성 (가장 큰 ID + 1)
        const maxId = restaurants.reduce((max, r) => Math.max(max, r.id), 0);
        const newId = maxId + 1;
        
        // 새 맛집 객체 생성
        const newRestaurant = {
            id: newId,
            name: place.name,
            category: category,
            address: place.formatted_address || '',
            phone: place.formatted_phone_number || '정보 없음',
            hours: hours,
            rating: place.rating || 4.0,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            image: place.photos && place.photos.length > 0 
                ? place.photos[0].getUrl({ maxWidth: 1000, maxHeight: 600 }) 
                : "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?q=80&w=1470&auto=format&fit=crop",
            reviews: []
        };
        
        // 맛집 목록에 추가
        restaurants.push(newRestaurant);
        
        // Places 마커 제거
        clearPlacesMarkers();
        
        // 마커 다시 추가 (새 맛집 포함)
        addRestaurantMarkers();
        
        // 정보창 닫기
        if (currentInfoWindow) {
            currentInfoWindow.close();
            currentInfoWindow = null;
        }
        
        // 새 맛집 카드 표시
        showRestaurantCard(newRestaurant);
        
        // 새 맛집 위치로 이동
        map.setCenter({ lat: newRestaurant.lat, lng: newRestaurant.lng });
        map.setZoom(15);
        
        // 저장 알림
        alert('맛집이 성공적으로 저장되었습니다.');
    });
}

// 사용자 인증 확인 및 UI 업데이트
async function checkAuth() {
    const token = getToken();
    
    if (!token) {
        updateUIForLoggedOut();
        return false;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.data;
            updateUIForLoggedIn();
            return true;
        } else {
            removeToken();
            updateUIForLoggedOut();
            return false;
        }
    } catch (error) {
        console.error('인증 확인 중 오류 발생:', error);
        removeToken();
        updateUIForLoggedOut();
        return false;
    }
}

// 로그인 상태 UI 업데이트
function updateUIForLoggedIn() {
    const authButtons = document.querySelector('.auth-buttons');
    if (authButtons) {
        authButtons.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" id="userDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="fas fa-user me-1 d-none d-md-inline-block"></i>${currentUser.username}
                </button>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                    <li><a class="dropdown-item" href="#"><i class="fas fa-user-circle me-2"></i>프로필</a></li>
                    <li><a class="dropdown-item" href="#"><i class="fas fa-heart me-2"></i>찜한 맛집</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" id="logout-button"><i class="fas fa-sign-out-alt me-2"></i>로그아웃</a></li>
                </ul>
            </div>
        `;
        
        // 로그아웃 버튼 이벤트 리스너
        document.getElementById('logout-button')?.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
}

// 로그아웃 상태 UI 업데이트
function updateUIForLoggedOut() {
    const authButtons = document.querySelector('.auth-buttons');
    if (authButtons) {
        authButtons.innerHTML = `
            <button class="btn btn-outline-secondary btn-sm" id="login-button" data-bs-toggle="modal" data-bs-target="#login-modal">
                <i class="fas fa-sign-in-alt me-1 d-none d-md-inline-block"></i>로그인
            </button>
            <button class="btn btn-secondary btn-sm" id="register-button" data-bs-toggle="modal" data-bs-target="#register-modal">
                <i class="fas fa-user-plus me-1 d-none d-md-inline-block"></i>회원가입
            </button>
        `;
    }
}

// 로그아웃 처리
function logout() {
    removeToken();
    currentUser = null;
    updateUIForLoggedOut();
    alert('로그아웃되었습니다.');
}

// 로그인 처리
async function login(account, password, rememberMe) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ account, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 토큰 저장
            setToken(data.data.token);
            currentUser = data.data;
            
            // UI 업데이트
            updateUIForLoggedIn();
            
            // 모달 닫기
            const loginModal = bootstrap.Modal.getInstance(document.getElementById('login-modal'));
            if (loginModal) loginModal.hide();
            
            // 폼 초기화
            document.getElementById('login-form').reset();
            
            // 성공 메시지
            alert('로그인되었습니다.');
            return true;
        } else {
            alert(data.error || '로그인에 실패했습니다.');
            return false;
        }
    } catch (error) {
        console.error('로그인 중 오류 발생:', error);
        alert('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
        return false;
    }
}

// 회원가입 처리
async function register(account, username, password) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ account, username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 토큰 저장
            setToken(data.data.token);
            currentUser = data.data;
            
            // UI 업데이트
            updateUIForLoggedIn();
            
            // 모달 닫기
            const registerModal = bootstrap.Modal.getInstance(document.getElementById('register-modal'));
            if (registerModal) registerModal.hide();
            
            // 폼 초기화
            document.getElementById('register-form').reset();
            
            // 성공 메시지
            alert('회원가입이 완료되었습니다.');
            return true;
        } else {
            alert(data.error || '회원가입에 실패했습니다.');
            return false;
        }
    } catch (error) {
        console.error('회원가입 중 오류 발생:', error);
        alert('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.');
        return false;
    }
}

// 로그인 및 회원가입 관련 코드
document.addEventListener('DOMContentLoaded', function() {
    // 모달 간 전환
    document.getElementById('show-register')?.addEventListener('click', function(e) {
        e.preventDefault();
        const loginModal = bootstrap.Modal.getInstance(document.getElementById('login-modal'));
        if (loginModal) loginModal.hide();
        
        const registerModal = new bootstrap.Modal(document.getElementById('register-modal'));
        registerModal.show();
    });
    
    document.getElementById('show-login')?.addEventListener('click', function(e) {
        e.preventDefault();
        const registerModal = bootstrap.Modal.getInstance(document.getElementById('register-modal'));
        if (registerModal) registerModal.hide();
        
        const loginModal = new bootstrap.Modal(document.getElementById('login-modal'));
        loginModal.show();
    });
    
    // 로그인 폼 제출
    document.getElementById('login-form')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const account = document.getElementById('login-account').value;
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('remember-me').checked;
        
        login(account, password, rememberMe);
    });
    
    // 회원가입 폼 제출
    document.getElementById('register-form')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const account = document.getElementById('register-account').value;
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm').value;
        
        // 비밀번호 일치 확인
        if (password !== passwordConfirm) {
            alert('비밀번호가 일치하지 않습니다.');
            return;
        }
        
        register(account, username, password);
    });
    
    // 페이지 로드 시 인증 상태 확인
    checkAuth();
});

// 페이지 로드 시 Google Maps API가 로드된 후 initMap 함수가 호출됩니다.
// Google Maps API 스크립트에 async와 defer 속성이 있으므로 이 파일은 별도의 window.onload 처리가 필요 없습니다. 

// 레스토랑 삭제 함수
async function deleteRestaurant(restaurantId) {
    try {
        // 토큰 확인
        const token = getToken();
        if (!token) {
            alert('맛집 삭제를 위해 로그인이 필요합니다.');
            return { success: false, error: '로그인이 필요합니다.' };
        }

        const response = await fetch(`${API_URL}/restaurants/${restaurantId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('레스토랑 삭제 성공');
            
            // 로컬 데이터에서도 삭제
            restaurants = restaurants.filter(r => r._id !== restaurantId && r.id !== restaurantId);
            
            // 마커 제거 및 지도 업데이트
            clearMarkers();
            addRestaurantMarkers();
            
            // 목록 업데이트
            updateRestaurantList();
            
            return { success: true };
        } else {
            console.error('레스토랑 삭제 실패:', result.error);
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('레스토랑 삭제 API 호출 오류:', error);
        return { success: false, error: '서버 연결 오류가 발생했습니다.' };
    }
} 