<!-- +page.svelte -->
<script>
import { onMount } from 'svelte';
import LT from '$lib/newcomp/LT.svelte';
import CT from '$lib/newcomp/CT.svelte';
import RT from '$lib/newcomp/RT.svelte';
import PROMPT from '$lib/newcomp/PROMPT.svelte';
import VIEWPORT from '$lib/newcomp/VIEWPORT.svelte';
import EDITOR from '$lib/newcomp/EDITOR.svelte';
import CASTER from '$lib/newcomp/CASTER.svelte'

import Icon from '@iconify/svelte';
// Model loading states
let newModel = $state(null);
let liveRenderImage = $state(null);
let viewportLoading = $state(false);
let uploadError = $state(null);

//casting states
let onCasting = $state(false);

// Scene objects tracking
let sceneObjects = $state([]);

// Model metadata 
let currentModelInfo = $state({
  name: "",
  size: 0,
  type: "",
  lastModified: null
});

// Reference to the viewport component
let viewportRef;
let currentBG = $state(null);
let currentViewportBG = $state(null);

// Handle model upload from PROMPT component
function addModelToScene(file, metadata) {
  console.log('Adding model to scene:', file.name);
  
  // Update model metadata
  currentModelInfo = {
    name: file.name,
    size: file.size,
    type: file.type || 'model/gltf-binary',
    lastModified: new Date(file.lastModified)
  };
  
  // Reset any previous errors
  uploadError = null;
  
  // Set loading state
  viewportLoading = true;
  
  // Provide file to viewport component
  newModel = file;
}

async function getCurrentViewportAsImg(data) {

  let currentRatio = data.currentBGratio
  let bginfo = {
    currentBG: currentViewportBG,
    currentRatio: currentRatio
  }

  return new Promise((resolve, reject) => {
    
    if (viewportRef) {
      viewportRef.renderCurrentViewportAsImg(bginfo).then((img) => {
        liveRenderImage = img;
        resolve(img);
      }).catch((error) => {
        console.error('Failed to get current viewport as image:', error);
        reject(error);
      });
    } else {
      reject('Viewport component not available');
    }
  });

}

// Called by viewport when model loading fails
function handleModelError(error) {
  console.error('Model loading failed:', error);
  uploadError = error.message || 'Failed to load 3D model';
  viewportLoading = false;
}

// Update scene objects list when changed in viewport
function updateSceneObjects(objectsList) {
  sceneObjects = objectsList;

}


function updateCurrentBG(data){
  currentViewportBG = data;
  console.log('currentBGsize', currentViewportBG.width, currentViewportBG.height)
}

// Handle object selection from LT component
function handleObjectSelect(objectId) {
  console.log('Selecting object from list:', objectId);
  // Call the viewport's selection method
  if (viewportRef?.selectObjectById) {
    viewportRef.selectObjectById(objectId);
  }
}

// Handle object visibility toggle
function handleObjectVisibilityToggle(objectId) {
  console.log('Toggling visibility of object:', objectId);
  if (viewportRef?.toggleObjectVisibility) {
    viewportRef.toggleObjectVisibility(objectId);
  }
}

