<script>
	import { onMount } from 'svelte';
	import { fade, slide, scale } from 'svelte/transition';
	import Icon from '@iconify/svelte';
	import Dropdown from '$lib/newcomp/elements/menu-dropdown.svelte';
	import ToggleBtn from '$lib/newcomp/elements/menu-toggle-btn.svelte';
	// Import JSZip for creating ZIP files
	import JSZip from 'jszip';

	let { offPanel, reportTrainStatus } = $props();

    //Finetune LoRA data state
	let castingType = $state('character');
    let triggerWord = $state('');
    let modelName = $state('');
    let file_data = $state(null);
    let isGenerating = $state(false);
	let isProcessing = $state(false);
    let pollingInterval = $state(null);
	let pollingTimeout = $state(null);
	let isPending = $state(false);
    let trainProcess = $state(0);
    let isTraining = $state(false);
    let autoCaption = $state(false);
	let trainError = $state(null);
	let trainStatus = $state({});
    let onPreview = $state(false);
    let canClosePanel = $state(false);
	// State for tracking uploaded images and captions
	let trainItems = $state([{ image: null, caption: '' }]);
    let zipBlob = $state(null); // Store the ZIP blob for direct download
    let showDownloadButton = $state(false); // Control visibility of download button


function updateTrainStatus(){
	reportTrainStatus(trainStatus);
}


    function onTriggerwordInput(e) {
        triggerWord = e.target.value;
        console.log(triggerWord);
    }

    function onModelNameInput(e) {
        modelName = e.target.value;
        console.log(modelName);
    }

	// Function to handle file upload
	function handleFileUpload(event, index) {
		const files = event.target.files;

		if (!files || files.length === 0) return;

		// If multiple files are uploaded
		if (files.length > 1) {
			// Update the current item with image and caption
			trainItems[index].image = URL.createObjectURL(files[0]);
			trainItems[index].file = files[0]; // Store the actual file
			trainItems[index].caption = `Image of the ${castingType} called ${triggerWord}.`;

			// Add new items for the remaining files
			for (let i = 1; i < files.length; i++) {
				trainItems.push({
					image: URL.createObjectURL(files[i]),
					file: files[i], // Store the actual file
					caption: `Image of the ${castingType} called ${triggerWord}`
				});
			}
		} else {
			// Single file upload - update both image and caption
			trainItems[index].image = URL.createObjectURL(files[0]);
			trainItems[index].file = files[0]; // Store the actual file
			trainItems[index].caption = `Image of the ${castingType} called ${triggerWord}`;
		}

		// Always add an empty item at the end if the last item now has an image
		if (trainItems[trainItems.length - 1].image) {
			trainItems.push({ image: null, file: null, caption: '' });  // Empty caption for the placeholder
		}
	}

	// Function to update caption
	function updateCaption(index, value) {
		trainItems[index].caption = value;
        
	}

    function handleAutoCaption(event){
        autoCaption = event.target.checked;
        	console.log('autoCaption:', autoCaption);
    }
	
	// Function to delete a train item
	function deleteTrainItem(index) {
		// Make sure we don't delete the last empty placeholder item
		if (index >= 0 && index < trainItems.length - 1) {
			// Clean up the URL if needed
			if (trainItems[index].image) {
				URL.revokeObjectURL(trainItems[index].image);
			}
			
			// Remove the item at the specified index
			trainItems.splice(index, 1);
			
			// Update trainItems to trigger reactivity
			trainItems = [...trainItems];
		}
  
	}

	// Function to create and download zip file
