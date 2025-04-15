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

// Calculate the file size from a base64 string
export function getBase64FileSize(base64String) {
	// Base64 size calculation: every 4 base64 characters represent 3 bytes
	// Add 33% to get the approximate byte size
	return Math.round((base64String.length * 3) / 4);
}

// Format file size to human-readable format
export function formatFileSize(bytes) {
	if (bytes < 1024) return bytes + ' bytes';
	else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
	else return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export async function compressAndConvertToBase64(
	file,
	maxWidth = 1024,
	maxHeight = 1024,
	quality = 0.7
) {
	return new Promise((resolve, reject) => {
		// Create a FileReader to read the file
		const reader = new FileReader();

		reader.onload = (event) => {
			// Create an image element to load the file data
			const img = new Image();

			img.onload = () => {
				// Calculate new dimensions while maintaining aspect ratio
				let width = img.width;
				let height = img.height;

				if (width > maxWidth) {
					height = (height * maxWidth) / width;
					width = maxWidth;
				}

				if (height > maxHeight) {
					width = (width * maxHeight) / height;
					height = maxHeight;
				}

				// Create a canvas and resize the image
				const canvas = document.createElement('canvas');
				canvas.width = width;
				canvas.height = height;

				// Draw the image on the canvas
				const ctx = canvas.getContext('2d');
				ctx.drawImage(img, 0, 0, width, height);

				// Convert the canvas to a base64 string
				const base64String = canvas.toDataURL('image/jpeg', quality).split(',')[1];

				// Clean up
				canvas.remove();

				resolve(base64String);
			};

			img.onerror = () => {
				reject(new Error('Failed to load image'));
			};

			// Set the source of the image to the file data
			img.src = event.target.result;
		};

		reader.onerror = () => {
			reject(new Error('Failed to read file'));
		};

		// Read the file as a data URL
		reader.readAsDataURL(file);
	});
}

export async function matchDimension(referenceImage, targetImage, options = {}) {
	const { quality = 0.9, preserveAlpha = true, outputFormat = null, debug = false } = options;

	// Input validation with detailed error
	if (!referenceImage) {
		throw new Error('Reference image is required but was not provided');
	}

	if (!targetImage) {
		throw new Error('Target image to resize is required but was not provided');
	}

	// Helper function to ensure data URL format
	const ensureDataUrl = (img, defaultMime = 'image/jpeg') => {
		if (img.startsWith('data:')) return img;
		return `data:${defaultMime};base64,${img}`;
	};

	// Ensure images have proper format
	const refImgSrc = ensureDataUrl(referenceImage);
	const targetImgSrc = ensureDataUrl(targetImage);

	if (debug) {
		console.log('Reference image format:', refImgSrc.substring(0, 30) + '...');
		console.log('Target image format:', targetImgSrc.substring(0, 30) + '...');
	}

	return new Promise((resolve, reject) => {
		try {
			// Create and load the reference image to get dimensions
			const refImg = new Image();

			refImg.onload = () => {
				try {
					const targetWidth = refImg.width;
					const targetHeight = refImg.height;

					if (debug) {
						console.log(`Reference dimensions: ${targetWidth}x${targetHeight}`);
					}

					// Now load the target image to resize it
					const targetImg = new Image();

					targetImg.onload = () => {
						try {
							if (debug) {
								console.log(`Original target dimensions: ${targetImg.width}x${targetImg.height}`);
							}

							// Create canvas for resizing
							const canvas = document.createElement('canvas');
							canvas.width = targetWidth;
							canvas.height = targetHeight;

							// Get drawing context - use 2d context with alpha if preserving transparency
							const ctx = canvas.getContext('2d', { alpha: preserveAlpha });

							// Clear canvas
							if (preserveAlpha) {
								ctx.clearRect(0, 0, targetWidth, targetHeight);
							} else {
								// Fill with white if not preserving alpha
								ctx.fillStyle = '#FFFFFF';
								ctx.fillRect(0, 0, targetWidth, targetHeight);
							}

							// Draw the target image resized to match reference dimensions
							ctx.drawImage(targetImg, 0, 0, targetWidth, targetHeight);

							// Determine output format
							let finalFormat = 'image/png'; // Default for alpha preservation

							if (outputFormat) {
								// Use specified format if provided
								finalFormat = outputFormat;
							} else if (!preserveAlpha) {
								// Use JPEG if alpha is not important
								finalFormat = 'image/jpeg';
							} else if (
								targetImgSrc.includes('data:image/jpeg') ||
								targetImgSrc.includes('data:image/jpg')
							) {
								// Otherwise try to match original format
								finalFormat = 'image/jpeg';
							}

							// Convert to data URL
							const resizedDataUrl = canvas.toDataURL(finalFormat, quality);

							// Clean up
							canvas.remove();

							if (debug) {
								console.log(`Resized to ${targetWidth}x${targetHeight}, format: ${finalFormat}`);
							}

							// Resolve with the resized data URL
							resolve(resizedDataUrl);
						} catch (error) {
							reject(new Error(`Error processing target image: ${error.message}`));
						}
					};

					// Handle target image loading error
					targetImg.onerror = (error) => {
						reject(new Error(`Failed to load target image: ${error?.message || 'Unknown error'}`));
					};

					// Set target image source
					targetImg.src = targetImgSrc;
				} catch (error) {
					reject(new Error(`Error after loading reference image: ${error.message}`));
				}
			};

			// Handle reference image loading error
			refImg.onerror = (error) => {
				reject(new Error(`Failed to load reference image: ${error?.message || 'Unknown error'}`));
			};

			// Set reference image source
			refImg.src = refImgSrc;
		} catch (error) {
			reject(new Error(`Unexpected error in matchDimension: ${error.message}`));
		}
	});
}