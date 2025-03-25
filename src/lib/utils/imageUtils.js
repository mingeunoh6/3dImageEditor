/**
 * 이미지 처리를 위한 공통 유틸리티 함수
 * 다양한 이미지 형식 간 변환 및 처리를 위한 유틸리티 함수 모음
 */

/**
 * 다양한 소스에서 base64 문자열로 변환
 * @param {File|Blob|string} source - 파일, Blob, URL 또는 이미 base64 형식인 문자열
 * @param {boolean} stripHeader - base64 header 제거 여부 (기본: false)
 * @returns {Promise<string>} base64 문자열
 */
export async function toBase64(source, stripHeader = false) {
	// 이미 base64 형식이면 바로 반환
	if (typeof source === 'string' && source.startsWith('data:')) {
		return stripHeader ? source.split(',')[1] : source;
	}

	// File 또는 Blob인 경우
	if (source instanceof File || source instanceof Blob) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const result = reader.result;
				resolve(stripHeader ? result.split(',')[1] : result);
			};
			reader.onerror = reject;
			reader.readAsDataURL(source);
		});
	}

	// URL인 경우 (외부 URL)
	if (typeof source === 'string' && (source.startsWith('http') || source.startsWith('blob:'))) {
		try {
			const response = await fetch(source);
			if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);

			const blob = await response.blob();
			return toBase64(blob, stripHeader);
		} catch (error) {
			console.error('Error converting URL to base64:', error);
			throw error;
		}
	}

	throw new Error('Unsupported source type for base64 conversion');
}

/**
 * 다양한 소스에서 Blob URL 생성
 * @param {File|Blob|string} source - 파일, Blob, 또는 URL
 * @returns {Promise<string>} Blob URL
 */
export async function toBlobURL(source) {
	// 이미 Blob URL인 경우
	if (typeof source === 'string' && source.startsWith('blob:')) {
		return source;
	}

	// File 또는 Blob인 경우
	if (source instanceof File || source instanceof Blob) {
		return URL.createObjectURL(source);
	}

	// base64 문자열인 경우
	if (typeof source === 'string' && source.startsWith('data:')) {
		const response = await fetch(source);
		const blob = await response.blob();
		return URL.createObjectURL(blob);
	}

	// 외부 URL인 경우
	if (typeof source === 'string' && source.startsWith('http')) {
		const response = await fetch(source);
		if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);

		const blob = await response.blob();
		return URL.createObjectURL(blob);
	}

	throw new Error('Unsupported source type for Blob URL creation');
}

/**
 * 특정 URL의 이미지 치수를 가져옴
 * @param {string} imageUrl - 이미지 URL
 * @returns {Promise<{width: number, height: number}>} 이미지 치수
 */
export function getImageDimensions(imageUrl) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve({ width: img.width, height: img.height });
		img.onerror = () => reject(new Error('Failed to load image'));
		img.src = imageUrl;
	});
}

/**
 * 이미지 비율 문자열로부터 width, height 구하기
 * @param {string} ratio - 비율 문자열 (예: "1:1", "16:9")
 * @returns {{width: number, height: number}} 해당 비율의 표준 치수
 */
export function getDimensionsFromRatio(ratio) {
	const standardSizes = {
		'1:1': { width: 1024, height: 1024 },
		'2:3': { width: 896, height: 1344 },
		'3:4': { width: 768, height: 1024 },
		'4:5': { width: 1024, height: 1280 },
		'9:16': { width: 736, height: 1280 },
		'3:2': { width: 1344, height: 896 },
		'4:3': { width: 1024, height: 768 },
		'5:4': { width: 1280, height: 1024 },
		'16:9': { width: 1280, height: 736 }
	};

	return standardSizes[ratio] || { width: 1024, height: 1024 };
}

/**
 * Blob URL 해제 (메모리 누수 방지)
 * @param {string} url - 해제할 Blob URL
 */
export function revokeBlobURL(url) {
	if (typeof url === 'string' && url.startsWith('blob:')) {
		URL.revokeObjectURL(url);
	}
}

/**
 * 이미지 데이터 객체 생성 (표준화된 포맷)
 * @param {Object} data - 이미지 데이터
 * @returns {Object} 표준화된 이미지 데이터 객체
 */
export function createImageData({
	url = '',
	base64 = '',
	width = 0,
	height = 0,
	ratio = '1:1',
	blob = null,
	type = ''
}) {
	return {
		url, // 표시용 URL
		base64, // API 요청용 base64
		width,
		height,
		ratio,
		blob,
		type: type || blob?.type || ''
	};
}

/**
 * 이미지 파일 이름 생성
 * @param {string} prefix - 파일명 접두사
 * @param {string} extension - 파일 확장자 (기본: png)
 * @returns {string} 타임스탬프가 포함된 파일명
 */
export function generateImageFilename(prefix = 'image', extension = 'png') {
	const now = new Date();
	const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0];
	return `${prefix}-${timestamp}.${extension}`;
}
