<script>
	import { onMount } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import Icon from '@iconify/svelte';
	import Dropdown from '$lib/newcomp/elements/menu-dropdown.svelte';
	// Import JSZip for creating ZIP files
	import JSZip from 'jszip';

	let { offPanel } = $props();

    //Finetune LoRA data state
	let castingType = $state('character');
    let triggerWord = $state('');
    let modelName = $state('');
    let file_data = $state(null);
	let isProcessing = $state(false);

    let isTraining = $state(false)

	// State for tracking uploaded images and captions
	let trainItems = $state([{ image: null, caption: '' }]);

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
	async function createAndDownloadZip() {
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
				
				// Add caption as text file
				const txtName = `${modelName}${paddedIndex}.txt`;
				zip.file(txtName, item.caption);
			}
			
			// Generate the zip file
			const zipBlob  = await zip.generateAsync({ type: 'blob' });

            // Also generate as base64 for API transmission
			const zipBase64 = await zip.generateAsync({ type: 'base64' });
           
			console.log("Base64 ZIP data generated and stored in file_data");
			
			// console.log(`Created ${modelName}.zip with ${itemsToProcess.length} image-caption pairs`);
            return zipBase64;
			
		} catch (error) {
			console.error("Error creating zip file:", error);
			alert("Error creating zip file. Please try again.");
		} finally {
			isProcessing = false;
		}
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
        
        // Check if all captions are filled
        const emptyCaptions = itemsToProcess.some(item => !item.caption.trim());
        if (emptyCaptions) {
            alert("Please provide captions for all images");
            return;
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
                iteration: 149,
                learning_rate: 0.003,
                captioning: false,
                priority: 'speed',
                finetune_type: 'lora',
                lora_rank: 16,
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
            
            // Success message
            alert(`Training for ${modelName} has been started successfully!`);
            
        } catch (error) {
            console.error('Error finetuning:', error);
            alert(`Training failed: ${error.message}`);
        } finally {
            isTraining = false;
        }
    }

	// Clean up object URLs when component is destroyed
	onMount(() => {
		return () => {
			trainItems.forEach((item) => {
				if (item.image) URL.revokeObjectURL(item.image);
			});
		};
	});
</script>

<main transition:fade>
	<div class="title">Casting new model(building now...)</div>
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
		<div class="title">Model image & Caption</div>
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
					<textarea
						type="text"
						placeholder="ex) Image of the character called aiSusan"
						value={item.caption}
						oninput={(e) => updateCaption(index, e.target.value)}
					/>
				</div>
			{/each}
		</div>
	</div>

	<div class="casting-btn-wrapper">
		<button onclick={goTraining} disabled={isProcessing || isTraining}>
			{#if isProcessing}
				Creating ZIP...
			{:else if isTraining}
				Training in progress...
			{:else}
				Start casting!
			{/if}
		</button>
	</div>

	<div class="close-btn" onclick={() => offPanel()}>
		<Icon icon="carbon:close" width="24" height="24" />
	</div>
</main>

<style>
	main {
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
		max-width: 90vw;
		max-height: 80vh;
		overflow-y: auto;
	}

	.title {
		text-align: center;
		margin-bottom: 30px;
		font-size: 1rem;
		margin-top: 10px;
	}

	.caster-basic-info-wrapper {
		display: flex;
		flex-direction: row;
		gap: 10px;
		margin-bottom: 20px;
	}

	.caster-input {
		display: flex;
		flex-direction: column;
		gap: 6px;
		flex: 1;
	}

	.caster-input input {
		background: none;
		border: 1px solid var(--dim-color);
		font-size: 0.9rem;
		height: 30px;
		color: var(--text-color-bright);
		padding: 4px 12px;
		border-radius: 4px;
	}

	.train-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 20px;
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
		margin-bottom: 20px;
	}

	.casting-btn-wrapper {
		height: 48px;
		margin-top: 10px;
	}

	.casting-btn-wrapper button {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 100%;
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
</style>