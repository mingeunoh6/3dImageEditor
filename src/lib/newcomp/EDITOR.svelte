<!-- EDITOR.svelte -->

<script>
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import { fade, slide } from 'svelte/transition';
	import Slider from '$lib/newcomp/elements/menu-slider.svelte';
	import {
		toBase64,
		toBlobURL,
		getImageDimensions,
		revokeBlobURL,
		generateImageFilename
	} from '$lib/utils/imageUtils';

	// Props from parent
	let {
		add3dModel,
		pathTracingRender = (state) => console.log(`render: ${state}`),
		viewportLoading,
		uploadError,
		BGimport,
		BGfromURL,
		BGfromPrompt,
		sceneObjects = [],
		onObjectSelect = (id) => console.log(`Object selected: ${id}`),
		onObjectVisibilityToggle = (id) => console.log(`Toggle visibility: ${id}`),
		onObjectDelete = (id) => console.log(`Delete object: ${id}`),
		onChangeFOV,
		onChangeLight,
		onChangeEnvSetting
	} = $props();

	// BGfromPrompt가 변경되면 현재 백그라운드 업데이트
	$effect(() => {
		updateBG(BGfromPrompt);
	});

	// 백그라운드 업데이트 함수
	function updateBG(image) {
		if (image) {
			currentBG = image;
			isBG = true;
		}
	}

	// 업로드 상태
	let isUploading = $state(false);
	let uploadProgress = $state(0);
	let uploadStage = $state('idle'); // idle, reading, validating, processing
	let fileValidationError = $state(null);

	// 메뉴 상태
	let activeMenu = $state(null);

	// 렌더 옵션 상태
	let isRenderOpt = $state(false);

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
	let bgRotation = $state(180);
	let bgBrightness = $state(1);

	let fov = $state(60);
	let keylightBrightness = $state(1);
	let keylightColor = $state('#ffffff');
	let rimlightBrightness = $state(0.5);
	let rimlightColor = $state('#ffffff');
	let filllightBrightness = $state(0.5);
	let filllightColor = $state('#ffffff');
	let lightRotation = $state(0)

	$effect(() => {
		console.log(bgRotation);
	});

	$effect(() => {
		console.log(bgBrightness);
	});

	// 부모 컴포넌트의 로딩 상태 모니터링
	$effect(() => {
		if (viewportLoading) {
			isBusy = true;
			disableUI();
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

	// 메뉴 토글 함수
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

	//카메라
	function handleCameraFov(value) {
		fov = value;

		onChangeFOV(fov);
	}

	//조명

	function handleLightRotation(value){
		lightRotation = value
		onChangeLight('rot',lightRotation)

	}


	function handleKeyLightIntensity(value) {
		console.log(value);
		keylightBrightness = value
		onChangeLight('keyIntensity',keylightBrightness)

	}
	function handleRimLightIntensity(value) {
		console.log(value);
		rimlightBrightness = value
		onChangeLight('RimIntensity',rimlightBrightness)

	}
	function handleFillLightIntensity(value) {
		console.log(value);
		filllightBrightness = value
			onChangeLight('FillIntensity',filllightBrightness)
	}

	function handleColorChange(e) {

		const { id, value } = e.target;
		let lightId;
console.log(value)
		if (id === 'keylight-color' || id === 'keylight-color-input') {
			keylightColor = value
			lightId = 'keylight';
			onChangeLight('keyColor',keylightColor)
		} else if (id === 'filllight-color' || id === 'filllight-color-input') {
			filllightColor =value
			lightId = 'filllight';
				onChangeLight('fillColor',filllightColor)
		} else if (id === 'rimlight-color' || id === 'rimlight-color-input') {
			rimlightColor = value
			lightId = 'rimlight';
				onChangeLight('rimColor',rimlightColor)
		} 
	}




	function handleHDRIrotation(rot){
		
		bgRotation = rot
	
		onChangeEnvSetting('rotation',bgRotation)


	}

	function handleHDRIintensity(intensity){
		bgBrightness = intensity
onChangeEnvSetting('intensity',bgBrightness)

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

	// 모델 추가 함수
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

	// 객체 선택 핸들러
	function selectObject(objectId) {
		console.log(`Selected object: ${objectId}`);
		onObjectSelect(objectId);
	}

	// 객체 삭제 핸들러
	function deleteObject(objectId) {
		console.log(`Deleted object: ${objectId}`);
		onObjectDelete(objectId);
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
	}

	// 처리 후 UI 요소 활성화
	function enableUI() {
		document.getElementById('add-item-btn')?.removeAttribute('disabled');
		document.getElementById('render-btn')?.removeAttribute('disabled');
	}

	// 배경 이미지 가져오기
	async function handleBGImport(event) {
		const file = event.target.files[0];

		if (!file) {
			return;
		}

		// 이미지 파일인지 확인
		if (!file.type.startsWith('image/')) {
			console.error('Selected file is not an image');
			fileValidationError = 'Selected file is not an image';
			event.target.value = '';
			return;
		}

		try {
			// 이전 blob URL이 있으면 해제
			if (currentBG && currentBG.startsWith('blob:')) {
				revokeBlobURL(currentBG);
			}

			// 새 이미지 URL 생성
			currentBG = await toBlobURL(file);

			// 상태 업데이트
			isBG = true;

			// 부모 컴포넌트에 씬 업데이트 요청
			BGimport(file);

			console.log('Background image loaded:', currentBG);
		} catch (error) {
			console.error('Failed to process background image:', error);
			fileValidationError = 'Failed to process image file';
			event.target.value = '';
		}
	}

	// 배경 이미지 다운로드
	async function downloadBG() {
		if (currentBG === '' || !isBG) {
			return;
		}

		try {
			// 파일명 생성
			const filename = generateImageFilename('otr-ai-bg');

			// 다운로드 링크 생성
			const link = document.createElement('a');
			link.href = currentBG;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} catch (error) {
			console.error('Failed to download background:', error);
			fileValidationError = 'Failed to download background image';
		}
	}

	// 배경 이미지 제거
	function removeBG() {
		console.log('removeBG', currentBG, isBG);
		if (currentBG === '' || !isBG) {
			return;
		}

		console.log('Removing background');

		// 이전 blob URL이 있으면 해제
		if (currentBG && currentBG.startsWith('blob:')) {
			revokeBlobURL(currentBG);
		}

		// 상태 초기화
		isBG = false;
		currentBG = '';

		// 부모 컴포넌트에 배경 제거 알림
		BGimport(null);
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

	// 컴포넌트 소멸 시 메모리 정리
	onMount(() => {
		return () => {
			// Blob URL 정리
			if (currentBG && currentBG.startsWith('blob:')) {
				revokeBlobURL(currentBG);
			}
		};
	});
</script>

<div class="main">
	<section class="main-ui-wrapper">
		<div class="function-wrapper">
			<div class="tool-menus">
				<input
					type="file"
					id="glb-import"
					accept=".glb,.gltf"
					style="display: none;"
					oninput={addModel}
				/>
				<div
					id="3d-add-set"
					class="toolbtn upload-btn"
					onclick={menuToggle}
					role="button"
					type="button"
					tabindex="0"
					aria-haspopup="true"
					aria-expanded={activeMenu === '3d-add-set'}
					title="Add 3D Model"
				>
					<Icon class="tool-icon" icon="mage:box-3d-plus" aria-hidden="true" />

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

				<div
					id="bg-set"
					class="toolbtn BG"
					onclick={menuToggle}
					role="button"
					tabindex="0"
					aria-haspopup="true"
					aria-expanded={activeMenu === 'bg-set'}
					title="Set Background"
				>
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
								{#if currentBG}
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
											onValueChange={(newValue) => handleHDRIrotation(newValue)}
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
											onValueChange={(newValue) => handleHDRIintensity(newValue)}
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
					<Icon
						class="tool-icon"
						icon="material-symbols:landscape-2-outline-rounded"
						aria-hidden="true"
					/>
				</div>
				<div
					id="camera-set"
					class="toolbtn camera"
					onclick={menuToggle}
					role="button"
					tabindex="0"
					aria-haspopup="true"
					aria-expanded={activeMenu === 'camera-set'}
					title="Set Camera"
				>
					{#if activeMenu === 'camera-set'}
						<div class="add-item-list" transition:slide>
							<button id="perspective-btn"> Perspective </button>
							<div class="slider-setting-group" transition:fade>
								<Slider
									value={fov}
									min={10}
									max={120}
									scale={1}
									name="FOV"
									unit="°"
									onValueChange={(newValue) => handleCameraFov(newValue)}
								/>
							</div>
						</div>
					{/if}
					<Icon class="tool-icon" icon="clarity:video-camera-line" aria-hidden="true" />
				</div>
				<div
					onclick={menuToggle}
					id="light-set"
					class="toolbtn light"
					role="button"
					tabindex="0"
					aria-haspopup="true"
					aria-expanded={activeMenu === 'light-set'}
					title="Set Light"
				>
					{#if activeMenu === 'light-set'}
						<div class="add-item-list" transition:slide>
								<div class="slider-setting-group light-slider" transition:fade>
								<Slider
									value={lightRotation}
									min={0}
									max={360}
									scale={0.1}
									name="Lights rotation"
									unit="°"
									onValueChange={(newValue) => handleLightRotation(newValue)}
								/>
							
							</div>
							<div class="slider-setting-group light-slider" transition:fade>
								<Slider
									value={keylightBrightness}
									min={0}
									max={5}
									scale={0.1}
									name="Key light"
									unit=""
									onValueChange={(newValue) => handleKeyLightIntensity(newValue)}
								/>
								<div class="slider-sub-option">
									<input
										class="colorPicker"
										type="color"
										id="keylight-color"
										name="keylight-color"
										value={keylightColor}
										oninput={(e) =>{ handleColorChange(e)}}
										onclick={(e)=>e.stopPropagation()}
									/>
								</div>
							</div>
							
								<div class="slider-setting-group light-slider" transition:fade>
								<Slider
									value={filllightBrightness}
									min={0}
									max={5}
									scale={0.1}
									name="Fill light"
									unit=""
									onValueChange={(newValue) => handleFillLightIntensity(newValue)}
								/>
								<div class="slider-sub-option">
									<input
										class="colorPicker"
										type="color"
										id="filllight-color"
										name="filllight-color"
										value={filllightColor}
										oninput={(e) =>{ handleColorChange(e)}}
										onclick={(e)=>e.stopPropagation()}
									/>
								</div>
							</div>
							
								<div class="slider-setting-group light-slider" transition:fade>
								<Slider
									value={rimlightBrightness}
									min={0}
									max={5}
									scale={0.1}
									name="Rim light"
									unit=""
									onValueChange={(newValue) => handleRimLightIntensity(newValue)}
								/>
								<div class="slider-sub-option">
									<input
										class="colorPicker"
										type="color"
										id="rimlight-color"
										name="rimlight-color"
										value={rimlightColor}
										oninput={(e) =>{ handleColorChange(e)}}
										onclick={(e)=>e.stopPropagation()}
									/>
								</div>
							</div>
						</div>
					{/if}
					<Icon class="tool-icon" icon="pajamas:bulb" aria-hidden="true" />
				</div>
				<div
					id="scene-list"
					class="toolbtn upload-btn"
					onclick={menuToggle}
					role="button"
					tabindex="0"
					aria-haspopup="true"
					aria-expanded={activeMenu === 'scene-list'}
					title="Scene Objects"
				>
					<Icon class="tool-icon" icon="foundation:list" aria-hidden="true" />

					{#if activeMenu === 'scene-list'}
						<div class="scene-list-panel" transition:slide>
							<div class="scene-list-header">Scene Objects</div>
							<div class="scene-list-content">
								{#if sceneObjects.length === 0}
									<div class="empty-list">
										<p>No objects in scene</p>
									</div>
								{:else}
									<ul class="scene-object-list">
										{#each sceneObjects as object (object.id)}
											<li class="object-item" onclick={() => selectObject(object.id)}>
												<div class="object-icon">
													{#if object.type === 'gltf'}
														<Icon icon="file-icons:3d" />
													{:else if object.type === 'light'}
														<Icon icon="heroicons-solid:light-bulb" />
													{:else}
														<Icon icon="bi:box" />
													{/if}
												</div>
												<div class="object-info">
													<span class="object-name">{object.name}</span>
												</div>
												<div class="object-actions">
													<button
														class="object-actions-button"
														title="Hide/Show"
														onclick={(e) => {
															e.stopPropagation();
															e.stopPropagation()
															onObjectVisibilityToggle(object.id);
														}}
													>
														<Icon
															icon={object.visible ? 'carbon:view' : 'carbon:view-off'}
															width="16"
															height="16"
														/>
													</button>
													<button
														class="object-actions-button"
														title="Delete"
														onclick={(e) => {
															e.stopPropagation();
															deleteObject(object.id);
														}}
													>
														<Icon icon="carbon:trash-can" width="16" height="16" />
													</button>
												</div>
											</li>
										{/each}
									</ul>
								{/if}
							</div>
						</div>
					{/if}
				</div>
				<!-- <div 
					id="render-set" 
					class="toolbtn render" 
					onclick={render}
					role="button"
					tabindex="0"
					aria-label="Render scene"
                    title="Render Scene"
				>
					<Icon class="tool-icon" icon="carbon:render" aria-hidden="true" />
				</div> -->
			</div>
		</div>
	</section>
</div>

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
				<button class="cancel-btn" onclick={cancelUpload} aria-label="Cancel upload">
					<Icon icon="carbon:close" width="16" height="16" aria-hidden="true" />
				</button>
			{/if}
		</div>
	</div>
{/if}

<!-- File validation error message -->
{#if fileValidationError}
	<div class="error-toast" transition:slide>
		<p>{fileValidationError}</p>
		<button onclick={() => (fileValidationError = null)} aria-label="Close error message">
			<Icon icon="carbon:close" width="16" height="16" aria-hidden="true" />
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

	.function-wrapper {
		height: 48px;
		flex-grow: 1;
		display: flex;
		flex-direction: column;
	}

	.tool-menus {
		box-sizing: border-box;
		height: 100%;
		width: 100%;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		padding: 10px 0;
	}

	.tool-menus > div.toolbtn {
		display: flex;
		justify-content: center;
		align-items: center;
		text-align: center;
		position: relative;
		border: none;
		border-right: 1px solid var(--dim-color);
		font-weight: 500;
		font-size: 1rem;
		background: none;
		outline: none;
		height: 100%;
		width: 60px;
		color: var(--dim-color);
		transition: all ease-in-out 300ms;
		cursor: pointer;
	}

	.tool-menus > div.toolbtn:hover {
		color: var(--text-color-bright);
	}

	.tool-menus > div.toolbtn:last-child {
		border-right: none;
	}

	div :global(.tool-icon) {
		box-sizing: border-box;
		height: 24px;
		width: 24px;
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
		display: flex;
		justify-content: center;
		align-self: center;
		position: relative;
		width: 100%;
		height: 42px;
	}

	.slider-sub-option {
		display: flex;
		justify-content: center;
		align-self: center;
		border-left: 1px solid var(--dim-color);
	}

	.upload-container {
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
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		margin-bottom: -10px;
		overflow: hidden;
		transition: all ease-in-out 0.5s;
		min-width: 150px;
		background-color: var(--primary-color);
		border-radius: 12px;
		border: 1px solid var(--dim-color);
		z-index: 990;
	}

	.add-item-list button {
		box-sizing: border-box;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		padding: 12px 16px;
		text-align: center;
		width: 100%;
		white-space: nowrap;
		border-radius: 0;
		font-size: 0.9rem;
		background-color: var(--primary-color);
		color: var(--dim-color);
		transition: all ease-in-out 300ms;
	}

	.add-item-list button:not(:last-child) {
		border-bottom: 1px solid var(--dim-color);
	}

	.add-item-list button:hover {
		cursor: pointer;
		background-color: var(--highlight-color);
		color: white;
	}

	.scene-list-panel {
		box-sizing: border-box;
		position: absolute;
		top: 100%;
		right: 0;

		display: flex;
		flex-direction: column;
		margin-bottom: -10px;
		overflow: hidden;
		transition: all ease-in-out 0.5s;
		min-width: 250px;
		background-color: var(--primary-color);
		border-radius: 12px;
		border: 1px solid var(--dim-color);
		z-index: 990;
	}

	.scene-list-header {
		font-size: 0.9rem;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 12px 16px;
		border-bottom: 1px solid var(--dim-color);
	}

	.scene-object-list {
		font-size: 0.9rem;
		list-style: none;
		margin: 0;
		padding: 0;
		overflow-y: auto;
		max-height: 300px;
		-ms-overflow-style: none; /* IE and Edge */
		scrollbar-width: none; /* Firefox */
	}

	.scene-object-list::-webkit-scrollbar {
		display: none;
	}

	.scene-object-list .object-item {
		border-bottom: 1px solid var(--dim-color);
	}

	.scene-object-list .object-item:last-child {
		border-bottom: none;
	}

	.empty-list {
		padding: 24px 16px;
		text-align: center;
		font-size: 0.9rem;
	}

	.empty-list p {
		color: var(--dim-color);
		font-size: 0.9rem;
	}

	.object-item {
		display: flex;
		align-items: center;
		height: 40px;
		padding: 2px 8px;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.object-item:hover {
		background-color: rgba(255, 255, 255, 0.05);
	}

	.object-icon {
		margin-right: 10px;
		margin-left: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--dim-color);
	}

	.object-info {
		flex: 1;
		display: flex;
		flex-direction: row;
		justify-content: flex-start;
		align-items: center;
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.object-name {
		display: flex;
		align-items: center;
		height: 100%;
		color: var(--text-color-standard);
		font-size: 0.8rem;
	}

	.object-actions {
		display: flex;
		flex-direction: row;
		gap: 4px;
		margin-left: 8px;
	}

	.object-actions-button {
		background: none;
		border: none;
		color: var(--dim-color);
		cursor: pointer;
		padding: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.object-actions-button:hover {
		color: var(--text-color-bright);
		background-color: rgba(255, 255, 255, 0.1);
	}

	.light-slider{
		width: 200px;
		border-bottom: 1px solid var(--dim-color);
	}

	.colorPicker {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: none;

border-radius: 50px;
  cursor: pointer;
  padding: 0;
  margin: 10px;
}

/* Hide the default color swatch in WebKit/Blink browsers */
.colorPicker::-webkit-color-swatch-wrapper {
  padding: 0;
border: none;
  overflow: hidden;
}

.colorPicker::-webkit-color-swatch {
  border: none;
 padding: 0;
}


/* Hide the default color swatch in Firefox */
.colorPicker::-moz-color-swatch-wrapper {
  padding: 0;
}

.colorPicker::-moz-color-swatch {
  border: none;

}

.colorPicker:focus {
  outline: none;
   padding: 0;
 
}
</style>
