<script>
    import { onMount, onDestroy } from 'svelte';
    import Icon from '@iconify/svelte';
    import * as THREE from 'three';
    import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
    import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
    import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

import {mainRenderer} from '$lib/newcomp/elements/main-canvas.js';


let {newModel} = $props();


    let viewport;
    let viewportWidth = $state(0);
    let viewportHeight = $state(0);
    let isPortrait = $state(false);
      let viewportRenderer;

 let isLoading = $state(false);
    let currentModel = $state(null);

    	$effect(() => {
console.log('newModel', newModel);
        if (newModel) {
            loadModel(newModel);
        }
	});




  const rendererOptions = {
        useHDRI: true,
        hdriPath: '/hdri/brown_photostudio_02_1k.hdr', // Replace with your HDRI path
        shadows: true,
        autoRotate: true,
        autoRotateSpeed: 0.5,
        exposure: 1.2
    };


async function loadModel(file) {
    if (!viewportRenderer) return;
    
    isLoading = true;
    
    try {
        // Create a GLTF loader
        const loader = new GLTFLoader();
        // Create a DRACOLoader and configure it
        const dracoLoader = new DRACOLoader();
        // Set the path to the Draco decoder files
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
        loader.setDRACOLoader(dracoLoader);
        
        // Load the model
        const gltf = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const contents = event.target.result;
                loader.parse(
                    contents,
                    '',
                    // Success callback
                    (parsedGltf) => {
                        console.log('gltf.scene parsed:', parsedGltf.scene);
                        resolve(parsedGltf); // Resolve with the entire parsed gltf object
                    },
                    // Error callback
                    (error) => {
                        reject(error);
                    }
                );
            };
            reader.readAsArrayBuffer(file);
        });
        
    
        // Add the new model to the scene
        currentModel = gltf.scene;
        viewportRenderer.addObject(currentModel, true);
        

        // Update the scene
        viewportRenderer.render();
    } catch (error) {
        console.error('Error loading model:', error);
    } finally {
        isLoading = false;
    }
}


//스크린사이즈 체크
function setViewport() {
    // Check if the screen is portrait or landscape
    isPortrait = window.innerHeight >= window.innerWidth;
    
       let size;
    if (isPortrait) {
        
           size = Math.round(window.innerWidth * 0.8);
        console.log('Landscape mode - 80% of width:', size);
    } else {
       
         size = Math.round(window.innerHeight * 0.8);
        console.log('Portrait mode - 80% of height:', size);
   
    }
       // Set both width and height to the same value to maintain 1:1 ratio
    viewport.style.width = size + 'px';
    viewport.style.height = size + 'px';
    viewportWidth = size;
    viewportHeight = size;
    
    // Update renderer if it exists
    if (viewportRenderer) {
        viewportRenderer.resize();
    }
}

    
  onMount(() => {
        // Initial setup
        setViewport();
        
        // Initialize the PBR renderer
        viewportRenderer = new mainRenderer(viewport, rendererOptions);
        
        // Start animation loop
        viewportRenderer.animate();
        
        // Load a sample model if you have one
        // loadModel('/models/sample_model.glb');
        
        // Add resize event listener
        window.addEventListener('resize', setViewport);
        
        // Return cleanup function
        return () => {
            window.removeEventListener('resize', setViewport);
        };
    });


  
    onDestroy(() => {
        // Clean up the renderer
        if (viewportRenderer) {
            viewportRenderer.dispose();
            viewportRenderer = null;
        }
    });


</script>





<div class="viewport-container">
    <canvas id="viewport" bind:this={viewport}></canvas>
    
    {#if isLoading}
    <div class="loading-indicator">
        <div class="spinner"></div>
        <span>Loading...</span>
    </div>
    {/if}
    
    <div class="orientation-info">
        Current orientation: {isPortrait ? 'Portrait' : 'Landscape'}
    </div>
</div>



<style>
  .viewport-container {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
}
    
    #viewport {
        box-sizing: border-box;
      margin: auto;
       
    }
    
    .orientation-info {
        position: absolute;
        top: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.5);
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 14px;
        z-index: 10;
        pointer-events: none;
    }
    
    .loading-indicator {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        background: rgba(0, 0, 0, 0.7);
        padding: 20px;
        border-radius: 8px;
        z-index: 10;
    }
    
    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 1s ease-in-out infinite;
        margin-bottom: 10px;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
</style>