async function createAndDownloadZip(forDownload = false) {
    if (!modelName) {
        alert("Please enter a model name");
        return;
    }

    // Filter out the empty placeholder item
    const itemsToProcess = trainItems.filter(item => item.image !== null);
    
    if (itemsToProcess.length === 0) {
        alert("Please upload at least one image");
        return;
    }

    isProcessing = true;
    
    try {
        const zip = new JSZip();
        
        // Add each image and caption text file to the zip
        for (let i = 0; i < itemsToProcess.length; i++) {
            const item = itemsToProcess[i];
            const paddedIndex = String(i + 1).padStart(2, '0'); // 01, 02, etc.
            
            // Add image to zip
            const imageName = `${modelName}${paddedIndex}.png`;
            // Use the stored file directly
            zip.file(imageName, item.file);
            
            // Add caption as text file ONLY if autoCaption is false
            if (!autoCaption) {
                const txtName = `${modelName}${paddedIndex}.txt`;
                zip.file(txtName, item.caption);
            }
        }
        
        // Generate the zip file as blob for download
        zipBlob = await zip.generateAsync({ type: 'blob' });
        
        // Show download button if this was called directly for downloading
        if (forDownload) {
            showDownloadButton = true;
            return null; // Don't need base64 for direct download
        }

        // Generate as base64 for API transmission
        const zipBase64 = await zip.generateAsync({ type: 'base64' });
       
        console.log("Base64 ZIP data generated and stored in file_data");
        
        return zipBase64;
        
    } catch (error) {
        console.error("Error creating zip file:", error);
        alert("Error creating zip file. Please try again.");
    } finally {
        isProcessing = false;
    }
}

// Add a new function to trigger the download
function downloadZipFile() {
    if (!zipBlob) {
        alert("No ZIP file available to download.");
        return;
    }
    
    const filename = `${modelName}_training_data.zip`;
    const downloadUrl = URL.createObjectURL(zipBlob);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up after download
    setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
    }, 100);
}

