<!-- PROMPT.svelte -->

<script>
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import { slide } from 'svelte/transition';

	// Props from parent
	let {
		add3dModel,
		pathTracingRender = (state) => console.log(`render: ${state}`),
		viewportLoading,
		uploadError
	} = $props();

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

	// Toggle the add menu
	function toggleAddMenu() {
		if (isBusy) return; // Prevent opening menu when busy
		addMenuOpen = !addMenuOpen;
	}

	function menuToggle(e) {
		if (activeMenu !== null && activeMenu === e.target.id) {
			//같은 메뉴 토글
			activeMenu = null;
		} else if (activeMenu !== e.target.id) {
			activeMenu = e.target.id;
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
				<button id="image-ratio-set" class="toolbtn image-ratio" onclick={menuToggle}>
					3:4 PNG

					{#if activeMenu === 'image-ratio-set'}
						<div class="add-item-list" transition:slide>
							<button> image </button>
						</div>
					{/if}
				</button>
				<button id="3d-add-set" class="toolbtn upload-btn" onclick={menuToggle}>
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
				</button>

				<button id="bg-set" class="toolbtn BG" onclick={menuToggle}>
					{#if activeMenu === 'bg-set'}
						<div class="add-item-list" transition:slide>
							<button id="bg-upload-btn"> BG-upload </button>
						</div>
					{/if}
					<Icon class="tool-icon" icon="material-symbols:landscape-2-outline-rounded" /></button
				>
				<button id="camera-set" class="toolbtn camera" onclick={menuToggle}>
					{#if activeMenu === 'camera-set'}
						<div class="add-item-list" transition:slide>
							<button id="bg-upload-btn"> Perspective </button>
						</div>
					{/if}
					<Icon class="tool-icon" icon="clarity:video-camera-line" /></button
				>
				<button onclick={menuToggle} id="light-set" class="toolbtn light">
					{#if activeMenu === 'light-set'}
						<div class="add-item-list" transition:slide>
							<button id="bg-upload-btn"> keylight </button>
						</div>
					{/if}
					<Icon class="tool-icon" icon="pajamas:bulb" /></button
				>
			</div>

			<div class="prompt-input-wrapper">
				<input type="text" id="prompt-input" placeholder="Enter prompt" disabled={isBusy} />
				<button class="go-btn">
					<Icon icon="jam:arrow-up" width="24" height="24" />
				</button>
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
	.main-ui-wrapper {
		box-sizing: border-box;
		position: absolute;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		min-width: 100px;
		width: 100%;
		max-width: 600px;
		background-color: var(--primary-color);
		left: 50%;
		bottom: 0;
		transform: translateX(-50%);
		height: 110px;

		margin-bottom: 16px;
		margin: 0 auto;
		z-index: 999;
		border: 1px solid var(--dim-color);
		border-radius: 12px;
		color: var(--text-color-bright);
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

	.tool-menus > button {
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
	}

	.tool-menus > button:hover {
		color: var(--text-color-bright);
		cursor: pointer;
	}

	.tool-menus > button:last-child {
		border-right: none;
	}

	div :global(.tool-icon) {
		box-sizing: border-box;
		height: 100%;
		width: auto;
		padding: 6px;
		pointer-events: none;
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
		box-sizing: border-box;

		border: none;
		border-radius: 8px;
		padding: 4px;
		background-color: var(--highlight-color);
		color: var(--text-color-standard);
		margin-left: 8px;
		transition: all ease-in-out 300ms;
	}

	.go-btn:hover {
		background-color: var(--hover-color);
		cursor: pointer;
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

	.main {
		box-sizing: border-box;
		position: absolute;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		min-width: 100px;
		width: 100%;
		max-width: 800px;
		gap: 10px;
		left: 50%;
		bottom: 0;
		transform: translateX(-50%);

		padding-left: 20px;
		padding-right: 20px;
		margin-bottom: 32px;
		z-index: 999;
	}

	section {
		position: relative;
		box-sizing: border-box;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		height: 100%;
	}

	#prompt-section {
		box-sizing: border-box;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		gap: 10px;
		min-width: 200px;
		width: 100%;
		max-width: 800px;
	}

	#render-btn {
		box-sizing: border-box;
		padding: 10px 20px;
		background-color: #18272e;
		color: white;
		border: none;
		border-radius: 50px;
		cursor: pointer;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 6px;
	}

	.toggle-container {
		box-sizing: border-box;
	}

	.toggle {
		position: relative;
		display: inline-block;
		width: 60px;
		height: 34px;
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
		background-color: #ccc;
		transition: 0.4s;
		border-radius: 34px;
	}

	.slider:before {
		position: absolute;
		content: '';
		height: 26px;
		width: 26px;
		left: 4px;
		bottom: 4px;
		background-color: white;
		transition: 0.4s;
		border-radius: 50%;
	}

	input:checked + .slider {
		background-color: #18272e;
	}

	input:focus + .slider {
		box-shadow: 0 0 1px #18272e;
	}

	input:checked + .slider:before {
		transform: translateX(26px);
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
		font-size: 1rem;
		background-color: var(--primary-color);
		color: var(--dim-color);
		transition: all ease-in-out 300ms;
	}

	.add-item-list button:first-child {
		border-bottom: 1px solid var(--dim-color);
	}

	.add-item-list button:last-child {
	}

	.add-item-list button:hover {
		cursor: pointer;
		background-color: var(--highlight-color);
		color: white;
	}
</style>
