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
		BGfromURL,
		BGfromPrompt,
		sceneObjects = [],
		onObjectSelect = (id) => console.log(`Object selected: ${id}`),
		onObjectVisibilityToggle = (id) => console.log(`Toggle visibility: ${id}`),
		onObjectDelete = (id) => console.log(`Delete object: ${id}`)
	} = $props();

	$effect(() => {
		updateBG(BGfromPrompt);
	});

	function updateBG(image) {
		currentBG = image;
        isBG = true;
	}

	// Upload states
	let isUploading = $state(false);
	let uploadProgress = $state(0);
	let uploadStage = $state('idle'); // idle, reading, validating, processing
	let fileValidationError = $state(null);

	// Menu state
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
	let bgRotation = $state(180);
	$effect(() => {
		console.log(bgRotation);
	});

	let bgBrightness = $state(1);
	$effect(() => {
		console.log(bgBrightness);
	});

	// Monitor loading state from parent to update UI
	$effect(() => {
		if (viewportLoading) {
			isBusy = true;
			disableUI();
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

	// Handle object selection
	function selectObject(objectId) {
		// Here you would dispatch an event or call a function to select this object in the scene
		console.log(`Selected object: ${objectId}`);
		onObjectSelect(objectId);
		// For now we'll just log it, but this would connect to your viewport's selection mechanism
	}

	function deleteObject(objectId) {
		// Here you would dispatch an event or call a function to delete this object from the scene
		console.log(`Deleted object: ${objectId}`);
		onObjectDelete(objectId);
		// For now we'll just log it, but this would connect to your viewport's deletion mechanism
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
	}

	// Enable UI elements after processing
	function enableUI() {
		document.getElementById('add-item-btn')?.removeAttribute('disabled');
		document.getElementById('render-btn')?.removeAttribute('disabled');
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
			// setTimeout(() => {
			// 	changeBGThumbnail(currentBG);
			// }, 0);

			// Send to parent component for scene update
			BGimport(file);
		}
	}

	// function changeBGThumbnail(currentBG) {
	//      isBG = true;
	// 	const thumbnailImg = document.querySelector('.bg-preview-thumbnail img');

	// 	if (thumbnailImg) {
	// 		thumbnailImg.src = currentBG;
	// 	} else {
	// 		console.error('Thumbnail image element not found');
	// 	}
	// }
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
	function removeBG() {
        console.log('removeBG', currentBG, isBG);
		if (currentBG === '' || !isBG) {
			return;
		}
		console.log('removeBG');

		isBG = false;
		currentBG = '';

		// Let the parent component know the background is removed
		BGimport(null);
	}

	function render() {
		console.log('Rendering...');
		pathTracingRender(true); // Path tracing mode
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
			// Clean up any blob URLs
			if (currentBG && currentBG.startsWith('blob:')) {
				URL.revokeObjectURL(currentBG);
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
							<button id="orthographic-btn"> Orthographic </button>
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
							<button id="keylight-btn"> Key Light </button>
							<button id="filllight-btn"> Fill Light </button>
							<button id="rimlight-btn"> Rim Light </button>
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
							<div class="scene-list-header">
								Scene Objects
							</div>
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
													<button class="object-actions-button" title="Hide/Show">
														<Icon icon="carbon:view" width="16" height="16" />
													</button>
													<button
														class="object-actions-button"
														title="Delete"
														onclick={() => deleteObject(object.id)}
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
		position: relative;
		width: 100%;
		height: 42px;
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

    .scene-list-panel{
       box-sizing: border-box;
		position: absolute;
		top: 100%;
		right: 0;
		
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

    .scene-list-header{
        font-size: 0.9rem;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid var(--dim-color);
    }

.scene-object-list{
    font-size: 0.9rem;
    list-style: none;
    margin: 0;
    padding: 0;
       overflow-y: scroll;
        max-height: 300px;
          -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

.scene-object-list::-webkit-scrollbar {
   display: none;
    
   
}


.scene-object-list .object-item{
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

     .empty-list p{
     color:var(--dim-color);
         font-size: 0.9rem;
    }

   
    

    .object-item {
     
       display: flex;
        align-items: center;
height: 28px;
        padding: 2px 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
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
    gap: 2px; 
    margin-left:8px;
}

   .object-actions-button{
    background: none;
    color: var(--dim-color);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
 
}

    .object-actions-button:hover{
    color: var(--text-color-bright);
  
}
</style>
