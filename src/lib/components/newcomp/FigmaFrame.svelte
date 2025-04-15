<script>
    import { onMount } from 'svelte';
    import Icon from '@iconify/svelte';
    
    // Props
    export let onGenerate = () => {};
    export let onUploadImage = () => {};
    
    // State
    let sceneDescription = '';
    let selectedActor = 'aijenny';
    let selectedRatio = '4:3';
    let imageFile = null;
    
    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (file && file.size <= 5 * 1024 * 1024) { // 5MB limit
            imageFile = file;
            onUploadImage(file);
        } else {
            alert('File size must be less than 5MB');
        }
    }
</script>

<div class="frame-container">
    <div class="header">
        <h1>Scene generator</h1>
    </div>
    
    <div class="content">
        <div class="section">
            <h2>Casting actors</h2>
            <div class="input-field">
                <input type="text" bind:value={selectedActor} />
                <button class="icon-button">
                    <Icon icon="stash:plus-solid" />
                </button>
            </div>
        </div>
        
        <div class="section">
            <h2>Location reference image</h2>
            <div class="upload-area" on:click={() => document.getElementById('imageInput').click()}>
                <Icon icon="material-symbols:upload" />
                <p class="upload-text">Upload location reference image</p>
                <p class="upload-subtext">*.png / *.jpg / *.jpeg / *.webp<br>less than 5MB</p>
                <input 
                    type="file" 
                    id="imageInput" 
                    accept=".png,.jpg,.jpeg,.webp" 
                    on:change={handleImageUpload} 
                    style="display: none;"
                />
            </div>
        </div>
        
        <div class="section">
            <h2>Describe the scene</h2>
            <textarea 
                bind:value={sceneDescription} 
                placeholder="Enter scene description"
            ></textarea>
        </div>
        
        <div class="section">
            <h2>Screen ratio</h2>
            <div class="ratio-selector">
                <span>{selectedRatio}</span>
                <Icon icon="gridicons:dropdown" />
            </div>
        </div>
        
        <div class="section">
            <h2>3D Compositing</h2>
            <div class="compositing-preview">
                <!-- Preview area will be implemented -->
            </div>
        </div>
        
        <button class="generate-button" on:click={onGenerate}>
            <Icon icon="mingcute:ai-fill" />
            Generate
        </button>
    </div>
</div>

<style>
    .frame-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        background-color: #06211A;
        border-radius: 50px;
        color: #CECECE;
    }
    
    .header {
        padding: 24px;
    }
    
    h1 {
        font-family: Inter;
        font-weight: 700;
        font-size: 24px;
        letter-spacing: -0.02em;
        margin: 0;
    }
    
    h2 {
        font-family: Inter;
        font-weight: 700;
        font-size: 16px;
        letter-spacing: -0.02em;
        margin: 0 0 12px 0;
    }
    
    .content {
        padding: 0 24px 24px;
        display: flex;
        flex-direction: column;
        gap: 24px;
    }
    
    .section {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    
    .input-field {
        display: flex;
        gap: 8px;
    }
    
    input, textarea {
        width: 100%;
        padding: 12px;
        background-color: #06211A;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        color: #CECECE;
        font-family: Inter;
        font-size: 14px;
    }
    
    textarea {
        min-height: 100px;
        resize: vertical;
    }
    
    .upload-area {
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        padding: 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        cursor: pointer;
    }
    
    .upload-text {
        font-family: Inter;
        font-weight: 500;
        font-size: 14px;
        margin: 0;
    }
    
    .upload-subtext {
        font-family: Inter;
        font-size: 12px;
        color: #DDDDDD;
        text-align: center;
        margin: 0;
    }
    
    .ratio-selector {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background-color: #06211A;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        cursor: pointer;
    }
    
    .generate-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px;
        background-color: #42B084;
        border: none;
        border-radius: 8px;
        color: #FFFFFF;
        font-family: Inter;
        font-weight: 700;
        font-size: 16px;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .generate-button:hover {
        background-color: #3a9e76;
    }
    
    .icon-button {
        padding: 8px;
        background-color: transparent;
        border: none;
        color: #FFFFFF;
        cursor: pointer;
    }
    
    .compositing-preview {
        width: 100%;
        height: 200px;
        background-color: #06211A;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
    }
</style> 