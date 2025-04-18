<!-- PROMPT.svelte -->

<script>
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import { fade, slide } from 'svelte/transition';
	import Slider from '$lib/newcomp/elements/menu-slider.svelte';
	import ImgSlider from '$lib/newcomp/elements/menu-slider-bg.svelte';
	import ToggleBtn from '$lib/newcomp/elements/menu-toggle-btn.svelte';
	import Dropdown from '$lib/newcomp/elements/menu-dropdown.svelte';
	import {
		toBase64,
		toBlobURL,
		revokeBlobURL,
		compressAndConvertToBase64,
		formatFileSize,
		getBase64FileSize,
		getDimensionsFromRatio,
		generateImageFilename,
		matchDimension  
	} from '$lib/utils/imageUtils';

	// Props from parent
	let {
		add3dModel,
		pathTracingRender = (state) => console.log(`render: ${state}`),
		viewportLoading,
		uploadError,
		BGfromURL,
		requestCurrentViewportImg,
		liveRenderImage,
		handleCasting,
		toggleMaskingMode,
		updateDrawingMode,
		currentMaskImage,
		castingStatus
	} = $props();

	$effect(() => {
  if (castingStatus) {
    console.log(`Casting status changed: ${castingStatus.training_status}`);
    
    if (castingStatus.training_status === 'Done') {
      // If training is done, reload the castingList after a short delay
      // to ensure the API has time to update
      setTimeout(async () => {
        await getLoLAlist();
      }, 2000);
    }
  }
});


	// UI 상태
	let openImagePrompt = $state(false);
	let isGenerating = $state(false);
	let isRandomSeed = $state(false);
	let imagePromptStrength = $state(0.3);
	let generationProgress = $state(0);
	let generationError = $state(null);
	let onPreview = $state(false);

	// 이미지 관련 상태
	let imagePrompt = $state(''); // 이미지 프롬프트 (표시용 URL)
	let generatedImageUrl = $state(''); // 생성된 이미지 URL (표시용)
	let cachedImageBlob = $state(null); // 실제 이미지 blob 저장
	let cachedImageUrl = $state(''); // 로컬 blob URL 저장
	let currentRefMode = $state('style-ref');

	// FLUX API 관련 상태
	let taskId = $state('');
	let flux_polling_url = $state('');
	let pollingInterval = $state(null);
	let pollingTimeout = $state(null);
	let isPending = $state(false);

	let finetune_id = $state('');
	let finetune_strength = $state(1.1);

	// FLUX API 요청 데이터
	let fluxPrompt = $state({
		prompt: '',
		image_prompt: '', // base64 문자열 (API 요청용)
		image_prompt_strength: 0.2,
		aspect_ratio: '1:1',
		width: 1024,
		height: 1024,
		prompt_upsampling: false,
		seed: 930331,
		safety_tolerance: 2,
		output_format: 'png',
		webhook_url: '',
		webhook_secret: ''
	});

	// 업로드 상태
	let isUploading = $state(false);
	let uploadProgress = $state(0);
	let uploadStage = $state('idle'); // idle, reading, validating, processing
	let fileValidationError = $state(null);

	// 메뉴 상태
	let addMenuOpen = $state(false);
	let bgSettingOpen = $state(false);
	let activeMenu = $state(null);

	// 렌더링 옵션
	let liveGenState = $state(false);
	let isRenderOpt = $state(false);

	//마스킹 옵션
	let maskingMode = $state(false);
	let activeDrawingMode = $state('draw');
	let brushSize = $state(20);
	let eraserSize = $state(20);


	//Caster 옵션
	let castingListLoading = $state(false);
	let currentCasting = $state('');
	let castingList = [];

	// 입력 제약 조건
	const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
	const SUPPORTED_FORMATS = ['.glb', '.gltf'];
	const TYPE_WHITELIST = ['model/gltf-binary', 'model/gltf+json'];

	// 컴포넌트 상태
	let isBusy = $state(false);
	let abortController = null;

	// 설정 상태
	let isBG = $state(false);
	let currentBG = $state('');
	let currentBGratio = $state('1:1');
	let bgRotation = $state(180);
	let bgBrightness = $state(1);

	$effect(() => {
		console.log(bgRotation);
	});

	$effect(() => {
		console.log(bgBrightness);
	});

	$effect(() => {
		if (currentBG && isBG) {
			BGfromURL(currentBG);
		}
	});

	// 부모 컴포넌트의 로딩 상태 모니터링
	$effect(() => {
		if (viewportLoading) {
			isBusy = true;
			disableUI();
			addMenuOpen = false;
			uploadStage = 'processing';
		} else {
			isBusy = false;
			enableUI();

			// 에러가 없으면 업로드 상태 초기화
			if (!uploadError) {
				resetUploadState();
			} else {
				uploadStage = 'error';
			}
		}
	});

	//LoRA 학습(Casting) 패널 활성화
	function openCastingPanel() {
		console.log('casting');
		handleCasting();
	}

	function handleDrawingMode(event) {
		//stop the event propagation
		event.stopPropagation();
		console.log('drawing mode');
		let mode = event.target.id;
		if (mode === 'draw-btn') {
			activeDrawingMode = 'draw';
		} else if (mode === 'eraser-btn') {
			activeDrawingMode = 'eraser';
		}
		console.log('activeDrawingMode', activeDrawingMode);
		updateDrawingMode(activeDrawingMode, brushSize, eraserSize);
	}

	function setMaskCanvas() {
		maskingMode = !maskingMode;
		if (maskingMode) {
			
				updateDrawingMode(activeDrawingMode, brushSize, eraserSize);
		} else {
			
		}

		console.log('maskingMode', maskingMode);
		toggleMaskingMode();
	}



	function updateBrushSize(newValue) {	
		brushSize = newValue;
		console.log('브러쉬사이즈변경',brushSize)
		updateDrawingMode(activeDrawingMode, brushSize, eraserSize);
	}

	function updateEraserSize(newValue) {
		eraserSize = newValue;
		console.log('지우개 사이즈 변경',eraserSize)
		updateDrawingMode(activeDrawingMode, brushSize, eraserSize);
	}

	//LoLA 데이터 가져오기
	async function getLoLAlist() {
  console.log('Loading LoRA list...');
  castingListLoading = true;
  
  try {
    const response = await fetch('api/getTrain', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch LoRA list: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data || !data.data || !Array.isArray(data.data)) {
      console.warn('Received invalid castingList data format', data);
      return;
    }
    
    castingList = data.data;
    console.log(`LoRA list loaded: ${castingList.length} items`);
  } catch (error) {
    console.error('Error fetching LoRA list:', error);
  } finally {
    castingListLoading = false;
  }
}

	//imageprompt 모드 스위쳐
	function switchImagePromptMode(event) {
		currentRefMode = event.target.id;

		console.log(currentRefMode);
	}

	// 랜덤 시드 토글 핸들러
	function handleRandomSeedToggle(event) {
		isRandomSeed = event.target.checked;
	}

	// 랜덤 시드를 생성하는 로직
	$effect(() => {
		if (isRandomSeed && isGenerating) {
			fluxPrompt.seed = Math.floor(Math.random() * 1000000);
		}
	});

	// 라이브 렌더링 토글 핸들러
	async function handleLiveRenderToggle(event) {
		liveGenState = event.target.checked;
		console.log('liveGenState:', liveGenState);
		if (!liveGenState) {
			removeImagePrompt();
		}
	}

	// 프롬프트 입력 핸들러
	function onPrompt(event) {
		fluxPrompt.prompt = event.target.value;
	}

	// 현재 화면 이미지 참조 가져오기
	async function GetCurrentScreenAsImageRef() {
		//get the screen image of the current main-canvas
		const currentBGdata = {
			currentBG: currentBG,
			currentBGratio: currentBGratio
		};
		await requestCurrentViewportImg(currentBGdata);

		// base64 데이터만 반환 (API용)
		return liveRenderImage.split(',')[1];
	}

	// 이미지 생성 실행
	// async function runImageGen() {
	// 	if (isGenerating) return; // 중복 호출 방지

	// 	// 라이브 렌더링 상태에 따라 처리
	// 	if (liveGenState) {
	// 		try {
	// 			fluxPrompt.image_prompt = await GetCurrentScreenAsImageRef();

	// 		} catch (error) {
	// 			console.error('Error getting screen reference:', error);
	// 			generationError = 'Failed to capture current view';
	// 			return;
	// 		}
	// 	}

	// 	// 랜덤 시드 생성
	// 	if (isRandomSeed) {
	// 		fluxPrompt.seed = Math.floor(Math.random() * 1000000);
	// 	}

	// 	// 상태 초기화
	// 	activeMenu = null;
	// 	openImagePrompt = false;
	// 	isGenerating = true;
	// 	isPending = false;
	// 	generationProgress = 0;
	// 	generationError = null;
	// 	taskId = '';
	// 	clearPollingTimers();

	// 	try {
	// 		// UI 비활성화
	// 		disableUI();

	// 		// API 요청 데이터 준비
	// 		let apiRequestData;

	// 		// image_prompt가 없거나 liveGenState가 false인 경우

	// 		if (fluxPrompt.image_prompt === '' || fluxPrompt.image_prompt === null ) {
	// 			apiRequestData = {
	// 				prompt: fluxPrompt.prompt,
	// 				aspect_ratio: fluxPrompt.aspect_ratio,
	// 				width: fluxPrompt.width,
	// 				height: fluxPrompt.height,
	// 				prompt_upsampling: fluxPrompt.prompt_upsampling,
	// 				seed: fluxPrompt.seed,
	// 				safety_tolerance: fluxPrompt.safety_tolerance,
	// 				output_format: fluxPrompt.output_format
	// 			};
	// 		} else {
	// 			apiRequestData = {
	// 				prompt: fluxPrompt.prompt,
	// 				aspect_ratio: fluxPrompt.aspect_ratio,
	// 				image_prompt: fluxPrompt.image_prompt,
	// 				image_prompt_strength: fluxPrompt.image_prompt_strength,
	// 				width: fluxPrompt.width,
	// 				height: fluxPrompt.height,
	// 				prompt_upsampling: fluxPrompt.prompt_upsampling,
	// 				seed: fluxPrompt.seed,
	// 				safety_tolerance: fluxPrompt.safety_tolerance,
	// 				output_format: fluxPrompt.output_format
	// 			};
	// 		}

	// 		console.log('API 요청 데이터:', apiRequestData);

	// 		// 서버에 요청 전송
	// 		const response = await fetch('api/flux', {
	// 			method: 'POST',
	// 			headers: {
	// 				'Content-Type': 'application/json'
	// 			},
	// 			body: JSON.stringify({ input: apiRequestData })
	// 		});

	// 		console.log('응답 상태:', response.status, response.statusText);

	// 		// 응답 데이터 처리
	// 		const data = await response.json();
	// 		console.log('응답 데이터:', data);

	// 		// 에러 처리
	// 		if (!response.ok || data.error) {
	// 			throw new Error(data.error?.msg || 'Image generation request failed');
	// 		}

	// 		// 작업 ID 저장
	// 		taskId = data.id;
	// 		flux_polling_url = data.polling_url;
	// 		console.log('이미지 생성 요청 성공, 작업 ID:', taskId);

	// 		// 이미지 생성 상태 모니터링 시작
	// 		fluxPolling(flux_polling_url, taskId);

	// 		// 생성 타임아웃 설정 (5분)
	// 		pollingTimeout = setTimeout(() => {
	// 			if (isGenerating) {
	// 				clearInterval(pollingInterval);
	// 				generationError = 'Generation timeout - please try again';
	// 				isGenerating = false;
	// 				isPending = false;
	// 				enableUI();
	// 			}
	// 		}, 300000); // 5분
	// 	} catch (error) {
	// 		console.error('이미지 생성 실패:', error);
	// 		generationError = error.message;
	// 		isGenerating = false;
	// 		isPending = false;
	// 	} finally {
	// 		// 에러가 발생한 경우 UI 활성화
	// 		if (generationError) {
	// 			enableUI();
	// 			isGenerating = false;
	// 			isPending = false;
	// 		}
	// 	}
	// }

	// Updated runImageGen function with image compression right before API call
	async function runImageGen() {
		if (isGenerating) return; // 중복 호출 방지
		//이미지 프롬프트나 텍스트 프롬프트가 없으면 중단
		// Check if both image prompt and text prompt are empty
		if (!fluxPrompt.image_prompt && !fluxPrompt.prompt.trim()) {
			console.log('No image prompt or text prompt provided');
			generationError = 'Please provide either an image or text prompt to generate';
			return;
		}

		// 라이브 렌더링 상태에 따라 처리
		if (liveGenState) {
			try {
				fluxPrompt.image_prompt = await GetCurrentScreenAsImageRef();
			} catch (error) {
				console.error('Error getting screen reference:', error);
				generationError = 'Failed to capture current view';
				return;
			}
		}

		if(maskingMode && currentMaskImage !== null){
			console.log('masking 모드로 생성합니다.')
			try {
				fluxPrompt.image = await GetCurrentScreenAsImageRef();
			} catch (error) {
				console.error('Error getting screen reference:', error);
				generationError = 'Failed to capture current view for masking';
				return;
			}
		}

		// 랜덤 시드 생성
		if (isRandomSeed) {
			fluxPrompt.seed = Math.floor(Math.random() * 1000000);
		}

		// 상태 초기화
		activeMenu = null;
		openImagePrompt = false;
		isGenerating = true;
		isPending = false;
		generationProgress = 0;
		generationError = null;
		taskId = '';
		clearPollingTimers();

		try {
			// UI 비활성화
			disableUI();

			// API 요청 데이터 준비

			let genMode = '';
			let isFinetune = false;

			let apiRequestData = {
				prompt: fluxPrompt.prompt,
				aspect_ratio: fluxPrompt.aspect_ratio,
				width: fluxPrompt.width,
				height: fluxPrompt.height,
				prompt_upsampling: fluxPrompt.prompt_upsampling,
				seed: fluxPrompt.seed,
				safety_tolerance: fluxPrompt.safety_tolerance,
				output_format: fluxPrompt.output_format
			};

			//check if we have finetune model

			if (currentCasting && currentCasting !== '') {
				console.log('gen with finetune');
				isFinetune = true;
				apiRequestData.finetune_id = currentCasting;
				apiRequestData.finetune_strength = finetune_strength;
			}

			// Check if we have an image prompt to include
			if (fluxPrompt.image_prompt && fluxPrompt.image_prompt !== '') {
				console.log('Image prompt detected, checking size...');

				// Calculate the size of the base64 string
				const estimatedSize = getBase64FileSize(fluxPrompt.image_prompt);
				console.log(`Estimated image size: ${formatFileSize(estimatedSize)}`);

				// If image is larger than 4MB, compress it
				if (estimatedSize > 4 * 1024 * 1024) {
					console.log('Image prompt is too large, compressing...');

					try {
						// Create a Blob from the base64 string
						const byteString = atob(fluxPrompt.image_prompt);
						const ab = new ArrayBuffer(byteString.length);
						const ia = new Uint8Array(ab);

						for (let i = 0; i < byteString.length; i++) {
							ia[i] = byteString.charCodeAt(i);
						}

						const blob = new Blob([ab], { type: 'image/jpeg' });
						const imageFile = new File([blob], 'image-prompt.jpg', { type: 'image/jpeg' });

						// First compression attempt (moderate)
						let compressedBase64 = await compressAndConvertToBase64(imageFile, 1024, 1024, 0.8);
						let compressedSize = getBase64FileSize(compressedBase64);
						console.log(`Compressed image size (first pass): ${formatFileSize(compressedSize)}`);

						// If still too large, compress more aggressively
						if (compressedSize > 4 * 1024 * 1024) {
							console.log('Image still too large, compressing more aggressively...');
							compressedBase64 = await compressAndConvertToBase64(imageFile, 600, 600, 0.5);
							compressedSize = getBase64FileSize(compressedBase64);
							console.log(`Compressed image size (second pass): ${formatFileSize(compressedSize)}`);

							// If still too large after second compression, try one last time
							if (compressedSize > 4 * 1024 * 1024) {
								console.log('Final compression attempt...');
								compressedBase64 = await compressAndConvertToBase64(imageFile, 400, 400, 0.4);
								compressedSize = getBase64FileSize(compressedBase64);
								console.log(
									`Compressed image size (final pass): ${formatFileSize(compressedSize)}`
								);
							}
						}

						// Update the image prompt with the compressed version
						if (currentRefMode === 'style-ref') {
							apiRequestData.image_prompt = compressedBase64;
							apiRequestData.image_prompt_strength = fluxPrompt.image_prompt_strength;
							genMode = 'style-ref';
						} else if (currentRefMode === 'depth-ref') {
							apiRequestData.control_image = compressedBase64;
							genMode = 'depth-ref';
						} else if (currentRefMode === 'canny-ref') {
							apiRequestData.control_image = compressedBase64;
							genMode = 'canny-ref';
						}
					} catch (error) {
						console.error('Error compressing image:', error);
						// If compression fails, just use the original and hope for the best
						apiRequestData.image_prompt = fluxPrompt.image_prompt;
					}
				} else {
					// Image is small enough, use as is

					if (currentRefMode === 'style-ref') {
						apiRequestData.image_prompt = fluxPrompt.image_prompt;
						apiRequestData.image_prompt_strength = fluxPrompt.image_prompt_strength;
						genMode = 'style-ref';
					} else if (currentRefMode === 'depth-ref') {
						apiRequestData.control_image = fluxPrompt.image_prompt;
						genMode = 'depth-ref';
					} else if (currentRefMode === 'canny-ref') {
						apiRequestData.control_image = fluxPrompt.image_prompt;
						genMode = 'canny-ref';
					}
				}

				// Include the strength parameter
			}

			// Check if we have an image prompt to include
			if (fluxPrompt.image && maskingMode && currentMaskImage) {
    console.log('Mask detected, checking size...');

    // Calculate the size of the base64 string
    const estimatedSize = getBase64FileSize(fluxPrompt.image);
    console.log(`Estimated image size: ${formatFileSize(estimatedSize)}`);

    // If image is larger than 4MB, compress it
    if (estimatedSize > 4 * 1024 * 1024) {
        console.log('Image prompt is too large, compressing...');

        try {
            // Create a Blob from the base64 string
            const byteString = atob(fluxPrompt.image);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);

            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }

            const blob = new Blob([ab], { type: 'image/jpeg' });
            const imageFile = new File([blob], 'image-prompt.jpg', { type: 'image/jpeg' });

            // First compression attempt (moderate)
            let compressedBase64 = await compressAndConvertToBase64(imageFile, 1024, 1024, 0.8);
            let compressedSize = getBase64FileSize(compressedBase64);
            console.log(`Compressed image size (first pass): ${formatFileSize(compressedSize)}`);

            // If still too large, compress more aggressively
            if (compressedSize > 4 * 1024 * 1024) {
                console.log('Image still too large, compressing more aggressively...');
                compressedBase64 = await compressAndConvertToBase64(imageFile, 600, 600, 0.5);
                compressedSize = getBase64FileSize(compressedBase64);
                console.log(`Compressed image size (second pass): ${formatFileSize(compressedSize)}`);

                // If still too large after second compression, try one last time
                if (compressedSize > 4 * 1024 * 1024) {
                    console.log('Final compression attempt...');
                    compressedBase64 = await compressAndConvertToBase64(imageFile, 400, 400, 0.4);
                    compressedSize = getBase64FileSize(compressedBase64);
                    console.log(
                        `Compressed image size (final pass): ${formatFileSize(compressedSize)}`
                    );
                }
            }

            // Update the image prompt with the compressed version and match mask dimensions
            apiRequestData.image = compressedBase64;
            genMode = 'fill';
            
            try {
                // Match the mask dimensions to the image dimensions
                const dataPrefix = 'data:image/jpeg;base64,';
                const fullImageData = dataPrefix + compressedBase64;
                const matchedMask = await matchDimension(fullImageData, currentMaskImage);
                apiRequestData.mask = matchedMask.split(',')[1]; // Remove data URL prefix if needed
                console.log('Mask dimensions matched to image');
            } catch (error) {
                console.error('Error matching dimension of mask image', error);
                apiRequestData.mask = currentMaskImage;
                console.log('Using original mask as fallback');
            }
        } catch (error) {
            console.error('Error compressing image:', error);
            // If compression fails, just use the original and hope for the best
            apiRequestData.image = fluxPrompt.image;
            try {
                // Still try to match dimensions with original image
                const dataPrefix = 'data:image/jpeg;base64,';
                const fullImageData = dataPrefix + fluxPrompt.image;
                const matchedMask = await matchDimension(fullImageData, currentMaskImage);
                apiRequestData.mask = matchedMask.split(',')[1];
            } catch (e) {
                console.error('Fallback dimension matching failed:', e);
                apiRequestData.mask = currentMaskImage;
            }
            genMode = 'fill';
        }
    } else {
        // Image is small enough, use as is
        apiRequestData.image = fluxPrompt.image;
        genMode = 'fill';
        
        try {
            // Match the mask dimensions to the image dimensions
            const dataPrefix = 'data:image/jpeg;base64,';
            const fullImageData = dataPrefix + fluxPrompt.image;
            const matchedMask = await matchDimension(fullImageData, currentMaskImage);
            apiRequestData.mask = matchedMask.split(',')[1]; // Remove data URL prefix if needed
            console.log('Mask dimensions matched to image');
        } catch (error) {
            console.error('Error matching dimension of mask image', error);
            apiRequestData.mask = currentMaskImage;
            console.log('Using original mask as fallback');
        }
    }
}

			console.log('API 요청 데이터:', apiRequestData);

			// 서버에 요청 전송
			const response = await fetch('api/flux', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ input: apiRequestData, mode: genMode, isFinetune })
			});

			console.log('응답 상태:', response.status, response.statusText);

			// 응답 데이터 처리
			const data = await response.json();
			console.log('응답 데이터:', data);

			// 에러 처리
			if (!response.ok || data.error) {
				throw new Error(data.error?.msg || 'Image generation request failed');
			}

			// 작업 ID 저장
			taskId = data.id;
			flux_polling_url = data.polling_url;
			console.log('이미지 생성 요청 성공, 작업 ID:', taskId);

			// 이미지 생성 상태 모니터링 시작
			fluxPolling(flux_polling_url, taskId);

			// 생성 타임아웃 설정 (5분)
			pollingTimeout = setTimeout(() => {
				if (isGenerating) {
					clearInterval(pollingInterval);
					generationError = 'Generation timeout - please try again';
					isGenerating = false;
					isPending = false;
					enableUI();
				}
			}, 300000); // 5분
		} catch (error) {
			console.error('이미지 생성 실패:', error);
			generationError = error.message;
			isGenerating = false;
			isPending = false;
			enableUI();
		} finally {
			// 에러가 발생한 경우 UI 활성화
			if (generationError) {
				enableUI();
				isGenerating = false;
				isPending = false;
			}
		}
	}

	// FLUX API 상태 모니터링
	function fluxPolling(pollingURL, result_id) {
		console.log('pollingURL:', pollingURL);

		if (!pollingURL) {
			generationError = 'Invalid polling URL';
			isGenerating = false;
			return;
		}

		// URL에서 ID 추출
		const url = new URL(pollingURL);
		const id = result_id;

		if (!id) {
			generationError = 'Invalid polling URL format';
			isGenerating = false;
			return;
		}

		// 프록시 URL 생성
		const proxyPollingUrl = `/api/flux?id=${id}`;

		// 폴링 인터벌 설정
		pollingInterval = setInterval(async () => {
			try {
				const response = await fetch(proxyPollingUrl);
				if (!response.ok) {
					throw new Error(`Polling failed with status: ${response.status}`);
				}

				const data = await response.json();
				console.log('polling data:', data);

				// 상태에 따른 처리
				if (data.status === 'Ready') {
					// 이미지 생성 완료
					isPending = false;
					console.log('이미지 생성 완료:', data.result.sample);

					// 원본 URL 가져오기
					const originalImageUrl = data.result.sample;

					// CORS 이슈 방지를 위한 프록시 URL 생성
					const proxiedImageUrl = `/api/flux?url=${encodeURIComponent(originalImageUrl)}`;
					console.log('Proxied image URL:', proxiedImageUrl);

					// 이미지 처리 완료
					completeFluxTask(proxiedImageUrl);

					// 타이머 정리
					clearPollingTimers();
				} else if (data.status === 'Error') {
					// 이미지 생성 실패
					console.error('이미지 생성 실패:', data.error);
					generationError = data.error;
					isGenerating = false;
					isPending = false;
					clearPollingTimers();
				} else if (data.status === 'Pending') {
					// 이미지 생성 중
					isPending = true;

					// 진행 상황 업데이트
					if (data.progress !== undefined && data.progress !== null) {
						// 0-1 범위를 0-100 범위로 변환
						generationProgress = Math.round(data.progress * 100);
					} else {
						// 구체적인 진행 상황이 없으면 기본값 사용
						generationProgress = 5;
					}
					console.log('Image generation in progress:', generationProgress);
				} else {
					console.log('Polling status:', data.status);
				}
			} catch (error) {
				console.error('polling error:', error);
				generationError = error.message || 'Error during image generation polling';
				isGenerating = false;
				isPending = false;
				clearPollingTimers();
			}
		}, 1000);
	}

	// FLUX 작업 완료 처리
	async function completeFluxTask(imageURL) {
		try {
			// 로딩 상태 표시
			isGenerating = true;

			// 이미지 즉시 가져오기
			console.log('Fetching image from:', imageURL);
			const response = await fetch(imageURL);

			if (!response.ok) {
				throw new Error(`Failed to fetch image: ${response.statusText}`);
			}

			// 이미지를 blob으로 가져와 캐시
			cachedImageBlob = await response.blob();

			// 이전 URL이 있으면 해제
			if (cachedImageUrl) {
				revokeBlobURL(cachedImageUrl);
			}

			// blob에 대한 로컬 URL 생성
			cachedImageUrl = URL.createObjectURL(cachedImageBlob);

			// 생성된 이미지 URL 업데이트
			generatedImageUrl = cachedImageUrl;

			console.log('Image successfully cached locally', generatedImageUrl);

			// 생성 완료
			isGenerating = false;
			onPreview = true;

			// UI 활성화
			enableUI();
		} catch (error) {
			console.error('Error caching image:', error);
			generationError = `Failed to load generated image: ${error.message}`;
			isGenerating = false;
			enableUI();
		}
	}

	// 폴링 타이머 정리
	function clearPollingTimers() {
		if (pollingInterval) {
			clearInterval(pollingInterval);
			pollingInterval = null;
		}

		if (pollingTimeout) {
			clearTimeout(pollingTimeout);
			pollingTimeout = null;
		}
	}

	// 이미지 캐시 정리
	function cleanupImageCache() {
		if (cachedImageUrl) {
			revokeBlobURL(cachedImageUrl);
			cachedImageUrl = '';
		}
		cachedImageBlob = null;
	}

	// 이미지 생성 취소
	function cancelGeneration() {
		clearPollingTimers();
		isGenerating = false;
		isPending = false;
		generationProgress = 0;
		enableUI();
	}

	// 메뉴 토글
	function toggleAddMenu() {
		if (isBusy) return; // 사용 중에는 메뉴 열기 방지
		addMenuOpen = !addMenuOpen;
	}

	// 메뉴 항목 토글
	function menuToggle(e) {
		// 메뉴 버튼에 직접 클릭한 경우에만 응답
		if (e.currentTarget && e.currentTarget.id) {
			const clickedMenuId = e.currentTarget.id;

			if (activeMenu === clickedMenuId) {
				// 같은 메뉴 - 토글 끔
				activeMenu = null;
			} else {
				// 다른 메뉴 - 전환
				activeMenu = clickedMenuId;
			}
		}
	}

	// 업로드 관련 상태 초기화
	function resetUploadState() {
		isUploading = false;
		uploadProgress = 0;
		uploadStage = 'idle';
		fileValidationError = null;

		if (abortController) {
			abortController.abort();
			abortController = null;
		}
	}

	// 파일 유효성 검사
	function validateFile(file) {
		// 파일 존재 여부 확인
		if (!file) {
			return 'No file selected';
		}

		// 파일 크기 확인
		if (file.size > MAX_FILE_SIZE) {
			return `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
		}

		// 파일 확장자 확인
		const fileName = file.name.toLowerCase();
		const hasValidExtension = SUPPORTED_FORMATS.some((ext) => fileName.endsWith(ext));

		if (!hasValidExtension) {
			return `Unsupported file format. Please use: ${SUPPORTED_FORMATS.join(', ')}`;
		}

		// MIME 타입 확인
		if (file.type && !TYPE_WHITELIST.includes(file.type) && file.type !== '') {
			console.warn(`Unexpected file type: ${file.type}, proceeding anyway`);
			// MIME 타입은 신뢰할 수 없어 여기서 거부하지 않음
		}

		return null; // 에러 없음
	}

	// 파일 선택 처리
	function addModel(event) {
		const file = event.target.files[0];

		// 이전 상태 초기화
		resetUploadState();

		// 파일 유효성 검사
		const validationError = validateFile(file);
		if (validationError) {
			fileValidationError = validationError;
			event.target.value = ''; // 파일 입력 초기화
			return;
		}

		if (file) {
			// 취소를 위한 abort controller 설정
			abortController = new AbortController();

			// UI 상태 업데이트
			isUploading = true;
			uploadStage = 'reading';
			uploadProgress = 0;

			// 진행 상황 추적을 위한 FileReader 생성
			const reader = new FileReader();

			// 업로드 진행 상황 추적
			reader.onprogress = (event) => {
				if (event.lengthComputable) {
					const percentLoaded = Math.round((event.loaded / file.size) * 100);
					uploadProgress = percentLoaded;
				}
			};

			// 로딩 시작
			reader.onloadstart = () => {
				console.log('Starting file read');
				uploadProgress = 0;
			};

			// 에러 처리
			reader.onerror = (error) => {
				console.error('File reading error:', error);
				fileValidationError = 'Failed to read file: ' + (error.message || 'Unknown error');
				isUploading = false;
				event.target.value = ''; // 파일 입력 초기화
			};

			// 로딩 완료
			reader.onloadend = () => {
				console.log('File read complete');
				uploadProgress = 100;
				uploadStage = 'validating';

				// 진행 완료 표시를 위한 작은 지연
				setTimeout(() => {
					// 파일 입력 초기화
					event.target.value = '';

					// 취소된 경우 확인
					if (abortController.signal.aborted) {
						console.log('Upload was cancelled');
						return;
					}

					// 부모 컴포넌트에 전달
					add3dModel(file, {
						name: file.name,
						size: file.size,
						type: file.type
					});
				}, 300);
			};

			// 파일 읽기 시작 (진행 이벤트 트리거)
			reader.readAsArrayBuffer(file);
		}
	}

	// 현재 업로드 취소
	function cancelUpload() {
		if (abortController) {
			abortController.abort();
			abortController = null;
		}
		resetUploadState();
	}

	// 처리 중 UI 요소 비활성화
	function disableUI() {
		document.getElementById('add-item-btn')?.setAttribute('disabled', 'true');
		document.getElementById('render-btn')?.setAttribute('disabled', 'true');
		document.getElementById('prompt-input')?.setAttribute('disabled', 'true');
		document.getElementById('toggleButton')?.setAttribute('disabled', 'true');
	}

	// 처리 후 UI 요소 활성화
	function enableUI() {
		document.getElementById('add-item-btn')?.removeAttribute('disabled');
		document.getElementById('render-btn')?.removeAttribute('disabled');
		document.getElementById('prompt-input')?.removeAttribute('disabled');
		document.getElementById('toggleButton')?.removeAttribute('disabled');
	}

	// 배경 비율 변경
	function changeBGratio(e) {
		let ratio = e.target.id;
		switch (ratio) {
			case 'FIT':
				currentBGratio = 'FIT';
				// 현재 BG 너비, 높이
				if (currentBG) {
					let img = new Image();
					img.src = currentBG;
					img.onload = function () {
						let ratio = img.height / img.width;
						if (ratio === 1) {
							currentBGratio = 'FIT 1:1';
							fluxPrompt.aspect_ratio = '1:1';
						} else if (ratio > 1) {
							// 세로
							currentBGratio = `FIT 1:${ratio.toFixed(2)}`;
							fluxPrompt.aspect_ratio = `1:${ratio.toFixed(2)}`;
						} else if (ratio < 1) {
							currentBGratio = `FIT ${ratio.toFixed(2)}:1`;
							fluxPrompt.aspect_ratio = `${ratio.toFixed(2)}:1`;
						}

						fluxPrompt.width = img.width;
						fluxPrompt.height = img.height;
						console.log('currentBG width, height:', img.width, img.height);
					};
				}
				break;
			case 'r11':
				currentBGratio = '1:1';
				fluxPrompt.width = 1024;
				fluxPrompt.height = 1024;
				fluxPrompt.aspect_ratio = currentBGratio;
				break;
			case 'r23':
				currentBGratio = '2:3';
				fluxPrompt.aspect_ratio = currentBGratio;
				fluxPrompt.width = 896;
				fluxPrompt.height = 1344;
				break;
			case 'r34':
				currentBGratio = '3:4';
				fluxPrompt.aspect_ratio = currentBGratio;
				fluxPrompt.width = 768;
				fluxPrompt.height = 1024;
				break;
			case 'r45':
				currentBGratio = '4:5';
				fluxPrompt.aspect_ratio = currentBGratio;
				fluxPrompt.width = 1024;
				fluxPrompt.height = 1280;
				break;
			case 'r916':
				currentBGratio = '9:16';
				fluxPrompt.aspect_ratio = currentBGratio;
				fluxPrompt.width = 736;
				fluxPrompt.height = 1280;
				break;
			case 'r32':
				currentBGratio = '3:2';
				fluxPrompt.aspect_ratio = currentBGratio;
				fluxPrompt.width = 1344;
				fluxPrompt.height = 896;
				break;
			case 'r43':
				currentBGratio = '4:3';
				fluxPrompt.aspect_ratio = currentBGratio;
				fluxPrompt.width = 1024;
				fluxPrompt.height = 768;
				break;
			case 'r54':
				currentBGratio = '5:4';
				fluxPrompt.aspect_ratio = currentBGratio;
				fluxPrompt.width = 1280;
				fluxPrompt.height = 1024;
				break;
			case 'r169':
				currentBGratio = '16:9';
				fluxPrompt.aspect_ratio = currentBGratio;
				fluxPrompt.width = 1280;
				fluxPrompt.height = 736;
				break;
			default:
				currentBGratio = '1:1';
				fluxPrompt.aspect_ratio = '1:1';
				fluxPrompt.width = 1024;
				fluxPrompt.height = 1024;
				break;
		}
	}

	// 배경 썸네일 변경
	function changeBGThumbnail(currentBG) {
		const thumbnailImg = document.querySelector('.bg-preview-thumbnail img');

		if (thumbnailImg) {
			thumbnailImg.src = currentBG;

			// 이미지가 더 이상 필요 없을 때 메모리 해제 (선택 사항)
			thumbnailImg.onload = () => {};
		} else {
			console.error('Thumbnail image element not found');
		}
	}

	// 32의 배수로 비율 변환
	function convert32ratio(width, height) {
		// 원본 종횡비 계산
		const aspectRatio = width / height;

		// 원본 치수에 가장 가까운 32의 배수 계산
		// 전략 1: 너비를 32의 배수로 반올림, 높이 조정
		let newWidth1 = Math.round(width / 32) * 32;
		let newHeight1 = Math.round(newWidth1 / aspectRatio / 32) * 32;

		// 전략 2: 높이를 32의 배수로 반올림, 너비 조정
		let newHeight2 = Math.round(height / 32) * 32;
		let newWidth2 = Math.round((newHeight2 * aspectRatio) / 32) * 32;

		// 적어도 하나의 차원이 768 이상이어야 함
		const minSize = 768;

		// 필요한 경우 전략 1의 치수 스케일업
		if (newWidth1 < minSize && newHeight1 < minSize) {
			const scale = Math.ceil(minSize / Math.max(newWidth1, newHeight1));
			newWidth1 = Math.round((newWidth1 * scale) / 32) * 32;
			newHeight1 = Math.round((newHeight1 * scale) / 32) * 32;
		}

		// 필요한 경우 전략 2의 치수 스케일업
		if (newWidth2 < minSize && newHeight2 < minSize) {
			const scale = Math.ceil(minSize / Math.max(newWidth2, newHeight2));
			newWidth2 = Math.round((newWidth2 * scale) / 32) * 32;
			newHeight2 = Math.round((newHeight2 * scale) / 32) * 32;
		}

		// 각 결과가 원래 종횡비에서 얼마나 벗어나는지 계산
		const ratio1 = newWidth1 / newHeight1;
		const ratio2 = newWidth2 / newHeight2;

		const error1 = Math.abs(ratio1 - aspectRatio);
		const error2 = Math.abs(ratio2 - aspectRatio);

		// 종횡비를 더 잘 보존하는 전략 선택
		if (error1 <= error2) {
			return {
				width: newWidth1,
				height: newHeight1
			};
		} else {
			return {
				width: newWidth2,
				height: newHeight2
			};
		}
	}

	// 렌더링 실행
	function render() {
		console.log('Rendering...');
		pathTracingRender(true); // 경로 추적 모드로 전환
	}

	// 렌더링 옵션 토글 핸들러
	function onRenderOptionToggle(e) {
		isRenderOpt = e.target.checked;

		switch (isRenderOpt) {
			case true:
				console.log('Render option enabled');
				pathTracingRender(true);
				break;
			case false:
				console.log('Render option disabled');
				pathTracingRender(false);
				break;
			default:
				console.log('Unknown render option state');
				break;
		}
	}

	// 이미지 프롬프트 핸들러 (파일 업로드)
	async function handleImagePrompt(event) {
		const file = event.target.files[0];

		if (!file) {
			return;
		}

		// 파일이 이미지인지 확인
		if (!file.type.startsWith('image/')) {
			generationError = 'Selected file is not an image';
			event.target.value = '';
			return;
		}

		// 파일 크기 확인 (최대 5MB)
		const maxSize = 5 * 1024 * 1024;
		if (file.size > maxSize) {
			generationError = `Image file is too large. Maximum size is 5MB.`;
			event.target.value = '';
			return;
		}

		try {
			// 표시용 URL 생성
			imagePrompt = await toBlobURL(file);

			// API 요청용 base64 생성 - 접두사 없는 base64 문자열
			const base64Content = await toBase64(file, true);
			fluxPrompt.image_prompt = base64Content;

			console.log('Image reference added');
		} catch (error) {
			console.error('Failed to process image:', error);
			generationError = 'Failed to process image file';
		}

		// 파일 입력 초기화
		event.target.value = '';
	}

	// 이미지 프롬프트 제거
	function removeImagePrompt() {
		// 이전 Blob URL 해제
		if (imagePrompt && imagePrompt.startsWith('blob:')) {
			revokeBlobURL(imagePrompt);
		}

		imagePrompt = null;
		fluxPrompt.image_prompt = ''; // 기본값으로 재설정
		console.log('Image reference removed');
	}

	async function downloadCurrentScreen(){
		console.log('현재 화면 캡쳐 후 다운로드')
		let newImage = await GetCurrentScreenAsImageRef();
		
		// Create a temporary anchor element for download
		const downloadLink = document.createElement('a');
		
		// Set the href to the image data
		downloadLink.href = `data:image/png;base64,${newImage}`;
		
		// Set download attribute with filename
		downloadLink.download = `otrai-img-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
		
		// Append to body, click and remove
		document.body.appendChild(downloadLink);
		downloadLink.click();
		document.body.removeChild(downloadLink);
		
		console.log('Screen capture downloaded successfully');
	}

	onMount(async () => {
		//loRA 데이터 불러오기
		 try {
    // Load LoRA data with retry mechanism
    await getLoLAlist();
    
    // If the list is empty after initial load, try once more
    if (castingList.length === 0) {
      console.log('Initial castingList empty, retrying...');
      setTimeout(async () => {
        await getLoLAlist();
      }, 1000);
    }
  } catch (error) {
    console.error('Failed to load casting list on mount:', error);
  } finally {
    castingListLoading = false;
  }

		return () => {
			clearPollingTimers();
			cleanupImageCache();

			// Blob URL 정리
			if (currentBG && currentBG.startsWith('blob:')) {
				revokeBlobURL(currentBG);
			}

			if (imagePrompt && imagePrompt.startsWith('blob:')) {
				revokeBlobURL(imagePrompt);
			}
		};
	});
</script>

<div class="main">
	<!-- Add item button section -->
	<!-- <section id="add-item-section">
		<input
			type="file"
			id="glb-import"
			accept=".glb,.gltf"
			style="display: none;"
			oninput={addModel}
		/>

		<button id="add-item-btn" onclick={toggleAddMenu} disabled={isBusy}>
			<Icon class="btn-icon-st" icon="typcn:plus" width="24" height="24" />
		</button>

		{#if addMenuOpen}
			<div class="add-item-list" transition:slide>
				<button onclick={() => document.getElementById('glb-import').click()} id="add-model-btn">
					<Icon icon="clarity:import-line" width="18" height="18" /> 3D Model
				</button>
				<button id="add-image-btn">
					<Icon icon="carbon:image" width="18" height="18" /> 3D Wall
				</button>
			</div>
		{/if}
	</section> -->
	<!-- 
	Prompt input section -->
	<!-- <section id="prompt-section">
		<input type="text" id="prompt-input" placeholder="Enter prompt" disabled={isBusy} />

	
		<div class="toggle-container">
			<label class="toggle">
				<input
					type="checkbox"
					id="toggleButton"
					onchange={onRenderOptionToggle}
					disabled={isBusy}
				/>
				<span class="slider"></span>
			</label>
		</div>
	</section> -->

	<!-- Render button section -->
	<!-- <section>
		<button
			id="render-btn"
			disabled={isBusy}
			onclick={() => {
				console.log('run comfy');
			}}
		>
			<Icon icon="mingcute:ai-fill" width="24" height="24" />RENDER
		</button>
	</section> -->

	<section class="main-ui-wrapper">
		<div class="logo-wrapper">
			<img src="OTRAI_Black.svg" alt="" />
		</div>
		<div class="function-wrapper">
			<div class="tool-menus">
				<!-- <input
					type="file"
					id="glb-import"
					accept=".glb,.gltf"
					style="display: none;"
					oninput={addModel}
				/> -->
				<!-- <div id="3d-add-set" class="toolbtn upload-btn" onclick={menuToggle}>
					<Icon class="tool-icon" icon="iconoir:cube" />

					{#if activeMenu === '3d-add-set'}
						<div class="add-item-list" transition:slide>
							<button
								onclick={() => document.getElementById('glb-import').click()}
								id="add-model-btn"
							>
								3D Model
							</button>
							<button id="add-image-btn"> 3D Wall </button>
						</div>
					{/if}
				</div> -->

				<div id="seed" class="toolbtn seed-setting" onclick={menuToggle}>
					<Icon class="tool-icon-mid" icon="mingcute:random-line" />
					<div class="seed-detail">
						{#if isRandomSeed}
							Random
						{:else}
							Fixed
						{/if}
					</div>
					{#if activeMenu === 'seed'}
						<div class="add-item-list" transition:slide>
							<div class="seed-setting-wrapper">
								<div class="seed-title">Seed</div>
								<div class="seed-input-container">
									<input
										type="number"
										id="seed-input"
										placeholder="Seed"
										value={fluxPrompt.seed}
										oninput={(e) => (fluxPrompt.seed = parseInt(e.target.value) || 0)}
										disabled={isRandomSeed}
										onclick={(e) => e.stopPropagation()}
									/>
								</div>
								<div class="seed-random-toggle" onclick={(e) => e.stopPropagation()}>
									<label for="random-seed-toggle">Random seed</label>
									<div class="toggle-container" onclick={(e) => e.stopPropagation()}>
										<label class="toggle" onclick={(e) => e.stopPropagation()}>
											<input
												type="checkbox"
												id="random-seed-toggle"
												bind:checked={isRandomSeed}
												onchange={handleRandomSeedToggle}
												onclick={(e) => e.stopPropagation()}
											/>
											<span class="slider"></span>
										</label>
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>
				<div id="image-ratio-set" class="toolbtn image-ratio" onclick={menuToggle}>
					{currentBGratio}

					{#if activeMenu === 'image-ratio-set'}
						<div class="add-item-list" transition:slide>
							<button
								class={currentBGratio === '1:1' ? 'btnSelected' : ''}
								id="r11"
								onclick={changeBGratio}
							>
								1:1
							</button>
							<div class="ratio-selection-group">
								<div class="ratio-selection ratio-list-portrait">
									<div class="ratio-type-title">Portrait</div>
									<div class="ratio-type-list">
										<button
											class={currentBGratio === '2:3' ? 'btnSelected' : ''}
											id="r23"
											onclick={changeBGratio}
										>
											2:3
										</button>
										<button
											class={currentBGratio === '3:4' ? 'btnSelected' : ''}
											id="r34"
											onclick={changeBGratio}
										>
											3:4
										</button>
										<button
											class={currentBGratio === '4:5' ? 'btnSelected' : ''}
											id="r45"
											onclick={changeBGratio}
										>
											4:5
										</button>
										<button
											class={currentBGratio === '9:16' ? 'btnSelected' : ''}
											id="r916"
											onclick={changeBGratio}
										>
											9:16
										</button>
									</div>
								</div>
								<div class="ratio-selection ratio-list-landscape">
									<div class="ratio-type-title">landscape</div>
									<div class="ratio-type-list">
										<button
											class={currentBGratio === '3:2' ? 'btnSelected' : ''}
											id="r32"
											onclick={changeBGratio}
										>
											3:2
										</button>
										<button
											class={currentBGratio === '4:3' ? 'btnSelected' : ''}
											id="r43"
											onclick={changeBGratio}
										>
											4:3
										</button>
										<button
											class={currentBGratio === '5:4' ? 'btnSelected' : ''}
											id="r54"
											onclick={changeBGratio}
										>
											5:4
										</button>
										<button
											class={currentBGratio === '16:9' ? 'btnSelected' : ''}
											id="r169"
											onclick={changeBGratio}
										>
											16:9
										</button>
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>
				<div id="masking-mode" class="toolbtn masking-mode" onclick={menuToggle}>
					<Icon
						class="tool-icon-mid"
						icon="mingcute:paint-brush-ai-fill"
						style={maskingMode ? 'color: var(--highlight-color)' : 'color: var(--dim-color)'}
					/>
					{#if activeMenu === 'masking-mode'}
						<div class="add-item-list" transition:slide>
							<div class="masking-mode-wrapper">
								<div class="masking-toggle-wrapper">
									<div class="masking-title">Masking</div>
									<ToggleBtn checked={maskingMode} onToggle={setMaskCanvas} />
								</div>
								{#if maskingMode}
								<div class="drawing-mode-wrapper" transition:slide>
									<button id="draw-btn" onclick={handleDrawingMode} class={activeDrawingMode === 'draw' ? 'selected' : ''}>
										<Icon class="tool-icon-mid" icon="ph:paint-brush-fill" />
									</button>
								<button id="eraser-btn" onclick={handleDrawingMode} class={activeDrawingMode === 'eraser' ? 'selected' : ''}>
									<Icon class="tool-icon-mid" icon="fluent:eraser-24-filled" />
								</button>
								
								</div>
								
								<div class="brush-size-wrapper" transition:slide>
									{#if activeDrawingMode === 'draw'}
										<Slider
											value={brushSize}
											min={1}
											max={100}
											scale={1}
											name="Brush Size"
											unit="px"
											onValueChange={(newValue) => updateBrushSize(newValue)}
										/>
									{:else if activeDrawingMode === 'eraser'}
										<Slider
											value={eraserSize}
											min={1}
											max={100}
											scale={1}
											name="Eraser Size"
											unit="px"
											onValueChange={(newValue) => updateEraserSize(newValue)}
										/>
									{/if}
								</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>
	<div id="casting-model" class="toolbtn casting-model" onclick={menuToggle}>
  <Icon
    class={`tool-icon-mid ${castingStatus && ['Queue', 'Waiting', 'Training'].includes(castingStatus.training_status) ? 'casting-active' : ''}`}
    icon="mage:scan-user-fill"
    style={currentCasting ? 'color: var(--highlight-color)' : ''}
  />
  {#if activeMenu === 'casting-model'}
    <div class="casting-panel" transition:slide>
      <div class="title">Casting model</div>

 <div class="refresh-btn-wrapper">
        <button class="refresh-btn" onclick={() => getLoLAlist()} disabled={castingListLoading}>
          <Icon icon="mdi:refresh" width="16" height="16" class={castingListLoading ? 'rotating' : ''} />
          Refresh Casting List
        </button>
      </div>
      {#if castingStatus}
        <div class="casting-status status-{castingStatus.training_status.toLowerCase()}">
          {#if castingStatus.training_status === 'Queue'}
            <span class="status-indicator queue"></span>
            <strong>{castingStatus.modelName}</strong> is in queue for training...
          {:else if castingStatus.training_status === 'Waiting'}
            <span class="status-indicator waiting"></span>
            <strong>{castingStatus.modelName}</strong> is waiting to start training...
          {:else if castingStatus.training_status === 'Training'}
            <span class="status-indicator training"></span>
            <strong>{castingStatus.modelName}</strong> is training... 
            {#if castingStatus.progress}
              ({castingStatus.progress}% complete)
            {/if}
          {:else if castingStatus.training_status === 'Done'}
            <span class="status-indicator done"></span>
            <strong>{castingStatus.modelName}</strong> training has completed successfully!
          {:else if castingStatus.training_status === 'Failed'}
            <span class="status-indicator failed"></span>
            <strong>{castingStatus.modelName}</strong> training has failed.
          {/if}
        </div>
      {/if}

      <div class="casting-selection">
        {#if castingListLoading}
          <div class="casting-loading">
            <div class="spinner"></div>
            Loading models...
          </div>
        {:else}
          <Dropdown
            label=""
            placeholder={castingList.length > 0 ? "Select a model" : "No models available"}
            options={castingList.map((item) => ({
              label: `- ${item.name} (${item.triggerWord})`,
              value: item.id
            }))}
            selected={currentCasting}
            onChange={(option) => (currentCasting = option.value)}
            labelPosition="left"
          />
        {/if}
      </div>
  
      {#if currentCasting}
        <div class="slider-setting-group" transition:fade>
          <Slider
            value={finetune_strength}
            min={0}
            max={2}
            scale={0.1}
            name="Strength"
            unit=""
            onValueChange={(newValue) => (finetune_strength = newValue)}
          />
        </div>
		
        <div class="casting-btn-wrapper">
          <button onclick={() => (currentCasting = '')}>Cancel Casting</button>
        </div>
      {/if}
      <div class="casting-btn-wrapper">
        <button onclick={openCastingPanel}>Casting new model</button>
      </div>
   
    </div>
  {/if}
</div>
<div class="toolbtn"  onclick={downloadCurrentScreen}>

		 <Icon
    class="tool-icon-mid"
    icon="material-symbols:download"
   
  />
	
</div>

				<!-- <div id="bg-set" class="toolbtn BG" onclick={menuToggle}>
					{#if activeMenu === 'bg-set'}
						<input
							type="file"
							id="bg-import"
							accept=".png,.jpg,.jpeg, .webp"
							style="display: none;"
							onchange={handleBGImport}
						/>
						<div class="add-item-list" transition:slide>
							<div class="bg-preview-group">
								{#if isBG}
									<div class="bg-preview-thumbnail" transition:fade>
										<img src={currentBG} alt="bg-preview" />
									</div>

									<div class="slider-setting-group" transition:fade>
										<Slider
											value={bgRotation}
											min={0}
											max={360}
											scale={1}
											name="BG Rotation"
											unit="°"
											onValueChange={(newValue) => (bgRotation = newValue)}
										/>
									</div>
									<div class="slider-setting-group" transition:fade>
										<Slider
											value={bgBrightness}
											min={0}
											max={2}
											scale={0.1}
											name="BG Brightness"
											unit=""
											onValueChange={(newValue) => (bgBrightness = newValue)}
										/>
									</div>
									<button
										transition:fade
										onclick={() => document.getElementById('bg-import').click()}
									>
										Change Background
									</button>
									<button transition:fade onclick={downloadBG}> Download BG </button>
									<button transition:fade onclick={removeBG}> Remove BG </button>
								{:else}
									<button onclick={() => document.getElementById('bg-import').click()}>
										Upload Background
									</button>
								{/if}
							</div>
						</div>
					{/if}
					<Icon class="tool-icon" icon="material-symbols:landscape-2-outline-rounded" />
				</div>
				<div id="camera-set" class="toolbtn camera" onclick={menuToggle}>
					{#if activeMenu === 'camera-set'}
						<div class="add-item-list" transition:slide>
							<button id="bg-upload-btn"> Perspective </button>
						</div>
					{/if}
					<Icon class="tool-icon" icon="clarity:video-camera-line" />
				</div>
				<div onclick={menuToggle} id="light-set" class="toolbtn light">
					{#if activeMenu === 'light-set'}
						<div class="add-item-list" transition:slide>
							<button id="bg-upload-btn"> keylight </button>
						</div>
					{/if}
					<Icon class="tool-icon" icon="pajamas:bulb" />
				</div> -->
			</div>

			<div class="prompt-input-wrapper">
				<div class="gen-opt-wrapper">
					<button
						title="upload image reference"
						class={imagePrompt ? 'IP' : 'IP none'}
						disabled={isGenerating || maskingMode}
						onclick={() => (openImagePrompt = !openImagePrompt)}
					>
						<Icon icon="ri:image-ai-line" width="20" height="20" />
					</button>

					{#if openImagePrompt}
						<div class="image-prompt" transition:slide>
							<div class="image-prompt-content">
								<div class="image-ref-mode-switch">
									<button
										id="style-ref"
										class={currentRefMode === 'style-ref' ? 'selected-img-ref-btn' : 'img-ref-btn'}
										onclick={switchImagePromptMode}>Basic</button
									>
									<button
										id="depth-ref"
										class={currentRefMode === 'depth-ref' ? 'selected-img-ref-btn' : 'img-ref-btn'}
										onclick={switchImagePromptMode}>Depth</button
									>
									<button
										id="canny-ref"
										class={currentRefMode === 'canny-ref' ? 'selected-img-ref-btn' : 'img-ref-btn'}
										onclick={switchImagePromptMode}>Line</button
									>
								</div>
								{#if liveGenState}
									<div class="image-preview-container">
										<div class="live-render-bg">
											<!-- Scene elements for depth -->
											<div class="expanding-ring"></div>
											<div class="expanding-ring" style="animation-delay: 1s;"></div>
											<div class="expanding-ring" style="animation-delay: 2s;"></div>
										</div>
										<div class="ip-strength-slider">
											<ImgSlider
												value={fluxPrompt.image_prompt_strength}
												min={0}
												max={1}
												scale={0.1}
												name="Strength"
												unit=""
												onValueChange={(newValue) => (fluxPrompt.image_prompt_strength = newValue)}
											/>
										</div>
									</div>
								{/if}
								<input
									type="file"
									id="image-prompt-input"
									accept=".png,.jpg,.jpeg,.webp"
									style="display: none;"
									onchange={handleImagePrompt}
								/>
								{#if !liveGenState}
									{#if imagePrompt}
										<div class="image-preview-container">
											<img src={imagePrompt} alt="Reference image" />

											<div class="ip-strength-slider">
												<ImgSlider
													value={fluxPrompt.image_prompt_strength}
													min={0}
													max={1}
													scale={0.1}
													name="Strength"
													unit=""
													onValueChange={(newValue) =>
														(fluxPrompt.image_prompt_strength = newValue)}
												/>
											</div>
											<div class="image-preview-actions">
												<button onclick={removeImagePrompt} title="Remove image">
													<Icon icon="carbon:close" width="16" height="16" />
												</button>
											</div>
										</div>
									{:else}
										<div
											class="upload-placeholder"
											onclick={() => document.getElementById('image-prompt-input').click()}
										>
											<Icon icon="material-symbols:cloud-upload" width="24" height="24" />
											<span>Upload Image Reference</span>
										</div>
									{/if}
								{/if}
								<div id="live-render" class="live-render">
									<div class="live-render-desc">
										Use Live Reference <span
											title="Use current viewport as a reference image prompt for the A.I. image generation"
											><Icon
												class="help-icon"
												icon="material-symbols:help-outline"
												width="20"
												height="20"
											/></span
										>
									</div>

									<ToggleBtn checked={liveGenState} onToggle={handleLiveRenderToggle} />
								</div>
							</div>
						</div>
					{/if}
				</div>
				<input
					type="text"
					id="prompt-input"
					bind:value={fluxPrompt.prompt}
					oninput={onPrompt}
					placeholder="Enter prompt"
					disabled={isBusy}
				/>
				<button class="go-btn" onclick={runImageGen} disabled={isGenerating}>
					<Icon icon="jam:arrow-up" width="24" height="24" />
				</button>
			</div>
		</div>
	</section>
</div>

{#if isGenerating}
	<div class="generation-container">
		<div class="upload-progress">
			<div
				class="progress-bar"
				class:indeterminate={generationProgress === 0}
				class:active-generation={isPending}
				style="width: {generationProgress}%"
			></div>
		</div>

		<div class="upload-info">
			<span class="stage-label">
				{#if isPending}
					Generating image... {generationProgress > 0 ? `${generationProgress}%` : 'Starting...'}
				{:else if generationProgress >= 100}
					Almost done! Processing image...
				{:else}
					Generation will start soon...
				{/if}
			</span>

			<button class="cancel-btn" onclick={cancelGeneration}>
				<Icon icon="carbon:close" width="16" height="16" />
			</button>
		</div>
	</div>
{/if}

<!-- 에러 메시지 표시 -->
{#if generationError}
	<div class="error-toast" transition:slide>
		<p>{generationError}</p>
		<button onclick={() => (generationError = null)}>
			<Icon icon="carbon:close" width="16" height="16" />
		</button>
	</div>
{/if}

<!-- 생성된 이미지 미리보기 -->
{#if cachedImageUrl && !isGenerating && onPreview}
	<div class="generated-image-preview-backdrop"></div>
	<div class="generated-image-preview" transition:fade>
		<img src={cachedImageUrl} alt="Generated image" />
		<div class="image-actions">
			<button
				class="main-action-btn"
				onclick={() => {
					// 캐시된 이미지를 배경으로 설정
					if (cachedImageBlob) {
						// 캐시된 blob에서 새 파일 생성
						const file = new File([cachedImageBlob], 'generated-image.png', {
							type: cachedImageBlob.type || 'image/png'
						});

						// 로컬 상태 업데이트
						isBG = true;
						currentBG = cachedImageUrl;

						// 배경으로 설정
						BGfromURL(currentBG);

						// 미리보기 닫기
						onPreview = false;
					} else {
						// blob을 사용할 수 없는 경우 대체 (발생하지 않아야 함)
						generationError = 'Image data not available. Please try again.';
					}
				}}
			>
				<Icon class="preview-action-btn-icon" icon="iconamoon:check-duotone" />
			</button>

			<button
				class="preview-action-btn"
				onclick={() => {
					if (cachedImageBlob) {
						// 캐시된 blob에서 직접 다운로드 트리거
						const filename = generateImageFilename('otr-ai-gen');
						const link = document.createElement('a');
						link.href = cachedImageUrl;
						link.download = filename;
						document.body.appendChild(link);
						link.click();
						document.body.removeChild(link);
					} else {
						// blob을 사용할 수 없는 경우 대체 (발생하지 않아야 함)
						generationError = 'Image data not available. Please try again.';
					}
				}}
			>
				<Icon class="preview-action-btn-icon" icon="material-symbols:download" />
			</button>

			<button
				class="preview-action-btn"
				onclick={() => {
					// 미리보기 닫기 - 캐시된 이미지는 메모리에 유지
					onPreview = false;
				}}
			>
				<Icon class="preview-action-btn-icon" icon="carbon:close" />
			</button>
		</div>
	</div>
{/if}

<!-- Upload progress indicator -->
{#if isUploading || uploadStage === 'processing'}
	<div class="upload-container">
		<div class="upload-progress">
			<div
				class="progress-bar"
				class:indeterminate={uploadStage === 'processing'}
				style="width: {uploadProgress}%"
			></div>
		</div>

		<div class="upload-info">
			<span class="stage-label">
				{#if uploadStage === 'reading'}
					Reading file: {uploadProgress}%
				{:else if uploadStage === 'validating'}
					Validating file
				{:else if uploadStage === 'processing'}
					Processing 3D model...
				{/if}
			</span>

			{#if uploadStage !== 'processing'}
				<button class="cancel-btn" onclick={cancelUpload}>
					<Icon icon="carbon:close" width="16" height="16" />
				</button>
			{/if}
		</div>
	</div>
{/if}

<!-- File validation error message -->
{#if fileValidationError}
	<div class="error-toast" transition:slide>
		<p>{fileValidationError}</p>
		<button onclick={() => (fileValidationError = null)}>
			<Icon icon="carbon:close" width="16" height="16" />
		</button>
	</div>
{/if}

<style>
	.main {
		box-sizing: border-box;
		height: 100%;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		min-width: 100px;
		width: 100%;
		max-width: 600px;
		padding: 5px 16px;
		margin: 0 auto;
	}

	.main-ui-wrapper {
		box-sizing: border-box;
		position: relative;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;

		width: 100%;

		background: var(--glass-background);
		border: 1px solid var(--dim-color);
		border-radius: 12px;
		color: var(--text-color-bright);
		backdrop-filter: blur(2px);
		height: 100%;
	}

	.logo-wrapper {
		text-align: center;
		padding: 12px;
		box-sizing: border-box;
		display: flex;
		justify-self: center;
		align-items: center;
		height: 80px; /* Full height of parent */
		width: 80px;
		min-width: 80px;
		position: relative;
		border-right: 1px solid var(--dim-color);
	}

	.logo-wrapper img {
		width: 100%;
		height: 100%;
		display: flex;
		justify-self: center;
		align-items: center;
	}

	.function-wrapper {
		height: 80px;
		flex-grow: 1;
		display: flex;
		flex-direction: column;
	}
	.tool-menus {
		box-sizing: border-box;
		height: 50%;
		width: 100%;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		padding: 10px 0;
	}

	.tool-menus > div.toolbtn {
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		text-align: center;

		border: none;
		border-right: 1px solid var(--dim-color);
		font-weight: 500;
		font-size: 0.9rem;
		background: none;
		outline: none;
		height: 100%;
		padding: 0 10px;
		color: var(--dim-color);
		transition: all ease-in-out 300ms;
		cursor: pointer; /* 버튼처럼 커서 추가 */
	}

	.tool-menus > div.toolbtn:hover {
		color: var(--text-color-bright);
	}

	.tool-menus > div.toolbtn:last-child {
		border-right: none;
	}

	div :global(.tool-icon) {
		box-sizing: border-box;
		height: 22px; /* 고정 높이 지정 */
		width: 22px; /* 고정 너비 지정 */
		padding: 2px;
		pointer-events: none;
	}
	div :global(.tool-icon-mid) {
		box-sizing: border-box;
		height: 28px; /* 고정 높이 지정 */
		width: 28px; /* 고정 너비 지정 */
		padding: 2px;
		pointer-events: none;
	}
	div :global(.tool-icon-big) {
		box-sizing: border-box;
		height: 32px; /* 고정 높이 지정 */
		width: 32px; /* 고정 너비 지정 */
		padding: 2px;
		pointer-events: none;
	}

	.bg-preview-group {
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}

	.bg-preview-group > div {
		border-bottom: 1px solid var(--dim-color);
	}

	.bg-preview-group > div:first-child {
		border-bottom: none;
	}

	.bg-preview-group button {
		border-bottom: 1px solid var(--dim-color);
	}

	.bg-preview-group button:last-child {
		border-bottom: none;
	}

	.bg-preview-group > button:only-child {
		border: none;
	}

	.bg-preview-thumbnail {
		box-sizing: border-box;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 6px;
		width: 250px;

		background-color: var(--secondary-color);
	}
	.bg-preview-thumbnail img {
		width: 100%;
		height: 100%;
		max-height: 300px;
		object-fit: contain;
		border: 1px solid var(--dim-color);
		border-radius: 8px;
	}
	.slider-setting-group {
		position: relative;
		width: 100%;
		height: 42px;
	}

	.prompt-input-wrapper {
		box-sizing: border-box;
		width: 100%;
		height: 50%;
		padding: 2px 6px;
		box-sizing: border-box;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		border-top: 1px solid var(--dim-color);
	}

	#prompt-input {
		font-family: 'Orbit-Regular';
		box-sizing: border-box;
		display: flex;
		flex-grow: 1;
		justify-content: center;
		align-items: center;
		padding: 10px 20px;
		border: none;
		font-size: 0.9rem;
		color: var(--text-color-bright);
		width: 100%;
		height: 100%;
		background: none;
		transition: background-color 0.2s;
	}

	#prompt-input:disabled {
		color: var(--dim-color);
	}

	#prompt-input:active {
		border: none;
	}

	.go-btn {
		box-sizing: border-box;
		border: none;
		border-radius: 8px;
		padding: 2px;

		display: flex;
		justify-content: center;
		align-items: center;
		background-color: var(--highlight-color);
		color: var(--text-color-standard);

		transition: all ease-in-out 300ms;
	}

	.go-btn:hover:not(:disabled) {
		background-color: var(--hover-color);
		cursor: pointer;
	}

	.go-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.upload-container,
	.generation-container {
		position: fixed;
		bottom: 20px;
		left: 50%;
		transform: translateX(-50%);
		width: 300px;
		background-color: var(--dim-color);
		border-radius: 10px;
		overflow: hidden;
		z-index: 999;
		padding: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.upload-progress {
		height: 8px;
		background-color: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 8px;
	}

	.progress-bar {
		height: 100%;
		background-color: var(--highlight-color);
		transition: width 0.3s ease;
	}

	.indeterminate {
		position: relative;
		width: 50% !important;
		animation: indeterminate 1.5s infinite ease-in-out;
	}

	@keyframes indeterminate {
		0% {
			left: -50%;
		}
		100% {
			left: 100%;
		}
	}

	.upload-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: white;
		font-size: 14px;
	}

	.cancel-btn {
		background: none;
		border: none;
		color: white;
		opacity: 0.7;
		cursor: pointer;
		padding: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.cancel-btn:hover {
		opacity: 1;
	}

	.error-toast {
		position: fixed;
		bottom: 80px;
		left: 50%;
		transform: translateX(-50%);
		background-color: #f44336;
		color: white;
		padding: 12px 16px;
		border-radius: 8px;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-width: 300px;
		max-width: 500px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.error-toast p {
		margin: 0;
		flex: 1;
	}

	.error-toast button {
		background: none;
		border: none;
		color: white;
		margin-left: 16px;
		cursor: pointer;
		padding: 4px;
	}

	div :global(.btn-icon-st) {
		height: 100%;
	}

	.add-item-list {
		box-sizing: border-box;
		position: absolute;
		bottom: 100%;
		display: flex;
		flex-direction: column;

		margin-bottom: -10px;
		overflow: hidden;
		transition: all ease-in-out 0.2s;
		min-width: 150px;
		background-color: var(--primary-color);
		border-radius: 12px;
		border: 1px solid var(--dim-color);
	}

	.add-item-list button {
		box-sizing: border-box;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		padding: 15px 20px;
		text-align: center;
		width: 100%;
		white-space: nowrap;
		border-radius: 0;
		font-size: 0.9rem;
		background-color: var(--primary-color);
		color: var(--dim-color);
		transition: all ease-in-out 300ms;
	}

	.add-item-list button:first-child {
		border-bottom: 1px solid var(--dim-color);
	}

	.add-item-list button:hover {
		cursor: pointer;
		background-color: var(--highlight-color);
		color: white;
	}

	.add-item-list .btnSelected {
		color: var(--text-color-bright);
		background-color: var(--highlight-color);
	}

	.gen-opt-wrapper {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		gap: 6px;
	}

	.gen-opt-btn {
		border: none;
		border-radius: 8px;
		padding: 2px;
		width: 32px;
		height: 24px;
		display: flex;
		justify-content: center;
		align-items: center;
		font-size: 0.8rem;
		color: var(--text-color-standard);
		border: 1px solid var(--dim-color);
		transition: all ease-in-out 300ms;
		cursor: pointer;
	}

	.gen-opt-btn:hover {
		background-color: var(--highlight-color);
		color: var(--text-color-bright);
	}

	.gen-option-window {
		box-sizing: border-box;
		position: absolute;
		left: 64px;
		bottom: 30%;

		display: flex;
		flex-direction: column;

		overflow: hidden;
		transition: all ease-in-out 0.5s;
		min-width: 150px;
		background-color: var(--primary-color);
		border-radius: 12px;
		border: 1px solid var(--dim-color);
	}

	.gen-option-window button {
		box-sizing: border-box;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		padding: 15px 20px;
		text-align: center;
		width: 100%;
		white-space: nowrap;
		border-radius: 0;
		font-size: 0.9rem;
		background-color: var(--primary-color);
		color: var(--dim-color);
		transition: all ease-in-out 300ms;
	}

	.gen-option-window button:first-child {
		border-bottom: 1px solid var(--dim-color);
	}

	.gen-option-window button:hover {
		cursor: pointer;
		background-color: var(--highlight-color);
		color: white;
	}

	.gen-option-window .btnSelected {
		color: white;
	}

	.ratio-selection-group {
		display: flex;
		flex-direction: row;
		width: 100%;
		box-sizing: border-box;
		border-top: 1px solid var(--dim-color);
	}

	.ratio-selection {
		box-sizing: border-box;
		width: 100px;
	}

	.ratio-selection:first-child {
		border-right: 1px solid var(--dim-color);
	}

	.ratio-type-title {
		display: flex;
		justify-content: center;
		align-items: center;
		font-size: 0.9rem;
		padding: 10px 0px;
		cursor: default;
		border-bottom: 1px solid var(--dim-color);
	}

	.ratio-type-list {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}
	.ratio-type-list button {
		font-size: 0.9rem;
		padding: 10px 0px;
		border: none !important;
	}

	.generated-image-preview {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background-color: var(--primary-color);
		border-radius: 12px;
		padding: 16px;
		z-index: 1000;
		max-width: 80vw;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
		border: 1px solid var(--dim-color);
	}

	.generated-image-preview-backdrop {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 100vw;
		height: 100vh;
		z-index: 999;

		/* background-color: rgba(0, 0, 0, 1); */
		backdrop-filter: blur(3px);
	}

	.generated-image-preview img {
		max-width: 100%;
		max-height: 60vh;
		object-fit: contain;
		border-radius: 8px;
		margin-bottom: 16px;
	}

	.image-actions {
		box-sizing: border-box;
		width: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 6px;
		margin-top: 10px;
	}

	.main-action-btn {
		padding: 8px 32px;
		background-color: var(--highlight-color);
		color: var(--text-color-standard);
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.3s ease;
	}
	.main-action-btn:hover {
		background-color: var(--hover-color);
	}

	.preview-action-btn {
		padding: 8px 16px;
		background-color: var(--highlight-color);
		color: var(--text-color-standard);
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.preview-action-btn:hover {
		background-color: var(--hover-color);
	}

	div :global(.preview-action-btn-icon) {
		color: var(--text-color-standard);
		width: 20px;
		height: 20px;
	}

	.progress-bar {
		height: 100%;
		background-color: var(--highlight-color);
		transition: width 0.3s ease;
	}

	.indeterminate {
		position: relative;
		width: 50% !important;
		animation: indeterminate 1.5s infinite ease-in-out;
	}

	.active-generation {
		background-color: var(--highlight-color); /* Green color for active generation */
		/* Keep the pulse animation if you want to show activity */
		animation: pulse 2s infinite;
	}

	@keyframes indeterminate {
		0% {
			left: -50%;
		}
		100% {
			left: 100%;
		}
	}

	@keyframes pulse {
		0% {
			opacity: 0.6;
		}
		50% {
			opacity: 1;
		}
		100% {
			opacity: 0.6;
		}
	}
	.seed-setting .seed-detail {
		display: flex;
		justify-content: center;
		align-items: center;
		font-size: 0.9rem;
	}
	.seed-setting-wrapper {
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 100%;
	}

	.seed-title {
		font-size: 0.9rem;
		padding: 10px 0px;
		cursor: default;
		width: 100%;
		text-align: center;
		border-bottom: 1px solid var(--dim-color);
	}

	.seed-input-container {
		width: 100%;
		cursor: default;
		box-sizing: border-box;
	}

	#seed-input {
		box-sizing: border-box;
		width: 100%;
		background: none;
		border: none;

		padding: 8px;
		color: var(--text-color-bright);
		text-align: center;
		font-size: 0.9rem;
		/* Remove spinner buttons from number input */
		-moz-appearance: textfield; /* Firefox */
	}

	/* Chrome, Safari, Edge, Opera */
	#seed-input::-webkit-outer-spin-button,
	#seed-input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	#seed-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.seed-random-toggle {
		box-sizing: border-box;
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;

		border-top: 1px solid var(--dim-color);
		cursor: default;
	}

	.seed-random-toggle label {
		text-align: left;

		font-size: 0.9rem;
		color: var(--text-color-standard);
		cursor: pointer;
		margin-left: 10px;
		flex-grow: 1;
		transition: all ease-in-out 300ms;
	}
	.seed-random-toggle label:hover {
		color: var(--text-color-bright);
	}

	.toggle-container {
		padding: 10px;
		display: flex;
		align-items: center;
	}

	.toggle {
		position: relative;
		display: inline-block;
		width: 40px;
		height: 22px;
	}

	.toggle input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: var(--dim-color);
		transition: 0.4s;
		border-radius: 34px;
	}

	.slider:before {
		position: absolute;
		content: '';
		height: 16px;
		width: 16px;
		left: 3px;
		bottom: 3px;
		background-color: white;
		transition: 0.4s;
		border-radius: 50%;
	}

	input:checked + .slider {
		background-color: var(--highlight-color);
	}

	input:checked + .slider:before {
		transform: translateX(18px);
	}

	.IP {
		box-sizing: border-box;
		border: none;
		border-radius: 8px;
		padding: 4px;
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: var(--highlight-color);
		color: var(--text-color-standard);
		transition: all ease-in-out 300ms;
		margin-right: 8px;
	}

	.IP:hover:not(:disabled) {
		background-color: var(--hover-color);
		color: var(--text-color-bright);
		cursor: pointer;
	}

	.IP:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.IP.none {
		background-color: transparent;
		border: 1px solid var(--dim-color);
		color: var(--dim-color);
	}

	.image-prompt {
		position: absolute;
		left: 0;
		bottom: 100%;
		margin-bottom: 8px;
		background-color: var(--primary-color);
		border-radius: 8px;
		border: 1px solid var(--dim-color);
		overflow: hidden;
		width: 180px;
		z-index: 10;
	}

	.image-prompt-content {
		box-sizing: border-box;
		width: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 8px;
	}

	.upload-placeholder {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 150px;
		height: 150px;
		padding: 16px;

		border-radius: 8px;
		cursor: pointer;
		color: var(--dim-color);
		transition: all ease-in-out 300ms;
	}

	.upload-placeholder:hover {
		border-color: var(--highlight-color);
		background-color: rgba(255, 255, 255, 0.05);
		color: var(--text-color-bright);
	}

	.upload-placeholder span {
		text-align: center;
		margin-top: 8px;
		font-size: 0.9rem;
	}

	.image-preview-container {
		position: relative;
		width: 150px;
		height: 150px;
		margin: 15px;
		border-radius: 8px;
		overflow: hidden;
		border: 1px solid var(--dim-color);
	}

	.image-preview-container img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.image-preview-actions {
		position: absolute;
		top: 0;
		right: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 998;
	}

	.image-preview-actions button {
		background-color: rgba(0, 0, 0, 0.5);
		border: none;
		border-radius: 0 0 0 8px;
		padding: 6px;
		cursor: pointer;
		color: white;
		transition: all ease-in-out 300ms;
	}

	.image-preview-actions button:hover {
		background-color: rgba(255, 0, 0, 0.8);
	}

	.ip-strength-slider {
		position: absolute;
	}
	.ip-strength-slider {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	.live-render {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		margin-top: 10px;
		margin-bottom: 10px;
	}

	.live-render-desc {
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		gap: 4px;
	}

	div :global(.help-icon) {
		width: 20px;
		height: 20px;
		cursor: pointer;
	}

	.live-render-bg {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 1;
		overflow: hidden;
		border-radius: 8px;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	/* Main gradient animation */
	.live-render-bg::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: linear-gradient(
			135deg,
			var(--primary-color) 0%,
			#2a1418 25%,
			var(--highlight-color) 50%,
			#3a1f29 75%,
			var(--primary-color) 100%
		);
		background-size: 400% 400%;
		animation: smoothGradient 12s ease infinite;
		z-index: 1;
	}

	/* Overlay with depth */
	.live-render-bg::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: radial-gradient(
			circle at center,
			var(--secondary-color) 0%,
			var(--primary-color) 70%
		);
		z-index: 2;
	}

	/* Live indicator container */
	.live-indicator-container {
		position: relative;
		z-index: 5;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: var(--text-color-bright);
		background-color: var(--primary-color);
		backdrop-filter: blur(2px);
		padding: 4px 12px;
		border-radius: 4px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
		border: 1px solid var(--dim-color);
	}

	/* Status indicator */
	.live-indicator-container .status {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.8rem;
		letter-spacing: 0.5px;
		font-weight: 600;
	}

	.live-indicator-container .pulse-dot {
		width: 8px;
		height: 8px;
		background: linear-gradient(135deg, #ff5e5e, #d63c3c);
		border-radius: 50%;
		box-shadow: 0 0 5px rgba(255, 94, 94, 0.5);
		animation: pulseDot 1.5s ease-in-out infinite;
	}

	/* Scene elements for depth */
	.scene-element {
		position: absolute;
		background-color: rgba(255, 255, 255, 0.03);
		border-radius: 2px;
		z-index: 3;
		transform-origin: center;
	}

	.scene-element:nth-child(1) {
		width: 40px;
		height: 40px;
		top: 20px;
		left: 30px;
		animation: float 8s ease-in-out infinite;
	}

	.scene-element:nth-child(2) {
		width: 30px;
		height: 30px;
		bottom: 30px;
		right: 40px;
		animation: float 6s ease-in-out infinite 1s;
	}

	.scene-element:nth-child(3) {
		width: 25px;
		height: 25px;
		bottom: 20px;
		left: 35px;
		animation: float 7s ease-in-out infinite 2s;
	}

	.scene-element:nth-child(4) {
		width: 20px;
		height: 20px;
		top: 30px;
		right: 50px;
		animation: float 5s ease-in-out infinite 0.5s;
	}

	/* Expanding ring */
	.expanding-ring {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 10px;
		height: 10px;
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 50%;
		z-index: 3;
		animation: expandRing 4s ease-out infinite;
	}

	/* Make sure strength slider stays on top */
	.ip-strength-slider {
		z-index: 10;
	}

	/* Animation keyframes */
	@keyframes smoothGradient {
		0% {
			background-position: 0% 50%;
		}
		50% {
			background-position: 100% 50%;
		}
		100% {
			background-position: 0% 50%;
		}
	}

	@keyframes pulseDot {
		0% {
			transform: scale(0.8);
			opacity: 0.7;
		}
		50% {
			transform: scale(1.1);
			opacity: 1;
			box-shadow: 0 0 10px rgba(255, 94, 94, 0.7);
		}
		100% {
			transform: scale(0.8);
			opacity: 0.7;
		}
	}

	@keyframes float {
		0% {
			transform: translateY(0) rotate(0deg);
			opacity: 0.3;
		}
		50% {
			transform: translateY(-10px) rotate(5deg);
			opacity: 0.5;
		}
		100% {
			transform: translateY(0) rotate(0deg);
			opacity: 0.3;
		}
	}

	@keyframes expandRing {
		0% {
			width: 10px;
			height: 10px;
			opacity: 0.7;
		}
		100% {
			width: 150px;
			height: 150px;
			opacity: 0;
		}
	}

	.casting-panel {
		box-sizing: border-box;
		position: absolute;
		bottom: 100%;
		display: flex;
		flex-direction: column;

		margin-bottom: -10px;
		transition: all ease-in-out 0.2s;
		min-width: 120px;
		background-color: var(--primary-color);
		border-radius: 12px;
		border: 1px solid var(--dim-color);
	}

	.title {
		font-size: 0.9rem;
		padding: 10px 0px;
		cursor: default;
		width: 100%;
		text-align: center;
		border-bottom: 1px solid var(--dim-color);
	}
	.casting-selection {
		position: relative;
		
		border-top: 1px solid var(--dim-color);
		border-bottom: 1px solid var(--dim-color);
		width: 100%;
	}

	.casting-btn-wrapper {
		width: 100%;
	}
	.casting-btn-wrapper button {
		box-sizing: border-box;
		border-top: 1px solid var(--dim-color);
		width: 100%;
		height: 42px;
		border-radius: 0 0 12px 12px;
		color: var(--text-color-standard);
		transition: all ease-in-out 300ms;
	}

	.casting-btn-wrapper button:hover {
		background-color: var(--highlight-color);
		color: var(--text-color-bright);
	}

	.image-ref-mode-switch {
		width: 100%;
		height: 42px;

		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-self: center;
	}
	.image-ref-mode-switch button {
		flex-grow: 1;
		text-align: center;
		cursor: pointer;
		border-right: 1px solid var(--dim-color);
		border-bottom: 1px solid var(--dim-color);
	}

	.image-ref-mode-switch button:last-child {
		border-right: none;
	}

	.image-ref-mode-switch button:hover {
		background-color: var(--highlight-color);
	}

	.selected-img-ref-btn {
		background-color: var(--highlight-color);
	}

	.masking-mode-wrapper {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 100%;
		
	}

	.masking-toggle-wrapper{
		width: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		border-bottom: 1px solid var(--dim-color);
	}

	.masking-title{
			width: 100%;
		text-align: center;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		padding: 12px 6px;
		border-bottom: 1px solid var(--dim-color);
	}

	.brush-size-wrapper {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		height: 32px;
	}

	.drawing-mode-wrapper {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		border-bottom: 1px solid var(--dim-color);
	}

	.drawing-mode-wrapper button {
		width: 100%;
		height: 36px;
		border: none !important;
		color: var(--text-color-standard);
		transition: all ease-in-out 300ms;
	}

	.drawing-mode-wrapper button.selected {
		background-color: var(--highlight-color);
	}

	
	/* Blinking animation for the casting icon */
	@keyframes blink {
		0% { opacity: 0.4; }
		50% { opacity: 1; }
		100% { opacity: 0.4; }
	}

	.casting-active {
		animation: blink 1.5s ease-in-out infinite;
		color: var(--highlight-color) !important;
	}
	
	.casting-status {
		margin: 10px 0;
		padding: 8px;
		background: var(--glass-background);
		font-size: 0.9rem;
		line-height: 1.4;
	}
	
	.status-queue {
		color: #ffb74d;
	}
	
	.status-waiting {
		color: #64b5f6;
	}
	
	.status-training {
		color: #4fc3f7;
	}
	
	.status-done {
		color: #81c784;
	}
	
	.status-failed {
		color: #e57373;
	}
	
	/* Status indicators */
	.status-indicator {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		margin-right: 8px;
	}
	
	.status-indicator.queue {
		background-color: #ffb74d;
		box-shadow: 0 0 5px rgba(255, 183, 77, 0.5);
	}
	
	.status-indicator.waiting {
		background-color: #64b5f6;
		box-shadow: 0 0 5px rgba(100, 181, 246, 0.5);
	}
	
	.status-indicator.training {
		background-color: #4fc3f7;
		box-shadow: 0 0 5px rgba(79, 195, 247, 0.5);
	}
	
	.status-indicator.done {
		background-color: #81c784;
		box-shadow: 0 0 5px rgba(129, 199, 132, 0.5);
	}
	
	.status-indicator.failed {
		background-color: #e57373;
		box-shadow: 0 0 5px rgba(229, 115, 115, 0.5);
	}
	
	/* Progress display styling */
	.progress-display {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 8px;
		font-size: 0.85rem;
	}
	
	.progress-display .percentage {
		font-weight: bold;
		color: var(--highlight-color);
	}

	.casting-loading {
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: var(--dim-color);
    font-style: italic;
  }
  
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--dim-color);
    border-top-color: var(--highlight-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .refresh-btn-wrapper {
    padding: 8px;
    display: flex;
    justify-content: center;
  }
  
  .refresh-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: none;
    border: none;
    font-size: 0.8rem;
    color: var(--dim-color);
    padding: 4px 8px;
    cursor: pointer;
    transition: color 0.2s ease;
  }
  
  .refresh-btn:hover:not(:disabled) {
    color: var(--text-color-bright);
  }
  
  .refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .rotating {
    animation: spin 1s linear infinite;
  }
</style>