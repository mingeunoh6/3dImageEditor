<!-- +page.svelte -->
<script>
import { onMount } from 'svelte';
import LT from '$lib/newcomp/LT.svelte';
import CT from '$lib/newcomp/CT.svelte';
import RT from '$lib/newcomp/RT.svelte';
import PROMPT from '$lib/newcomp/PROMPT.svelte';
import VIEWPORT from '$lib/newcomp/VIEWPORT.svelte';

// Model loading states
let newModel = $state(null);
let viewportLoading = $state(false);
let uploadError = $state(null);

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
  }

 


onMount(() => {
  console.log('3D Model Viewer initialized');

  // Setup mock scene objects for testing (remove in production)
  // This is just to demonstrate the UI if no actual models are loaded
  if (sceneObjects.length === 0) {
    sceneObjects = [
      { id: "obj_1", name: "Example Model", type: "gltf", visible: true },
      { id: "obj_2", name: "Light Source", type: "light", visible: true }
    ];
  }


});
</script>

<main>
  <LT 
    {sceneObjects} 
    onObjectSelect={handleObjectSelect}
    onObjectVisibilityToggle={handleObjectVisibilityToggle}
    onObjectDelete={handleObjectDelete}
  />
  
  <CT />
  <RT />

  <PROMPT 
    add3dModel={(file, metadata) => addModelToScene(file, metadata)} 
    pathTracingRender={(state)=>startPathTracing(state)} 
    {viewportLoading}
    {uploadError}
    BGimport={(image)=>changeBG(image)}
  />


  <VIEWPORT 
    bind:this={viewportRef}
    {newModel} 
    doneLoadingModel={() => {
      viewportLoading = false;
      console.log('Model loaded successfully:', currentModelInfo.name);
    }}
    onModelError={handleModelError}
    onSceneObjectsChanged={updateSceneObjects}
  />



  {#if uploadError}
    <div class="error-message">
      <p>{uploadError}</p>
      <button onclick={() => uploadError = null}>Dismiss</button>
    </div>
  {/if}
</main>

<style>

  /* #1a0611 */
  /* #230817 */
  main {
    box-sizing: border-box;
    position: relative;
    width: 100vw;
    height: 100vh;
    background: linear-gradient(to top, #170202, #140a0a);
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