// Add a function to prepare the zip file for download only
async function prepareZipForDownload() {
    await createAndDownloadZip(true);
}

    async function goTraining() {
        // Validation checks
        if (!modelName) {
            alert("Model name is required");
            return;
        }
        
        if (!triggerWord) {
            alert("Code name (trigger word) is required");
            return;
        }
        
        // Filter out the empty placeholder item
        const itemsToProcess = trainItems.filter(item => item.image !== null);
        
        if (itemsToProcess.length === 0) {
            alert("Please upload at least one image");
            return;
        }
        
        // Check if all captions are filled when autoCaption is false
        if (!autoCaption) {
            const emptyCaptions = itemsToProcess.some(item => !item.caption.trim());
            if (emptyCaptions) {
                alert("Please provide captions for all images");
                return;
            }
        }

        // Prepare data files as base64 encoded zip file
        const zipfile64 = await createAndDownloadZip();
        
        if (!zipfile64) {
            alert("Failed to create training data");
            return;
        }

        isTraining = true;
        
        try {
            // Prepare training data
            const trainDatas = {
                file_data: zipfile64,
                finetune_comment: modelName,
                trigger_word: triggerWord,
                mode: castingType,
                iteration: 300,
                captioning: autoCaption,
                priority: 'quality',
                finetune_type: 'full',
                lora_rank: 32,
            };
            
            // Send API request
            const response = await fetch('api/loratrain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data: trainDatas })
            });
            
            const data = await response.json();
            console.log('Train result:', data);
            
            // Error handling
            if (!response.ok || data.error) {
                throw new Error(data.error?.msg || 'Training request failed');
            }
            
            // Success message - Set status to Queue
            trainStatus = {
				message: `Training for ${modelName} has been started successfully!`,
				modelName: modelName,
				triggerWord: triggerWord,
				castingType: castingType,
				training_status: 'Queue',
                id: data.finetune_id
			};
            updateTrainStatus();
            
            // Allow user to close panel
            canClosePanel = true;

            // Start the polling process
            trainPolling(data.finetune_id);
            
        } catch (error) {
            console.error('Error finetuning:', error);
            alert(`Training failed: ${error.message}`);
            isTraining = false;
        } finally {
            isTraining = false;
        }
    }

 async function getTrainDetail(id) {
    isTraining = false;
    // Fix: Change from path parameter (/id=) to query parameter (?id=)
    const detailRequestUrl = `/api/loratrain?id=${id}`;
    
    try {
        const response = await fetch(detailRequestUrl);
        
        if (!response.ok) {
            throw new Error(`Training failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('train polling data:', data);
    } catch (error) {
        console.error('Error fetching train details:', error);
    }
}

    function trainPolling(result_id){
        	
        // URL에서 ID 추출
		const id = result_id;

        // 프록시 URL 생성
        const proxyPollingUrl = `/api/loratrain?result=${id}`;

        pollingInterval = setInterval(async() => {
            try {
                const response = await fetch(proxyPollingUrl);
                if (!response.ok) {
                    throw new Error(`Training failed with status: ${response.status}`);
                }

                const data = await response.json();
                console.log('train polling data:', data);
                console.log('Polling status:', data.status);
                
				// 상태에 따른 처리
				if (data.status === 'Ready') {
					// 이미지 생성 완료
					isPending = false;
					console.log('학습 로라 생성 완료:', data.result);
					console.log('학습 로라 생성 완료:', data.result.finetune_id);

                    getTrainDetail(result_id);
					completeTrainTask(data.result.finetune_id);
					
					// 타이머 정리
					clearPollingTimers();
				} else if (data.status === 'Error') {
					// 이미지 생성 실패
					console.error('학습 생성 실패:', data.error);
					trainError = data.error;
					isTraining = false;
					isPending = false;
					
					trainStatus = {
                        message: `${modelName} training failed!`,
                        modelName: modelName,
                        triggerWord: triggerWord,
                        castingType: castingType,
                        training_status: 'Failed',
                        id: result_id
                    };

                    updateTrainStatus();
					clearPollingTimers();
				} else if (data.status === 'Pending') {
					// 학습 대기 중
					isPending = true;

					trainStatus = {
                        message: `${modelName} is preparing for training!`,
                        modelName: modelName,
                        triggerWord: triggerWord,
                        castingType: castingType,
                        training_status: 'Waiting',
                        id: result_id
                    };

                    updateTrainStatus();

					// 진행 상황 업데이트
					if (data.progress !== undefined && data.progress !== null) {
						// 0-1 범위를 0-100 범위로 변환
						trainProcess = Math.round(data.progress * 100);
                        
                        // Update the training status with progress
                        trainStatus = {
                            message: `${modelName} is training: ${trainProcess}% complete`,
                            modelName: modelName,
                            triggerWord: triggerWord,
                            castingType: castingType,
                            training_status: 'Training',
                            progress: trainProcess,
                            id: result_id
                        };
                        updateTrainStatus();
					} else {
						// 구체적인 진행 상황이 없으면 기본값 사용
						trainProcess = 5;
					}
					console.log('train generation in progress:', trainProcess);
				} else {
					console.log('Polling status:', data.status);
				}

            } catch (error) {
				console.error('polling error:', error);
				trainError = error.message || 'Error during training polling';
				isTraining = false;
				isPending = false;
				clearPollingTimers();
            }
        }, 3000);
    }

    // FLUX 작업 완료 처리
	async function completeTrainTask(finetune_id) {
		try {
			// 로딩 상태 표시
			isGenerating = true;

			const trainProxyUrl = `/api/loratrain?finetune_id=${finetune_id}`;

			// 이미지 즉시 가져오기
			console.log('Fetching train data from:', trainProxyUrl);
			const response = await fetch(trainProxyUrl);

			if (!response.ok) {
				throw new Error(`Failed to fetch image: ${response.statusText}`);
			}

			// 이미지를 blob으로 가져와 캐시
			const trainDetail = await response.json();

			console.log('Train done', trainDetail);

			trainStatus = {
				message: `${modelName} is done!`,
				modelName: modelName,
				triggerWord: triggerWord,
				castingType: castingType,
				training_status: 'Done',
                id: finetune_id
			};
			updateTrainStatus();

			// 생성 완료
			isGenerating = false;
		
		} catch (error) {
			console.error('Error caching image:', error);
			trainError = `Failed to load generated image: ${error.message}`;
			isGenerating = false;
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

	// Clean up object URLs when component is destroyed
	onMount(() => {
		return () => {
			trainItems.forEach((item) => {
				if (item.image) URL.revokeObjectURL(item.image);
			});
            
            // Important! Keep polling even after the component is unmounted 
            // by NOT clearing the intervals here
		};
	});
</script>

<!-- Animated backdrop overlay -->
<div class="animated-backdrop" transition:fade={{ duration: 500 }}>
    
   
</div>

<main transition:scale={{ duration: 400, start: 0.95 }}>
	<div class="title">Casting new model</div>
	<div class="caster-basic-info-wrapper">
		<div class="caster-input">
			<span>Model name.</span>
			<input type="text" placeholder="ex) Susan" oninput={onModelNameInput} value={modelName}/>
		</div>
		<div class="caster-input">
			<span>Unique Code name.</span>
			<input type="text" placeholder="ex) aiSusan" value={triggerWord} oninput={onTriggerwordInput}/>
		</div>
	</div>

	<div class="casting-selection">
		<span>Model type.</span>
        <div class="dropdown-container">
			<Dropdown
				label=""
				placeholder="What is your model type?"
				options={[
					{ label: '- Character', value: 'character' },
					{ label: '- Style', value: 'style' },
                    { label: '- Product', value: 'product' },
                    { label: '- General type, etc', value: 'general' },
				]}
				selected={castingType}
				onChange={(option) => (castingType = option.value)}
                width='100%'
				labelPosition="left"
                dropDirection="bottom"
			/>
        </div>
	</div>

	<div class="train-list-wrapper">
        <div class="title-wrapper">
            <div class="sub-title">Model image & Caption</div>
            <div class="title-option">
                <span>Auto caption</span>
                <ToggleBtn checked={autoCaption} onToggle={handleAutoCaption} />
            </div>
        </div>
	
      
		<div class="train-list">
			{#each trainItems as item, index (index)}
				<div class="train-item" transition:slide={{ duration: 300 }}>
					<div class="image-container">
						{#if item.image}
							<img src={item.image} alt="Character image" />
							<div class="delete-icon" onclick={() => deleteTrainItem(index)}>
								<Icon icon="mdi:close-circle" width="20" height="20" />
							</div>
						{:else}
							<label class="upload-label" for={`file-upload-${index}`}>
								<Icon icon="mdi:plus" width="32" height="32" />
							</label>
							<input
								id={`file-upload-${index}`}
								type="file"
								accept="image/*"
								multiple
								class="file-input"
								onchange={(event) => handleFileUpload(event, index)}
							/>
						{/if}
					</div>
					{#if !autoCaption}
                    <!-- Only show textarea when autoCaption is false -->
					<textarea
						type="text"
						placeholder="ex) Image of the character called aiSusan"
						value={item.caption}
						oninput={(e) => updateCaption(index, e.target.value)}
					/>
                    {:else}
                    <!-- Display a message when autoCaption is true -->
                    <div class="auto-caption-message">
                        <p>Auto captioning enabled</p>
                    </div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<div class="casting-btn-wrapper">
		{#if !canClosePanel}
		<button onclick={goTraining} disabled={isProcessing || isTraining}>
			{#if isProcessing}
				Creating ZIP...
			{:else if isTraining}
				Training in progress...
			{:else}
				Start casting!
			{/if}
		</button>
        <!-- Test button to prepare and download zip -->
        <button class="secondary-btn" onclick={prepareZipForDownload} disabled={isProcessing}>
            Download the training data
        </button>
        {:else}
        <!-- Show different message when training is in Queue -->
        <div class="info-message" transition:slide>
            <Icon icon="mdi:check-circle" width="24" height="24" class="success-icon" />
            <p>Training has started and will continue even if you close this panel!</p>
            <button class="close-panel-btn" onclick={() => offPanel()}>
                Close Panel
            </button>
        </div>
        {/if}
	</div>

	<div class="close-btn" onclick={() => offPanel()}>
		<Icon icon="carbon:close" width="24" height="24" />
	</div>
</main>

{#if showDownloadButton && zipBlob}
    <div class="download-zip-container" transition:slide>
        <div class="download-zip-content">
            <p>ZIP file is ready to download!</p>
            <button class="download-btn" onclick={downloadZipFile}>
                <Icon icon="material-symbols:download" width="18" height="18" />
                Download ZIP ({(zipBlob.size / 1024).toFixed(1)} KB)
            </button>
            <button class="close-download-btn" onclick={() => showDownloadButton = false}>
                <Icon icon="carbon:close" width="16" height="16" />
            </button>
        </div>
    </div>
{/if}

{#if isTraining}
	<div class="generation-container">
		<div class="upload-progress">
			<div
				class="progress-bar"
				class:indeterminate={trainProcess === 0}
				class:active-generation={isPending}
				style="width: {trainProcess}%"
			></div>
		</div>

		<div class="upload-info">
			<span class="stage-label">
				{#if isPending}
					<span class="status-indicator training"></span>
					Training in progress... {trainProcess > 0 ? `${trainProcess}%` : 'Starting...'}
				{:else if trainProcess >= 100}
					<span class="status-indicator done"></span>
					Casting almost done!...
				{:else}
					<span class="status-indicator queue"></span>
					Casting will start soon...
				{/if}
			</span>
		</div>
	</div>
{/if}

<!-- 에러 메시지 표시 -->
{#if trainError}
	<div class="error-toast" transition:slide>
		<p>{trainError}</p>
		<button onclick={() => (trainError = null)}>
			<Icon icon="carbon:close" width="16" height="16" />
		</button>
	</div>
{/if}

<style>
    .animated-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color:var(--glass-background);
        backdrop-filter: blur(2px);
        z-index: 998;
        overflow: hidden;
    }


  

  
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
		padding: 10px;
		border: 1px solid var(--dim-color);
		border-radius: 12px;
		backdrop-filter: blur(3px);
		width: 500px;
		max-width: 70vw;
		max-height: 80vh;
		overflow-y: auto;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
	}

	.caster-basic-info-wrapper {
		width: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: row;
		gap: 8px;
		margin-bottom: 10px;
	}

	.caster-input {
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 6px;
		flex: 1;
	}

	.caster-input input {
		box-sizing: border-box;
		background: none;
		border: 1px solid var(--dim-color);
		font-size: 0.9rem;
		height: 30px;
		color: var(--text-color-bright);
		padding: 4px 12px;
		border-radius: 4px;
		width: 100%;
	}

	.train-list {
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 8px;
	}

	.train-item {
		
		box-sizing: border-box;
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		border: 1px solid var(--dim-color);
		height: 100px;
		border-radius: 4px;
		overflow: hidden;
	}

	.image-container {
		position: relative;
		width: 100px;
		height: 100px;
		display: flex;
		justify-content: center;
		align-items: center;
		background: rgba(0, 0, 0, 0.1);
	}

	.train-item img {
		box-sizing: border-box;
		width: 100px;
		height: 100px;
		object-fit: cover;
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

	.upload-label {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 100%;
		cursor: pointer;
		color: var(--dim-color);
	}

	.upload-label:hover {
		color: var(--text-color-bright);
		background: rgba(255, 255, 255, 0.1);
	}

	.file-input {
		display: none;
	}

	.train-item textarea {
		box-sizing: border-box;
		font-size: 0.9rem;
		font-family:
			'Pretendard Variable',
			Pretendard,
			-apple-system,
			BlinkMacSystemFont,
			system-ui,
			Roboto,
			'Helvetica Neue',
			'Segoe UI',
			'Apple SD Gothic Neo',
			'Noto Sans KR',
			'Malgun Gothic',
			'Apple Color Emoji',
			'Segoe UI Emoji',
			'Segoe UI Symbol',
			sans-serif;
		flex-grow: 1;
		height: 100%;
		border: none;
		outline: none;
		resize: none;
		background: none;
		padding: 10px;
		overflow: auto;
		color: var(--text-color-standard);
	}

	.train-list-wrapper {
		margin-bottom: 4px;
	}

	.casting-btn-wrapper {
				display: flex;
		justify-content: center;
		align-items: center;
		
		
		
	}

	.casting-btn-wrapper button {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 42px;
		border: 1px solid var(--dim-color);
		font-size: 1rem;
		cursor: pointer;
		transition: all ease-in-out 200ms;
		border-radius: 4px;
		background: none;
		color: var(--text-color-bright);
	}

	.casting-btn-wrapper button:hover:not([disabled]) {
		background-color: var(--highlight-color);
	}

	.casting-btn-wrapper button[disabled] {
		opacity: 0.6;
		cursor: not-allowed;
	}

    .casting-selection{
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content:center;
        align-items: flex-start;
        gap: 8px;
    }

	.close-btn {
		position: absolute;
		right: 8px;
		top: 8px;
		z-index: 999;
		cursor: pointer;
        color: var(--dim-color);
        transition: color 0.2s ease;
	}

    .close-btn:hover {
        color: var(--text-color-bright);
    }

    .dropdown-container{
         width: 100%;
         box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content:center;
        align-items: flex-start;
        border: 1px solid var(--dim-color);
        border-radius: 6px;
        padding: 1.5px;
    }
    
	.upload-container,
	.generation-container {
		position: fixed;
		bottom: 20px;
		left: 50%;
		transform: translateX(-50%);
		width: 300px;
		background-color: var(--secondary-color);
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

    .title-wrapper{
        display: flex;
        flex-direction: row;
        justify-self: space-between;
        align-items: center;
        gap: 10px;
        margin-top: 32px;
    }

    .title {
		text-align: center;
		margin-bottom: 30px;
		font-size: 1rem;
		margin-top: 10px;
        font-size: 1.1rem;
	}
    
    .sub-title {
	    display: flex;
        flex-direction: row;
        justify-self: center;
        align-items: center;
        font-size: 1rem;
        flex-grow: 1;
	}

    .title-option{
        display: flex;
        flex-direction: row;
        justify-self: center;
        align-items: center;
    }

    .casting-btn-wrapper {
        display: flex;
        flex-direction: column;
        gap: 10px;
        height: auto;
        margin-top: 5px;
    }

    .secondary-btn {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 40px;
        border: 1px solid var(--dim-color);
        font-size: 0.9rem;
        cursor: pointer;
        transition: all ease-in-out 200ms;
        border-radius: 4px;
        background: none;
        color: var(--dim-color);
    }

    .secondary-btn:hover:not([disabled]) {
        border: 1px solid var(--dim-color);
        color: var(--text-color-bright);
    }

    .secondary-btn[disabled] {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .download-zip-container {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: 340px;
        background-color: var(--secondary-color);
        border-radius: 10px;
        overflow: hidden;
        z-index: 1001;
        padding: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        border: 1px solid var(--highlight-color);
    }

    .download-zip-content {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .download-zip-content p {
        margin: 0;
        text-align: center;
        color: var(--text-color-bright);
    }

    .download-btn {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        padding: 10px;
        background-color: var(--highlight-color);
        color: var(--text-color-standard);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: all ease-in-out 200ms;
    }

    .download-btn:hover {
        background-color: var(--hover-color);
    }

    .close-download-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        color: var(--dim-color);
        cursor: pointer;
        padding: 4px;
        transition: color 0.2s;
    }

    .close-download-btn:hover {
        color: var(--text-color-bright);
    }

    .info-message {
        background-color: rgba(0, 128, 0, 0.1);
        border: 1px solid rgba(0, 128, 0, 0.3);
        border-radius: 8px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 10px;
    }

    .info-message p {
        margin: 0;
        line-height: 1.5;
    }

    .info-message .success-icon {
        color: #4caf50;
    }

    .close-panel-btn {
        background-color: var(--highlight-color);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .close-panel-btn:hover {
        background-color: var(--hover-color);
    }

    .auto-caption-message {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-grow: 1;
        background-color: rgba(0, 0, 0, 0.05);
        color: var(--dim-color);
        padding: 8px;
        font-style: italic;
    }
   
    .auto-caption-message p {
        margin: 0;
    }
    
    /* Active training progress bar styling */
    .active-generation {
        background-color: var(--highlight-color) !important;
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0% { opacity: 0.6; }
        50% { opacity: 1; }
        100% { opacity: 0.6; }
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
</style>