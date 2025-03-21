<!-- LT.svelte -->
<script>
    import { onMount } from 'svelte';
    import Icon from '@iconify/svelte';
    import { slide, fade } from 'svelte/transition';
    
    // Props to receive scene objects from parent component
      let { 
        sceneObjects = [], 
        onObjectSelect = (id) => console.log(`Object selected: ${id}`),
        onObjectVisibilityToggle = (id) => console.log(`Toggle visibility: ${id}`),
        onObjectDelete = (id) => console.log(`Delete object: ${id}`)
    } = $props();
    
    // State
    let sceneListOpen = $state(false);
    
    // Toggle scene list panel
    function toggleSceneList() {
        sceneListOpen = !sceneListOpen;
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
  
    // Close scene list when clicking outside
    function handleClickOutside(event) {
        if (sceneListOpen && !event.target.closest('#scene-list-panel') && 
            !event.target.closest('#scene-list-btn')) {
            sceneListOpen = false;
        }
    }
    
    // Add global click handler
    onMount(() => {
        document.addEventListener('mousedown', handleClickOutside);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    });
</script>

<svelte:window on:keydown={(e) => e.key === 'Escape' && (sceneListOpen = false)} />

<div class="main">
    <div class="button-with-panel">
        <button 
            id="scene-list-btn" 
            class="main-btn" 
            class:active={sceneListOpen}
            onclick={toggleSceneList}
        >
            <Icon class="LT-btn" icon="foundation:list" />
        </button>
        
        {#if sceneListOpen}
            <div 
                id="scene-list-panel" 
                class="panel" 
                transition:slide={{ duration: 200, axis: 'x' }}
            >
                <div class="panel-header">
                    <h3>Scene Objects</h3>
                    <button class="close-btn" onclick={() => sceneListOpen = false}>
                        <Icon icon="carbon:close" width="16" height="16" />
                    </button>
                </div>
                
                <div class="panel-content">
                    {#if sceneObjects.length === 0}
                        <div class="empty-list">
                            <p>No objects in scene</p>
                        </div>
                    {:else}
                        <ul class="object-list">
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
                                        <!-- <span class="object-type">{object.type}</span> -->
                                    </div>
                                    <div class="object-actions">
                                        <button class="icon-button" title="Hide/Show">
                                            <Icon icon="carbon:view" width="16" height="16" />
                                        </button>
                                        <button class="icon-button" title="Delete" onclick={()=>deleteObject(object.id)}>
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
    
    <!-- <button id="bg-setting-btn" class="main-btn">
        <Icon class="LT-btn" icon="ph:sphere-fill" />
    </button>
    
    <button id="light-setting-btn" class="main-btn">
        <Icon class="LT-btn" icon="heroicons-solid:light-bulb" />
    </button>
    
    <button id="camera-setting-btn" class="main-btn">
        <Icon class="LT-btn" icon="fa:video-camera" />
    </button> -->
</div>

<style>
    div :global(.LT-btn) {
        height: 100%;
        width: 100%;
    }
    
    .main {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
        position: absolute;
        top: 0;
        left: 0;
        margin: 24px 24px;
        z-index: 999;
    }
    
    .button-with-panel {
        position: relative;
        display: flex;
        align-items: center;
    }
    
    .main-btn {
        width: 64px;
        height: 42px;
        background-color: #18272E;
        border: none;
        color: #F0F0F0;
        text-align: center;
        text-decoration: none;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        font-size: 16px;
        margin: 4px 2px;
        cursor: pointer;
        border-radius: 50px;
        padding: 10px 20px;
        transition: background-color 0.2s ease;
    }
    
    .main-btn:hover {
        background-color: #EE5F5F;
    }
    
    .main-btn.active {
        background-color: #EE5F5F;
    }
    
    .panel {
        position: absolute;
        left: calc(100% + 16px);
        top: 0;
        width: 280px;
        background-color: #18272E;
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        color: #F0F0F0;
        z-index: 1000;
    }
    
    .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background-color: rgba(0, 0, 0, 0.2);
    }
    
    .panel-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
    }
    
    .close-btn {
        background: none;
        border: none;
        color: #F0F0F0;
        cursor: pointer;
        opacity: 0.7;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .close-btn:hover {
        opacity: 1;
    }
    
    .panel-content {
        max-height: 400px;
        overflow-y: auto;
    }
    
    .empty-list {
        padding: 24px 16px;
        text-align: center;
        color: rgba(255, 255, 255, 0.5);
    }
    
    .object-list {
        list-style: none;
        margin: 0;
        padding: 0;
    }
    
    .object-item {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        cursor: pointer;
        transition: background-color 0.2s ease;
    }
    
    .object-item:hover {
        background-color: rgba(255, 255, 255, 0.05);
    }
    
    .object-icon {
        margin-right: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #F0F0F0;
    }
    
    .object-info {
        flex: 1;
        display: flex;
        flex-direction: column;
    }
    
    .object-name {
        font-size: 14px;
        margin-bottom: 4px;
    }
    
    .object-type {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
        text-transform: capitalize;
    }
    
    .object-actions {
        display: flex;
        gap: 8px;
    }
    
    .icon-button {
        background: none;
        border: none;
        color: #F0F0F0;
        opacity: 0.7;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
    }
    
    .icon-button:hover {
        opacity: 1;
        background-color: rgba(255, 255, 255, 0.1);
    }
</style>