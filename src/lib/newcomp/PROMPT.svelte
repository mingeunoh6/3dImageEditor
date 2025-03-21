<!-- PROMPT.svelte -->

<script>
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import { fade, slide } from 'svelte/transition';
	import Slider from '$lib/newcomp/elements/menu-slider.svelte';

	// Props from parent
	let {
		add3dModel,
		pathTracingRender = (state) => console.log(`render: ${state}`),
		viewportLoading,
		uploadError,
		BGimport,
		BGfromURL
	} = $props();

	let isGenerating = $state(false);
	let generationProgress = $state(0); // 이미지 생성 진행률
	let generationError = $state(null); // 에러 메시지
	let generatedImageUrl = $state(''); // 생성된 이미지 URL
	let cachedImageBlob = $state(null); // Store the actual image blob
	let cachedImageUrl = $state(''); // Store a local blob URL
	let taskId = $state(''); // FLUX API 작업 ID
	let flux_polling_url = $state(''); // FLUX API 작업 상태 확인 URL
	let pollingInterval = $state(null);
	let pollingTimeout = $state(null);
	let isPending = $state(false);
	let onPreview = $state(false);

	//Flux promt body
	let fluxPrompt = $state({
		prompt: 'Beautiful living room interior design with modern furniture and decor',
		image_prompt: 'mountain',
		aspect_ratio: '1:1',
		width: 1024,
		height: 1024,
		prompt_upsampling: false,
		seed: 42,
		safety_tolerance: 2,
		output_format: 'png',
		webhook_url: '',
		webhook_secret: ''
	});

	// Upload states
	let isUploading = $state(false);
	let uploadProgress = $state(0);
	let uploadStage = $state('idle'); // idle, reading, validating, processing
	let fileValidationError = $state(null);

	// Menu state
	let addMenuOpen = $state(false);
	let bgSettingOpen = $state(false);
	let activeMenu = $state(null);

	//render option state
	let isRenderOpt = $state(false);

	// Input constraints
	const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
	const SUPPORTED_FORMATS = ['.glb', '.gltf'];
	const TYPE_WHITELIST = ['model/gltf-binary', 'model/gltf+json'];

	// Component state
	let isBusy = $state(false);
	let abortController = null;
	//setting state
	let isBG = $state(false);
	let currentBG = $state('');
	let currentBGratio = $state('1:1');
	let bgRotation = $state(180);
	$effect(() => {
		console.log(bgRotation);
	});

	let bgBrightness = $state(1);
	$effect(() => {
		console.log(bgBrightness);
	});

	$effect(() => {
		if (currentBG && isBG) {
			BGfromURL(currentBG);
		}
	});

	// Monitor loading state from parent to update UI
	$effect(() => {
		if (viewportLoading) {
			isBusy = true;
			disableUI();
			addMenuOpen = false;
			uploadStage = 'processing';
		} else {
			isBusy = false;
			enableUI();

			// Reset upload state if no errors
			if (!uploadError) {
				resetUploadState();
			} else {
				uploadStage = 'error';
			}
		}
	});

	function onPrompt(event) {
		fluxPrompt.prompt = event.target.value;
	}

	async function runImageGen() {
		if (isGenerating) return; // 이미 생성 중이라면 중복 호출 방지

		// 상태 초기화
		// 상태 초기화
		isGenerating = true;
		isPending = false; // Start with pending state
		generationProgress = 0;
		generationError = null;
		taskId = '';
		clearPollingTimers();

		try {
			// UI 비활성화
			disableUI();

			// FLUX API 요청을 위한 올바른 형식의 입력 데이터 준비
			// 문서에 따라 FluxPro11Inputs 스키마와 일치하도록 구성
			const apiRequestData = {
				prompt: fluxPrompt.prompt,
				aspect_ratio: fluxPrompt.aspect_ratio,
				width: fluxPrompt.width,
				height: fluxPrompt.height,
				prompt_upsampling: fluxPrompt.prompt_upsampling,
				seed: fluxPrompt.seed,
				safety_tolerance: fluxPrompt.safety_tolerance,
				output_format: fluxPrompt.output_format
			};

			console.log('API 요청 데이터:', apiRequestData);

			// 서버 엔드포인트로 요청 전송
			const response = await fetch('api/flux', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ input: apiRequestData })
			});

			console.log('응답 상태:', response.status, response.statusText);

			// 응답 데이터 가져오기
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
			fluxPolling(flux_polling_url);

			// Add a timeout for generation (5 minutes max)
			pollingTimeout = setTimeout(() => {
				if (isGenerating) {
					clearInterval(pollingInterval);
					generationError = 'Generation timeout - please try again';
					isGenerating = false;
					isPending = false;
					enableUI();
				}
			}, 300000); // 5 minutes
		} catch (error) {
			console.error('이미지 생성 실패:', error);
			generationError = error.message;
			isGenerating = false;
			isPending = false;
		} finally {
			// 성공 여부와 상관없이 UI 활성화
			if (generationError) {
				enableUI();
				isGenerating = false;
				isPending = false;
			}
		}
	}
	function fluxPolling(pollingURL) {
		console.log('pollingURL:', pollingURL);

		if (!pollingURL) {
			generationError = 'Invalid polling URL';
			isGenerating = false;
			return;
		}

		pollingInterval = setInterval(async () => {
			try {
				const response = await fetch(pollingURL);
				if (!response.ok) {
					throw new Error(`Polling failed with status: ${response.status}`);
				}

				const data = await response.json();
				console.log('polling data:', data);

				if (data.status === 'Ready') {
					isPending = false;
					console.log('이미지 생성 완료:', data.result.sample);
					// Get the original URL from the API response
					const originalImageUrl = data.result.sample;
					// Create proxied URL to avoid CORS issues
					const proxiedImageUrl = `/api/flux?url=${encodeURIComponent(originalImageUrl)}`;

					// Set the generated image URL and call completeFluxTask
					generatedImageUrl = proxiedImageUrl;

					completeFluxTask(proxiedImageUrl);

					clearPollingTimers();
				} else if (data.status === 'Error') {
					console.error('이미지 생성 실패:', data.error);
					generationError = data.error;
					isGenerating = false;
					isPending = false;
					clearPollingTimers();
				} else if (data.status === 'Pending') {
					// Status 'Pending' means the image is being generated
					isPending = true;

					// Check if there's progress information and convert from decimal to percentage
					if (data.progress !== undefined && data.progress !== null) {
						// Convert from 0-1 range to 0-100 range
						generationProgress = Math.round(data.progress * 100);
					} else {
						// If no specific progress, use a default value to show activity
						generationProgress = 5; // Small percentage to indicate it's just starting
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

	async function completeFluxTask(imageURL) {
		try {
			// Show loading state
			isGenerating = true;

			// Fetch the image immediately
			console.log('Fetching image from:', imageURL);
			const response = await fetch(imageURL);

			if (!response.ok) {
				throw new Error(`Failed to fetch image: ${response.statusText}`);
			}

			// Get the image as a blob and cache it
			cachedImageBlob = await response.blob();

			// Create a local URL for the blob (for display purposes)
			if (cachedImageUrl) {
				// Revoke previous URL if it exists to prevent memory leaks
				URL.revokeObjectURL(cachedImageUrl);
			}
			cachedImageUrl = URL.createObjectURL(cachedImageBlob);

			// Update the generated image URL to use our cached URL
			generatedImageUrl = cachedImageUrl;

			console.log('Image successfully cached locally');

			// Generation complete
			isGenerating = false;
			onPreview = true;

			// Ensure UI is enabled
			enableUI();
		} catch (error) {
			console.error('Error caching image:', error);
			generationError = `Failed to load generated image: ${error.message}`;
			isGenerating = false;
			enableUI();
		}
	}

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

	// Clean up function for when component is destroyed
	function cleanupImageCache() {
		if (cachedImageUrl) {
			URL.revokeObjectURL(cachedImageUrl);
			cachedImageUrl = '';
		}
		cachedImageBlob = null;
	}

	function cancelGeneration() {
		clearPollingTimers();
		isGenerating = false;
		isPending = false;
		generationProgress = 0;
		enableUI();
	}

	// Toggle the add menu
	function toggleAddMenu() {
		if (isBusy) return; // Prevent opening menu when busy
		addMenuOpen = !addMenuOpen;
	}

	function menuToggle(e) {
		// Only respond to clicks on menu buttons directly, not their children
		if (e.currentTarget && e.currentTarget.id) {
			const clickedMenuId = e.currentTarget.id;

			if (activeMenu === clickedMenuId) {
				// Same menu - toggle it off
				activeMenu = null;
			} else {
				// Different menu - switch to it
				activeMenu = clickedMenuId;
			}
		}
	}

	// Reset all upload-related state
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

	// Validate the file before uploading
	function validateFile(file) {
		// Check if file exists
		if (!file) {
			return 'No file selected';
		}

		// Check file size
		if (file.size > MAX_FILE_SIZE) {
			return `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
		}

		// Check file extension
		const fileName = file.name.toLowerCase();
		const hasValidExtension = SUPPORTED_FORMATS.some((ext) => fileName.endsWith(ext));

		if (!hasValidExtension) {
			return `Unsupported file format. Please use: ${SUPPORTED_FORMATS.join(', ')}`;
		}

		// Additional MIME type check if available
		if (file.type && !TYPE_WHITELIST.includes(file.type) && file.type !== '') {
			console.warn(`Unexpected file type: ${file.type}, proceeding anyway`);
			// We don't reject here as MIME types can be unreliable
		}

		return null; // No error
	}

	// Handle file selection
	function addModel(event) {
		const file = event.target.files[0];

		// Reset previous state
		resetUploadState();

		// Validate file
		const validationError = validateFile(file);
		if (validationError) {
			fileValidationError = validationError;
			event.target.value = ''; // Reset file input
			return;
		}

		if (file) {
			// Set up abort controller for cancellation
			abortController = new AbortController();

			// Update UI state
			isUploading = true;
			uploadStage = 'reading';
			uploadProgress = 0;

			// Create file reader to track progress
			const reader = new FileReader();

			// Track upload progress
			reader.onprogress = (event) => {
				if (event.lengthComputable) {
					const percentLoaded = Math.round((event.loaded / file.size) * 100);
					uploadProgress = percentLoaded;
				}
			};

			// Start loading
			reader.onloadstart = () => {
				console.log('Starting file read');
				uploadProgress = 0;
			};

			// Error handling
			reader.onerror = (error) => {
				console.error('File reading error:', error);
				fileValidationError = 'Failed to read file: ' + (error.message || 'Unknown error');
				isUploading = false;
				event.target.value = ''; // Reset file input
			};

			// Finish loading
			reader.onloadend = () => {
				console.log('File read complete');
				uploadProgress = 100;
				uploadStage = 'validating';

				// Small delay to show complete progress before proceeding
				setTimeout(() => {
					// Reset file input
					event.target.value = '';

					// Check if aborted
					if (abortController.signal.aborted) {
						console.log('Upload was cancelled');
						return;
					}

					// Pass to parent component
					add3dModel(file, {
						name: file.name,
						size: file.size,
						type: file.type
					});
				}, 300);
			};

			// Read the file (this triggers the progress events)
			reader.readAsArrayBuffer(file);
		}
	}

	// Cancel the current upload
	function cancelUpload() {
		if (abortController) {
			abortController.abort();
			abortController = null;
		}
		resetUploadState();
	}

	// Disable UI elements during processing
	function disableUI() {
		document.getElementById('add-item-btn')?.setAttribute('disabled', 'true');
		document.getElementById('render-btn')?.setAttribute('disabled', 'true');
		document.getElementById('prompt-input')?.setAttribute('disabled', 'true');
		document.getElementById('toggleButton')?.setAttribute('disabled', 'true');
	}

	// Enable UI elements after processing
	function enableUI() {
		document.getElementById('add-item-btn')?.removeAttribute('disabled');
		document.getElementById('render-btn')?.removeAttribute('disabled');
		document.getElementById('prompt-input')?.removeAttribute('disabled');
		document.getElementById('toggleButton')?.removeAttribute('disabled');
	}

	function changeBGratio(e) {
		let ratio = e.target.id;
		switch (ratio) {
			case 'FIT':
				currentBGratio = 'FIT';
				//current BG width, height
				if (currentBG) {
					let img = new Image();
					img.src = currentBG;
					img.onload = function () {
						let ratio = img.height / img.width;
						if (ratio === 1) {
							currentBGratio = 'FIT 1:1';
							fluxPrompt.aspect_ratio = '1:1';
						} else if (ratio > 1) {
							//세로
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

	function handleBGImport(event) {
		const file = event.target.files[0];

		if (file) {
			console.log('Background image selected:', file);

			// Check if file is an image
			if (!file.type.startsWith('image/')) {
				console.error('Selected file is not an image');
				return;
			}

			// Revoke previous object URL if it exists to prevent memory leaks
			if (currentBG && currentBG.startsWith('blob:')) {
				URL.revokeObjectURL(currentBG);
			}

			// Create a URL for the selected image file
			const imageUrl = URL.createObjectURL(file);

			// Update state
			isBG = true;
			currentBG = imageUrl;

			// Update thumbnail immediately
			setTimeout(() => {
				changeBGThumbnail(currentBG);
			}, 0);

			// Send to parent component for scene update
			BGimport(file);
		}
	}

	function changeBGThumbnail(currentBG) {
		const thumbnailImg = document.querySelector('.bg-preview-thumbnail img');

		if (thumbnailImg) {
			thumbnailImg.src = currentBG;

			// Optional: Free memory when the image is no longer needed
			thumbnailImg.onload = () => {
				// console.log(thumbnailImg.width, thumbnailImg.height);
				// let ratio = thumbnailImg.height / thumbnailImg.width;
				// if (ratio === 1) {
				// 	currentBGratio = 'FIT 1:1';
				// 	fluxPrompt.aspect_ratio = '1:1';
				// } else if (ratio > 1) {
				// 	//세로
				// 	currentBGratio = `FIT 1:${ratio.toFixed(2)}`;
				// 	fluxPrompt.aspect_ratio = `1:${ratio.toFixed(2)}`;
				// } else if (ratio < 1) {
				// 	currentBGratio = `FIT ${ratio.toFixed(2)}:1`;
				// 	fluxPrompt.aspect_ratio = `${ratio.toFixed(2)}:1`;
				// }
				// We can revoke the object URL after the image has loaded to free memory
				// URL.revokeObjectURL(imageUrl);
				// Note: Keep commented unless you're handling cleanup elsewhere
				// let newRatio = convert32ratio(thumbnailImg.width, thumbnailImg.height)
				// fluxPrompt.width = newRatio.width;
				// 				fluxPrompt.height = newRatio.height;
				// 				console.log('currentBG width, height:', fluxPrompt.width, fluxPrompt.height);
			};
			// currentBGratio = 'FIT';
		} else {
			console.error('Thumbnail image element not found');
		}
	}

	function convert32ratio(width, height) {
		// Calculate original aspect ratio
		const aspectRatio = width / height;

		// Calculate multiples of 32 that are closest to original dimensions
		// Strategy 1: round width to multiple of 32, adjust height
		let newWidth1 = Math.round(width / 32) * 32;
		let newHeight1 = Math.round(newWidth1 / aspectRatio / 32) * 32;

		// Strategy 2: round height to multiple of 32, adjust width
		let newHeight2 = Math.round(height / 32) * 32;
		let newWidth2 = Math.round((newHeight2 * aspectRatio) / 32) * 32;

		// Ensure at least one dimension is 768 or larger
		const minSize = 768;

		// Scale up dimensions if needed for Strategy 1
		if (newWidth1 < minSize && newHeight1 < minSize) {
			const scale = Math.ceil(minSize / Math.max(newWidth1, newHeight1));
			newWidth1 = Math.round((newWidth1 * scale) / 32) * 32;
			newHeight1 = Math.round((newHeight1 * scale) / 32) * 32;
		}

		// Scale up dimensions if needed for Strategy 2
		if (newWidth2 < minSize && newHeight2 < minSize) {
			const scale = Math.ceil(minSize / Math.max(newWidth2, newHeight2));
			newWidth2 = Math.round((newWidth2 * scale) / 32) * 32;
			newHeight2 = Math.round((newHeight2 * scale) / 32) * 32;
		}

		// Calculate how much each result deviates from the original aspect ratio
		const ratio1 = newWidth1 / newHeight1;
		const ratio2 = newWidth2 / newHeight2;

		const error1 = Math.abs(ratio1 - aspectRatio);
		const error2 = Math.abs(ratio2 - aspectRatio);

		// Choose the strategy that preserves the aspect ratio better
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

	function removeBG() {
		if (currentBG === '' || !isBG) {
			return;
		}
		console.log('removeBG');

		isBG = false;
		currentBG = '';

		// Let the parent component know the background is removed
		BGimport(null);
	}

	function downloadBG() {
		if (currentBG === '' || !isBG) {
			return;
		}

		//getcurrenttime
		const now = new Date();
		const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0];

		// Create a download link
		const link = document.createElement('a');
		link.href = currentBG;
		link.download = 'otr-ai-gen-' + `${timestamp}.` + (currentBG.includes('.jpg') ? 'jpg' : 'png');
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	function render() {
		console.log('Rendering...');
		pathTracingRender(true); // 경로 추적 모드로 전환
	}

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

	onMount(() => {
		return () => {
			clearPollingTimers();
			cleanupImageCache();

			// Clean up any blob URLs
			if (currentBG && currentBG.startsWith('blob:')) {
				URL.revokeObjectURL(currentBG);
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
		<div class="logo-wrapper">logo section</div>
		<div class="function-wrapper">
			<div class="tool-menus">
				<input
					type="file"
					id="glb-import"
					accept=".glb,.gltf"
					style="display: none;"
					oninput={addModel}
				/>
				<div id="3d-add-set" class="toolbtn upload-btn" onclick={menuToggle}>
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

				<div id="bg-set" class="toolbtn BG" onclick={menuToggle}>
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
				</div>
			</div>

			<div class="prompt-input-wrapper">
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

<!-- 생성된 이미지 미리보기 (옵션) -->
<!-- Generated image preview - updated condition to show preview whenever 
     there's a generated image and we're not currently generating -->
{#if cachedImageUrl && !isGenerating && onPreview}
	<div class="generated-image-preview-backdrop"></div>
	<div class="generated-image-preview" transition:fade>
		<img src={cachedImageUrl} alt="Generated image" />
		<div class="image-actions">
			<button
				class="main-action-btn"
				onclick={() => {
					// Set as background using the cached image
					if (cachedImageBlob) {
						// Create a new file from the cached blob
						const file = new File([cachedImageBlob], 'generated-image.png', {
							type: cachedImageBlob.type || 'image/png'
						});

						// Update local state
						isBG = true;
						currentBG = cachedImageUrl;

						// Send to parent component for scene update
						BGimport(file);

						// Close the preview
						onPreview = false;
					} else {
						// Fallback in case the blob isn't available (shouldn't happen)
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
						// Create and trigger download directly from the cached blob
						const now = new Date();
						const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0];
						const link = document.createElement('a');
						link.href = cachedImageUrl;
						link.download =
							'otr-ai-gen-' + `${timestamp}.` + (cachedImageUrl.includes('.jpg') ? 'jpg' : 'png');
						document.body.appendChild(link);
						link.click();
						document.body.removeChild(link);
					} else {
						// Fallback in case the blob isn't available (shouldn't happen)
						generationError = 'Image data not available. Please try again.';
					}
				}}
			>
				<Icon class="preview-action-btn-icon" icon="material-symbols:download" />
			</button>

			<button
				class="preview-action-btn"
				onclick={() => {
					// Just close the preview - keep the cached image in memory
					// in case the user wants to reopen it
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
		padding: 8px;
		box-sizing: border-box;
		display: flex;
		justify-self: center;
		align-items: center;

		width: 110px;
		height: 100%;
		border-right: 1px solid var(--dim-color);
	}

	.function-wrapper {
		height: 110px;
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
		justify-content: space-between;
		align-items: center;
		padding: 10px 0;
	}

	.tool-menus > div.toolbtn {
		display: flex;
		justify-content: center;
		align-items: center;
		text-align: center;
		flex-grow: 1;
		border: none;
		border-right: 1px solid var(--dim-color);
		font-weight: 500;
		font-size: 1.1rem;
		background: none;
		outline: none;
		height: 100%;
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
		height: 24px; /* 고정 높이 지정 */
		width: 24px; /* 고정 너비 지정 */
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
		width: 100%;
		height: 50%;
		padding: 8px;
		box-sizing: border-box;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		border-top: 1px solid var(--dim-color);
	}

	#prompt-input {
		box-sizing: border-box;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 10px 20px;
		border: none;
		font-size: 1.1rem;
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
		border: none;
		border-radius: 8px;

		width: 42px;
		height: 42px;
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
		background-color: #18272e;
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
		background-color: #4caf50;
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
		transition: all ease-in-out 0.5s;
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
		background-color: #4caf50;
		transition: width 0.3s ease;
	}

	.indeterminate {
		position: relative;
		width: 50% !important;
		animation: indeterminate 1.5s infinite ease-in-out;
	}

	.active-generation {
		background-color: #4caf50; /* Green color for active generation */
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
</style>