// Handle object deletion
function handleObjectDelete(objectId) {
  console.log('Deleting object:', objectId);
  if (viewportRef?.deleteObjectById) {
    viewportRef.deleteObjectById(objectId);
  }
}

 async function startPathTracing(state) {
   
    console.log('start pathtracing');
 if (viewportRef) {
    await viewportRef.enablePathTracing(state);
  
  }}

  function changeBG(file){
    console.log('new hdr', file)
     if (viewportRef) {
    viewportRef.changeBG(file, true)
     }

     if(file === null){
      currentViewportBG = null;
     }
  }

  function changeBGfromURL(url){
    console.log('new hdr', url)

     if(url === null){
      currentViewportBG = null;
      currentBG = null;
     }
    currentBG = url;
     if (viewportRef) {
    viewportRef.changeBGfromURL(url)
     }


  }

   function setVhVariable() {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

function handleCasting(){
  console.log('open caster')
  onCasting = true;
}

function offCasting(){
  console.log('close caster')
  onCasting = false;
}

function handleFOV(fov){
  if(viewportRef){
viewportRef.changeFOV(fov)
  }

}

function handleLight(type, value){
if(viewportRef){
switch(type){
  case 'rot':
    console.log('lightRot', value)
    viewportRef.changeLightRot(value)
    break
  case 'keyIntensity':
     console.log('keyIntensity', value)
     viewportRef.changeLightIntensity(type, value) 
    break;
   case 'RimIntensity':
       console.log('RimIntensity', value)
        viewportRef.changeLightIntensity(type, value) 
    break;
 case 'FillIntensity':
   console.log('FillIntensity', value)
    viewportRef.changeLightIntensity(type, value) 
    break;
     case 'keyColor':
       console.log('keyColor', value)
         viewportRef.changeLightColor(type, value) 
    break;
     case 'fillColor':
       console.log('fillColor', value)
        viewportRef.changeLightColor(type, value) 
    break;
     case 'rimColor':
       console.log('rimColor', value)
        viewportRef.changeLightColor(type, value) 
    break;

}
 }
}

function handleEnvSetting(type, value){
if(viewportRef){
switch(type){
  case 'rotation':
    console.log('rotation', value)
     viewportRef.changeEnvMapSetting(type, value) 
    break
  case 'intensity':
     console.log('intensity', value)
     viewportRef.changeEnvMapSetting(type, value) 
    break;
}
}
}


onMount(() => {
    // Run the function on initial load and resize
  window.addEventListener('resize', setVhVariable);
  window.addEventListener('orientationchange', setVhVariable);
  setVhVariable();
  console.log('3D Model Viewer initialized');

  // Setup mock scene objects for testing (remove in production)
  // This is just to demonstrate the UI if no actual models are loaded
  if (sceneObjects.length === 0) {
    sceneObjects = [

    ];
  }


});
</script>

<main>
  <!-- <LT 
    {sceneObjects} 
    onObjectSelect={handleObjectSelect}
    onObjectVisibilityToggle={handleObjectVisibilityToggle}
    onObjectDelete={handleObjectDelete}
  /> -->
  				

  <CT />
  <RT />
  <div class="main-container">
          <div class="tool-wrapper">
      <EDITOR 
        add3dModel={(file, metadata) => addModelToScene(file, metadata)} 
        pathTracingRender={(state)=>startPathTracing(state)} 
        {viewportLoading}
        {uploadError}
        BGimport={(image)=>changeBG(image)}
        BGfromURL={(url)=>changeBGfromURL(url)}
        BGfromPrompt={currentBG}
           {sceneObjects} 
    onObjectSelect={handleObjectSelect}
    onObjectVisibilityToggle={handleObjectVisibilityToggle}
    onObjectDelete={handleObjectDelete}
    onChangeFOV={handleFOV}
    onChangeLight={handleLight}
    onChangeEnvSetting = {handleEnvSetting}
      />
    </div>
    <div class="viewport-wrapper">
 
      <VIEWPORT 
        bind:this={viewportRef}
        {newModel} 
        doneLoadingModel={() => {
          viewportLoading = false;
          console.log('Model loaded successfully:', currentModelInfo.name);
        }}
        onModelError={handleModelError}
        onSceneObjectsChanged={updateSceneObjects}
        currentViewportBG={(data)=>updateCurrentBG(data)}
      />
    </div>
    <div class="prompt-wrapper">
      <PROMPT 
        add3dModel={(file, metadata) => addModelToScene(file, metadata)} 
        pathTracingRender={(state)=>startPathTracing(state)} 
        {viewportLoading}
        {uploadError}
        BGfromURL={(url)=>changeBGfromURL(url)}
        requestCurrentViewportImg={(data)=>getCurrentViewportAsImg(data)}
        liveRenderImage={liveRenderImage}
        handleCasting={()=>handleCasting()}
      />
    </div>
  </div>


  {#if onCasting}

<CASTER offPanel={()=>offCasting()} />

  {/if}

	

  {#if uploadError}
    <div class="error-message">
      <p>{uploadError}</p>
      <button onclick={() => uploadError = null}>Dismiss</button>
    </div>
  {/if}
</main>

<style>
:root {
    --vh: 1vh;
  }

  /* #1a0611 */
  /* #230817 */
   main {
    box-sizing: border-box;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100vw;
     height: calc(var(--vh, 1vh) * 100);


    background: linear-gradient(to top, var(--primary-color), var(--primary-color));
    overflow: hidden;
  }

  .main-container {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    position: relative;
  
  }

  .tool-wrapper{
     box-sizing: border-box;
    width: 100%;

    position: relative;
  padding: 10px;
z-index: 990;
  }

  .viewport-wrapper {
     box-sizing: border-box;
    flex: 1;
    min-height: 0; /* Important for flex container */
    width: 100%;
    position: relative;
 
 padding: 10px;
  }

  .prompt-wrapper {
     box-sizing: border-box;
    width: 100%;

    position: relative;
  padding: 10px;
     margin-bottom: 32px;
  }
  .error-message {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #f44336;
    color: white;
    padding: 16px;
    border-radius: 8px;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }
  
  .error-message button {
    background-color: white;
    color: #f44336;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
  }
</style>