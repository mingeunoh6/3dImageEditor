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
 * 종횡비 업데이트
 * @param {number} ratio - 새로운 종횡비
 */
export function updateAspectRatio(ratio) {
    console.log('Global state: Updating aspect ratio', ratio);
    canvasState.aspectRatio = ratio;
}

/**
 * FLUX 이미지 크기 업데이트
 * @param {number} width - FLUX 이미지 너비
 * @param {number} height - FLUX 이미지 높이
 * @param {string} aspectRatio - 종횡비 문자열
 */
export function updateFluxImageSize(width, height, aspectRatio) {
    console.log('Global state: Updating FLUX image size', { width, height, aspectRatio });
    canvasState.fluxWidth = width;
    canvasState.fluxHeight = height;
    canvasState.fluxAspectRatio = aspectRatio;
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
}

/**
 * 배경 정보 업데이트
 * @param {string} backgroundUrl - 배경 이미지 URL
 */
export function updateBackgroundInfo(backgroundUrl) {
    console.log('Global state: Updating background info', backgroundUrl);
    canvasState.currentBG = backgroundUrl;
}

/**
 * 글로벌 캔버스 상태 초기화
 */
export function initializeCanvasState() {
    console.log('Global state: Initializing canvas state');
    // 초기값으로 설정
    canvasState.viewportWidth = 0;
    canvasState.viewportHeight = 0;
    canvasState.aspectRatio = 1;
    canvasState.fluxWidth = 1024;
    canvasState.fluxHeight = 1024;
    canvasState.fluxAspectRatio = '1:1';
    canvasState.currentBG = '';
    canvasState.currentBGRatio = '1:1';
    canvasState.containerWidth = 0;
    canvasState.containerHeight = 0;
    canvasState.isPortrait = false;
}

/**
 * 디버깅용 로그 출력
 */
export function logCanvasState() {
    console.log('Current global canvas state:', {
        viewport: {
            width: canvasState.viewportWidth,
            height: canvasState.viewportHeight
        },
        aspectRatio: canvasState.aspectRatio,
        flux: {
            width: canvasState.fluxWidth,
            height: canvasState.fluxHeight,
            aspectRatio: canvasState.fluxAspectRatio
        },
        background: {
            url: canvasState.currentBG,
            ratio: canvasState.currentBGRatio
        },
        container: {
            width: canvasState.containerWidth,
            height: canvasState.containerHeight,
            isPortrait: canvasState.isPortrait
        }
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