// 학교 정보 설정
const SCHOOL_CODE = '7631013';
const OFFICE_CODE = 'J10';

// 날짜 형식 변환 함수
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// 애니메이션 효과를 위한 함수
function fadeIn(element) {
    element.style.opacity = 0;
    element.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        element.style.opacity = 1;
        element.style.transform = 'translateY(0)';
    }, 100);
}

// 영양정보 파싱 함수
function parseNutritionInfo(calories) {
    const nutritionData = {
        protein: 0,
        fat: 0,
        carbs: 0,
        calories: 0
    };

    try {
        // 다양한 구분자( / , ; )로 분리
        const parts = calories.split(/\n|\/|,|;/).map(s => s.trim());
        parts.forEach(part => {
            // 단백질
            let match = part.match(/단백질\D*(\d+\.?\d*)/);
            if (match) nutritionData.protein = parseFloat(match[1]);
            // 지방
            match = part.match(/지방\D*(\d+\.?\d*)/);
            if (match) nutritionData.fat = parseFloat(match[1]);
            // 탄수화물
            match = part.match(/탄수화물\D*(\d+\.?\d*)/);
            if (match) nutritionData.carbs = parseFloat(match[1]);
            // 열량
            match = part.match(/(열량|칼로리|kcal)\D*(\d+\.?\d*)/);
            if (match) nutritionData.calories = parseFloat(match[2] || match[1]);
        });
        // 디버깅
        console.log('Parsed nutrition data:', nutritionData, 'from:', calories);
    } catch (error) {
        console.error('Error parsing nutrition info:', error, calories);
    }
    return nutritionData;
}

// 영양정보 차트 생성 함수
function createNutritionChart(nutritionData) {
    const ctx = document.createElement('canvas');
    ctx.id = 'nutritionChart';
    
    // 기존 차트가 있다면 제거
    const existingChart = document.getElementById('nutritionChart');
    if (existingChart) {
        existingChart.remove();
    }

    // 영양소 비율 계산
    const total = nutritionData.protein + nutritionData.fat + nutritionData.carbs;
    const proteinRatio = (nutritionData.protein / total) * 100;
    const fatRatio = (nutritionData.fat / total) * 100;
    const carbsRatio = (nutritionData.carbs / total) * 100;

    // 도넛 차트 생성
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['단백질', '지방', '탄수화물'],
            datasets: [{
                data: [proteinRatio, fatRatio, carbsRatio],
                backgroundColor: [
                    'rgba(108, 99, 255, 0.8)',
                    'rgba(255, 107, 107, 0.8)',
                    'rgba(76, 175, 80, 0.8)'
                ],
                borderColor: [
                    'rgba(108, 99, 255, 1)',
                    'rgba(255, 107, 107, 1)',
                    'rgba(76, 175, 80, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            family: "'Noto Sans KR', sans-serif",
                            size: 14
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            return `${label}: ${value.toFixed(1)}%`;
                        }
                    }
                }
            },
            cutout: '60%'
        }
    });

    return ctx;
}

// 로딩 상태 표시
function showLoading() {
    const mealContent = document.getElementById('mealContent');
    mealContent.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>급식 정보를 불러오는 중입니다...</p>
        </div>
    `;
    fadeIn(mealContent);
}

// 에러 상태 표시
function showError(message) {
    const mealContent = document.getElementById('mealContent');
    mealContent.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-circle"></i>
            <p>${message}</p>
        </div>
    `;
    fadeIn(mealContent);
}

// 급식 정보 가져오기
async function getMealInfo() {
    const dateInput = document.getElementById('mealDate');
    const selectedDate = dateInput.value;
    
    if (!selectedDate) {
        showError('날짜를 선택해주세요.');
        return;
    }

    const date = new Date(selectedDate);
    const formattedDate = formatDate(date);
    
    // 선택된 날짜 표시
    const dateElement = document.getElementById('selectedDate');
    dateElement.textContent = 
        `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 급식 정보`;
    fadeIn(dateElement);

    showLoading();

    try {
        const response = await fetch(
            `https://open.neis.go.kr/hub/mealServiceDietInfo?ATPT_OFCDC_SC_CODE=${OFFICE_CODE}&SD_SCHUL_CODE=${SCHOOL_CODE}&MLSV_YMD=${formattedDate}`
        );
        
        const data = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, "text/xml");
        
        // 급식 정보 파싱
        const mealInfo = xmlDoc.getElementsByTagName('row')[0];
        if (!mealInfo) {
            showError('해당 날짜의 급식 정보가 없습니다.');
            return;
        }

        const menu = mealInfo.getElementsByTagName('DDISH_NM')[0].textContent;
        const calories = mealInfo.getElementsByTagName('CAL_INFO')[0].textContent;
        
        // 영양정보 파싱
        const nutritionData = parseNutritionInfo(calories);
        
        // HTML 생성
        const mealContent = document.getElementById('mealContent');
        mealContent.innerHTML = `
            <div class="menu">
                <h3><i class="fas fa-utensils"></i> 메뉴</h3>
                <p>${menu.replace(/<br\/>/g, '<br>')}</p>
            </div>
            <div class="nutrition-info">
                <h3><i class="fas fa-chart-pie"></i> 영양정보</h3>
                <div class="nutrition-chart-container"></div>
                <div class="nutrition-details">
                    <div class="nutrition-item">
                        <span class="label">열량</span>
                        <span class="value">${nutritionData.calories} kcal</span>
                    </div>
                    <div class="nutrition-item">
                        <span class="label">단백질</span>
                        <span class="value">${nutritionData.protein}g</span>
                    </div>
                    <div class="nutrition-item">
                        <span class="label">지방</span>
                        <span class="value">${nutritionData.fat}g</span>
                    </div>
                    <div class="nutrition-item">
                        <span class="label">탄수화물</span>
                        <span class="value">${nutritionData.carbs}g</span>
                    </div>
                </div>
            </div>
        `;

        // 차트 생성 및 추가
        const chartContainer = mealContent.querySelector('.nutrition-chart-container');
        const chart = createNutritionChart(nutritionData);
        chartContainer.appendChild(chart);
        
        fadeIn(mealContent);
    } catch (error) {
        console.error('Error fetching meal information:', error);
        showError('급식 정보를 가져오는 중 오류가 발생했습니다.');
    }
}

// 페이지 로드 시 오늘 날짜 설정
window.onload = function() {
    const today = new Date();
    const dateInput = document.getElementById('mealDate');
    dateInput.valueAsDate = today;
    
    // 초기 애니메이션
    const container = document.querySelector('.container');
    fadeIn(container);
};
