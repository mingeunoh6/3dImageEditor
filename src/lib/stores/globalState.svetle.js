/**
 * 글로벌 캔버스 상태 관리
 * 캔버스 사이즈와 관련된 모든 상태를 중앙화하여 컴포넌트 간 동기화 문제 해결
 */

// 캔버스 관련 글로벌 상태
export const canvasState = $state({
    // 뷰포트 크기
    viewportWidth: 0,
    viewportHeight: 0,
    
    // 종횡비
    aspectRatio: 1,
    
    // FLUX API용 이미지 크기
    fluxWidth: 1024,
    fluxHeight: 1024,
    fluxAspectRatio: '1:1',
    
    // 현재 배경 정보
    currentBG: '',
    currentBGRatio: '1:1',
    
    // 컨테이너 정보
    containerWidth: 0,
    containerHeight: 0,
    isPortrait: false
});

/**
 * 뷰포트 크기 업데이트
 * @param {number} width - 새로운 뷰포트 너비
 * @param {number} height - 새로운 뷰포트 높이
 */
export function updateViewportSize(width, height) {
    console.log('Global state: Updating viewport size', { width, height });
    canvasState.viewportWidth = width;
    canvasState.viewportHeight = height;
}

/**
 * 종횡비 업데이트 및 뷰포트 크기 재계산
 * @param {number} ratio - 새로운 종횡비
 */
export function updateAspectRatio(ratio) {
    console.log('Global state: Updating aspect ratio', ratio);
    canvasState.aspectRatio = ratio;
    
    // 종횡비 변경시 뷰포트 크기 재계산
    recalculateViewportSize();
}

/**
 * 컨테이너 크기 업데이트
 * @param {number} width - 컨테이너 너비
 * @param {number} height - 컨테이너 높이
 */
export function updateContainerSize(width, height) {
    console.log('Global state: Updating container size', { width, height });
    canvasState.containerWidth = width;
    canvasState.containerHeight = height;
    canvasState.isPortrait = height > width;
    
    // 컨테이너 크기 변경시 뷰포트 크기 재계산
    recalculateViewportSize();
}

/**
 * FLUX API용 이미지 크기 업데이트
 * @param {string} aspectRatio - 종횡비 문자열 (예: '1:1', '16:9')
 * @param {number} width - 이미지 너비
 * @param {number} height - 이미지 높이
 */
export function updateFluxImageSize(aspectRatio, width, height) {
    console.log('Global state: Updating FLUX image size', { aspectRatio, width, height });
    canvasState.fluxAspectRatio = aspectRatio;
    canvasState.fluxWidth = width;
    canvasState.fluxHeight = height;
    
    // FLUX 크기 변경시 종횡비도 업데이트
    if (width && height) {
        updateAspectRatio(width / height);
    }
}

/**
 * 배경 정보 업데이트
 * @param {string} bgUrl - 배경 이미지 URL
 * @param {string} ratio - 배경 비율
 */
export function updateBackgroundInfo(bgUrl, ratio = '1:1') {
    console.log('Global state: Updating background info', { bgUrl, ratio });
    canvasState.currentBG = bgUrl || '';
    canvasState.currentBGRatio = ratio;
}

/**
 * 뷰포트 크기 재계산
 * 컨테이너 크기와 종횡비를 기반으로 최적의 뷰포트 크기 계산
 */
function recalculateViewportSize() {
    if (canvasState.containerWidth === 0 || canvasState.containerHeight === 0) {
        return;
    }
    
    const maxWidth = canvasState.containerWidth * 0.9;
    const maxHeight = canvasState.containerHeight * 0.9;
    const aspectRatio = canvasState.aspectRatio;
    
    let newWidth, newHeight;
    
    if (aspectRatio === 1) {
        // 정사각형
        newWidth = Math.min(maxWidth, maxHeight);
        newHeight = newWidth;
    } else if (aspectRatio > 1) {
        // 가로형 (너비 > 높이)
        newWidth = maxWidth;
        newHeight = maxWidth / aspectRatio;
        
        if (newHeight > maxHeight) {
            newHeight = maxHeight;
            newWidth = maxHeight * aspectRatio;
        }
    } else {
        // 세로형 (높이 > 너비)
        newHeight = maxHeight;
        newWidth = maxHeight * aspectRatio;
        
        if (newWidth > maxWidth) {
            newWidth = maxWidth;
            newHeight = maxWidth / aspectRatio;
        }
    }
    
    // 계산된 크기로 업데이트
    canvasState.viewportWidth = Math.floor(newWidth);
    canvasState.viewportHeight = Math.floor(newHeight);
    
    console.log('Global state: Recalculated viewport size', {
        width: canvasState.viewportWidth,
        height: canvasState.viewportHeight,
        aspectRatio: canvasState.aspectRatio
    });
}

/**
 * 비율 문자열에서 표준 크기 가져오기
 * @param {string} ratio - 비율 문자열
 * @returns {{width: number, height: number}} 표준 크기
 */
export function getDimensionsFromRatio(ratio) {
    switch (ratio) {
        case '1:1':
            return { width: 1024, height: 1024 };
        case '2:3':
            return { width: 896, height: 1344 };
        case '3:4':
            return { width: 768, height: 1024 };
        case '4:5':
            return { width: 1024, height: 1280 };
        case '9:16':
            return { width: 736, height: 1280 };
        case '3:2':
            return { width: 1344, height: 896 };
        case '4:3':
            return { width: 1024, height: 768 };
        case '5:4':
            return { width: 1280, height: 1024 };
        case '16:9':
            return { width: 1280, height: 736 };
        default:
            return { width: 1024, height: 1024 };
    }
}

/**
 * 글로벌 상태 초기화
 */
export function initializeCanvasState() {
    console.log('Global state: Initializing canvas state');
    const initialDimensions = getDimensionsFromRatio('1:1');
    
    canvasState.fluxWidth = initialDimensions.width;
    canvasState.fluxHeight = initialDimensions.height;
    canvasState.fluxAspectRatio = '1:1';
    canvasState.aspectRatio = 1;
    canvasState.currentBGRatio = '1:1';
}

/**
 * 현재 캔버스 상태 로깅 (디버깅용)
 */
export function logCanvasState() {
    console.log('Current canvas state:', {
        viewport: {
            width: canvasState.viewportWidth,
            height: canvasState.viewportHeight
        },
        flux: {
            width: canvasState.fluxWidth,
            height: canvasState.fluxHeight,
            aspectRatio: canvasState.fluxAspectRatio
        },
        container: {
            width: canvasState.containerWidth,
            height: canvasState.containerHeight,
            isPortrait: canvasState.isPortrait
        },
        aspectRatio: canvasState.aspectRatio,
        background: {
            url: canvasState.currentBG,
            ratio: canvasState.currentBGRatio
        }
    });
} 