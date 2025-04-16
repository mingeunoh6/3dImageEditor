<script>
	import { onMount, onDestroy } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import Icon from '@iconify/svelte';
	import Dropdown from '$lib/newcomp/elements/menu-dropdown.svelte';
	import ToggleBtn from '$lib/newcomp/elements/menu-toggle-btn.svelte';
    import {
		toBase64,
		toBlobURL,
		revokeBlobURL,
		compressAndConvertToBase64,
		formatFileSize,
		getBase64FileSize,
		getDimensionsFromRatio,
		generateImageFilename,
		matchDimension,
        checkAndCompressImage  
	} from '$lib/utils/imageUtils';

	let { close3Dgen } = $props();

	let images = $state(null);
	let prompt = $state('the wooden chair');
	let condition_mode = $state('concat');
	let seed = $state(930331);
	let geometry_file_format = $state('glb');
	let material = $state('PBR');
	let quality = $state('medium');
	let tier = $state('Regular');
	
    let pollingInterval = $state(null);
	let pollingTimeout = $state(null);
	let isGenerating = $state(false);
	let isProcessing = $state(false);
	let isPending = $state(false);
	let errorMessage = $state('');

	let trainItems = $state({ image: null, file: null });
	let generationUUID = $state(null);
	let subscriptionKey = $state(null);
	let generationStatus = $state('Waiting');
	let modelDownloadUrl = $state('');
	let modelName = $state('');
    let progressPercentage = $state(0);

	function offPanel() {
		close3Dgen();
	}

	// Function to handle file upload
	function handleFileUpload(event) {
		const files = event.target.files;

		if (!files || files.length === 0) return;

		// Single file upload - update both image and caption
		trainItems.image = URL.createObjectURL(files[0]);
		trainItems.file = files[0]; // Store the actual file
	}

    function onchangePrompt(e) {
        prompt = e.target.value;
    }

    function deleteImage() {
        if(trainItems.image) {
            URL.revokeObjectURL(trainItems.image);
            trainItems.image = null;
            trainItems.file = null;
        }
    }

    function runImageGen() {
        // This function could be used for image generation if needed
    }

    async function run3Dgen() {
        if (!trainItems.file && !trainItems.image) {
            errorMessage = "Please upload an image first";
            return;
        }

        try {
            isGenerating = true;
            errorMessage = '';
            generationUUID = null;
            subscriptionKey = null;
            generationStatus = 'Waiting';
            modelDownloadUrl = '';
            modelName = '';
            progressPercentage = 0;
            
            console.log('3D generation starting');
            
            // Generate random seed between 0 and 999999
            seed = Math.floor(Math.random() * 1000000);
            
            // Create FormData object
            const formData = new FormData();
            
            // Handle the image file
            if (trainItems.file) {
                // Use the original file directly
                formData.append('images', trainItems.file);
                console.log('Using original file for upload');
            } else if (trainItems.image) {
                // Convert blob URL back to file
                try {
                    const response = await fetch(trainItems.image);
                    const blob = await response.blob();
                    formData.append('images', blob, 'image.jpg');
                    console.log('Converted blob URL to file for upload');
                } catch (err) {
                    console.error('Error converting blob URL:', err);
                    throw new Error('Failed to process the image');
                }
            }
            
            // Add other parameters
            formData.append('prompt', prompt);
            formData.append('condition_mode', condition_mode);
            formData.append('seed', seed.toString());
            formData.append('geometry_file_format', geometry_file_format);
            formData.append('material', material);
            formData.append('quality', quality);
            formData.append('tier', tier);
            
            console.log('Sending request to server with parameters:', {
                prompt,
                condition_mode,
                seed,
                geometry_file_format,
                material,
                quality,
                tier
            });
            
            // Make request to your server endpoint
            const response = await fetch('/api/3dgen', {
                method: 'POST',
                body: formData
            });
            
            console.log('Server response status:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.msg || 'Failed to generate 3D model');
            }
            
            const data = await response.json();
            console.log('Generation response:', data);
            
            if (data.error) {
                throw new Error(data.error.msg || 'Error in 3D generation');
            }
            
            // Store the UUID and subscription_key
            generationUUID = data.uuid;
            subscriptionKey = data.jobs?.subscription_key;
            
            console.log('3D generation submitted successfully, UUID:', generationUUID);
            console.log('Subscription key:', subscriptionKey);
            
            if (!subscriptionKey) {
                throw new Error('No subscription key received for polling');
            }
            
            // Start status checking
            startPolling();
            
        } catch (error) {
            console.error('3D generation error:', error);
            errorMessage = error.message || 'Failed to generate 3D model';
            isGenerating = false;
        }
    }

    function startPolling() {
        if (!subscriptionKey) {
            errorMessage = 'Invalid polling subscription key';
            isGenerating = false;
            return;
        }
        
        console.log('Starting polling with subscription key:', subscriptionKey);
        
        // Clear any existing intervals
        clearPollingTimers();
        
        // Set polling interval to check status every 3 seconds
        pollingInterval = setInterval(async() => {
            try {
                const proxyPollingUrl = `/api/3dgen?subscriptionKey=${subscriptionKey}`;
                const response = await fetch(proxyPollingUrl);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Polling failed:', errorText);
                    throw new Error(`Polling failed: ${errorText}`);
                }
                
                const data = await response.json();
                console.log('3D polling data:', data);
                
                // Process the response to find job status
                if (data.jobs && Array.isArray(data.jobs)) {
                    // Find any failed job
                    const failedJob = data.jobs.find(job => job.status === 'Failed');
                    if (failedJob) {
                        console.log('3D generation failed', failedJob);
                        errorMessage = 'Generation failed: One or more jobs failed';
                        isGenerating = false;
                        clearPollingTimers();
                        return;
                    }
                    
                    // Check if all jobs are done
                    const allJobsDone = data.jobs.every(job => job.status === 'Done');
                    if (allJobsDone) {
                        console.log('All 3D generation jobs completed');
                        generationStatus = 'Done';
                        
                        // Get the job UUID from first job
                        if (data.jobs.length > 0) {
                           
                            await completeGeneration(generationUUID);
                        }
                        
                        isGenerating = false;
                        clearPollingTimers();
                        return;
                    }
                    
                    // Calculate progress
                    const totalJobs = data.jobs.length;
                    const doneJobs = data.jobs.filter(job => job.status === 'Done').length;
                    const processingJobs = data.jobs.filter(job => job.status === 'Generating').length;
                    
                    // Update status based on job count
                    if (processingJobs > 0) {
                        generationStatus = 'Generating';
                    } else {
                        generationStatus = 'Waiting';
                    }
                    
                    // Calculate approximate progress percentage
                    progressPercentage = Math.floor((doneJobs / totalJobs) * 100);
                }
            } catch (error) {
                console.error('Polling error:', error);
                errorMessage = error.message || 'Error during status polling';
                isGenerating = false;
                clearPollingTimers();
            }
        }, 3000);
        
        // Set a timeout to stop polling after 20 minutes (prevent indefinite polling)
        pollingTimeout = setTimeout(() => {
            console.log('Polling timeout reached');
            errorMessage = 'Generation taking too long, please try again later';
            isGenerating = false;
            clearPollingTimers();
        }, 20 * 60 * 1000);
    }
    
    async function completeGeneration(uuid) {
        try {
            console.log('Fetching download info for UUID:', uuid);
            const downloadUrl = `/api/3dgen?uuid=${uuid}`;
            
            const response = await fetch(downloadUrl);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch download info: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Download data:', data);
            
            // Handle the response format from the Rodin Download API
            if (data.list && Array.isArray(data.list) && data.list.length > 0) {
                // This is the expected format according to the documentation
                const firstModel = data.list[0];
                modelDownloadUrl = firstModel.url;
                modelName = firstModel.name || 'model.glb';
                console.log('Download URL obtained from list array:', modelDownloadUrl);
            } 
            // Handle legacy or alternative response formats
            else if (data.list && data.list.url) {
                // Your original server might be transforming the response
                modelDownloadUrl = data.list.url;
                modelName = data.list.name || 'model.glb';
                console.log('Download URL obtained from list object:', modelDownloadUrl);
            } 
            else if (data.url) {
                // Direct URL format
                modelDownloadUrl = data.url;
                modelName = data.name || 'model.glb';
                console.log('Download URL obtained directly:', modelDownloadUrl);
            } 
            else if (data.files && Array.isArray(data.files) && data.files.length > 0) {
                // Another possible format
                modelDownloadUrl = data.files[0].url;
                modelName = data.files[0].name || 'model.glb';
                console.log('Download URL obtained from files array:', modelDownloadUrl);
            } 
            else {
                console.error('Could not find download URL in response:', data);
                throw new Error('No download URL available in the response');
            }
            
        } catch (error) {
            console.error('Failed to get download info:', error);
            errorMessage = error.message || 'Failed to get download link';
        }
    }
    
    function downloadModel() {
        if (modelDownloadUrl) {
            window.open(modelDownloadUrl, '_blank');
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

	onMount(() => {
        // Any initialization can go here
    });
    
    onDestroy(() => {
        // Clean up
        clearPollingTimers();
        
        // Revoke object URLs to prevent memory leaks
        if (trainItems.image) {
            URL.revokeObjectURL(trainItems.image);
        }
    });
</script>

<main transition:fade>
	<div class="title">AI 3D Generator</div>
    <div class="desc">Upload or generate image<br> to convert into 3D model</div>

	<div class="image-file-input">
        {#if trainItems.image}
        <div class="upload-label">
            <img src={trainItems.image} alt="Input image">
            <div class="delete-icon" on:click={() => deleteImage()}>
				<Icon icon="mdi:close-circle" width="20" height="20" />
			</div>
        </div>
       {:else}
		<label class="upload-label" for="file-uploader">
			<Icon icon="mdi:plus" width="32" height="32" />
		</label>
		<input
			id="file-uploader"
			type="file"
			accept="image/*"
			class="file-input"
			on:change={(event) => handleFileUpload(event)}
		/>
        {/if}
	</div>

    <div class={trainItems.image ? 'text-prompt-input-wrapper-gen-ready' : 'text-prompt-input-wrapper'}>
        <input class="prompt-input" type="text" value={prompt} on:input={onchangePrompt}>
        
		<button class="go-btn" on:click={runImageGen} disabled={isGenerating}>
			<Icon icon="jam:arrow-up" width="24" height="24" />
		</button>
    </div>

    {#if errorMessage}
    <div class="error-message">
        {errorMessage}
    </div>
    {/if}

    {#if isGenerating || modelDownloadUrl}
    <div class="status-container">
        {#if isGenerating}
        <div class="progress-bar">
            <div class="progress-fill" style="width: {progressPercentage}%"></div>
        </div>
        <div class="status-text">
            {generationStatus}: {progressPercentage}%
        </div>
        {:else if modelDownloadUrl}
        <div class="download-section">
            <p class="success-message">3D model ready!</p>
            <button class="download-button" on:click={downloadModel}>
                <Icon icon="mdi:download" width="20" height="20" />
                Download {modelName || '3D Model'}
            </button>
        </div>
        {/if}
    </div>
    {/if}

    {#if trainItems.image && !isGenerating && !modelDownloadUrl}
    <button on:click={run3Dgen} class="main-gen-btn" disabled={isGenerating}>
        {#if isGenerating}
        Generating...
        {:else}
        Image to 3D
        {/if}
    </button>
    {/if}

	<div class="close-btn" on:click={() => offPanel()}>
		<Icon icon="carbon:close" width="24" height="24" />
	</div>
</main>

<style>
	main {
        box-sizing: border-box;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		border: 1px solid var(--dim-color);
		background: var(--glass-background);
		position: absolute;
		display: flex;
		z-index: 999;
		color: var(--text-color-bright);
		flex-direction: column;
		
		border: 1px solid var(--dim-color);
		border-radius: 12px;
		backdrop-filter: blur(3px);
		
		max-width: 90vw;
		max-height: 80vh;
	}

    .main-gen-btn {
        display: flex;
        justify-content: center;
        align-items: center;
        text-align: center;
        width: 100%;
        height: 54px;
        font-size: 1rem;
        background-color: var(--highlight-color);
        border-radius: 0 0 12px 12px;
        cursor: pointer;
        color: var(--text-color-standard);
        border: none;
    }
    
    .main-gen-btn:hover {
		background: var(--hover-color);
    }
    
    .main-gen-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .title {
        text-align: center;
        font-size: 1rem;
        box-sizing: border-box;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        border-bottom: 1px solid var(--dim-color);
        padding: 18px;
    }
    
    .text-prompt-input-wrapper {
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
        background-color: var(--glass-background);
        border-radius: 0 0 12px 12px;
    }

    .text-prompt-input-wrapper-gen-ready {
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
        border-bottom: 1px solid var(--dim-color);
        background-color: var(--glass-background);
        border-radius: 0 0 0 0;
    }

    .prompt-input {
        background: none;
		border: none;
		font-size: 0.9rem;
		height: 30px;
		color: var(--text-color-bright);
		padding: 4px 12px;
		border-radius: 0px;
        width: 100%;
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

    .desc {
        text-align: center;
        font-size: 0.8rem;
        line-height: 1.2rem;
        box-sizing: border-box;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        border-bottom: 1px solid var(--dim-color);
        padding: 18px;
    }

	.close-btn {
		position: absolute;
		right: 8px;
		top: 8px;
		z-index: 999;
		cursor: pointer;
	}

    .file-input {
		display: none;
	}

    .image-file-input {
        box-sizing: border-box;
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
        padding: 6px;
	}

    .upload-label {
        position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		width: 150px;
		height: 150px;
		cursor: pointer;
		color: var(--dim-color);
        border: 1px solid var(--dim-color);
        border-radius: 12px;
        background-color: var(--glass-background);
	}

    .delete-icon {
		position: absolute;
		top: 5px;
		right: 5px;
		background-color: rgba(0, 0, 0, 0.5);
		border-radius: 50%;
		cursor: pointer;
		color: #fff;
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 10;
		opacity: 0.7;
		transition: opacity 0.2s ease-in-out;
	}
    
	.delete-icon:hover {
		opacity: 1;
		color: #ff5555;
	}

	.upload-label:hover {
		color: var(--highlight-color);
	}

    .upload-label img {
        border-radius: 12px;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
    
    .error-message {
        color: #ff5555;
        text-align: center;
        padding: 8px;
        font-size: 0.9rem;
    }
    
    .status-container {
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        border-top: 1px solid var(--dim-color);
    }
    
    .progress-bar {
        width: 100%;
        height: 8px;
        background-color: var(--dim-color);
        border-radius: 4px;
        overflow: hidden;
    }
    
    .progress-fill {
        height: 100%;
        background-color: var(--highlight-color);
        transition: width 0.3s ease;
    }
    
    .status-text {
        font-size: 0.85rem;
        text-align: center;
    }
    
    .download-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 10px 0;
    }
    
    .success-message {
        color: #4CAF50;
        font-size: 0.9rem;
        margin: 0;
    }
    
    .download-button {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background-color: var(--highlight-color);
        color: var(--text-color-standard);
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
    }
    
    .download-button:hover {
        background-color: var(--hover-color);
    }
</style>