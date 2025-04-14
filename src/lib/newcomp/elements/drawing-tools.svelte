<!-- drawing-tools.svelte -->
<script>
  import Icon from '@iconify/svelte';
  import { fade } from 'svelte/transition';
  import MenuSlider from './menu-slider.svelte';

  let {
    activeMode = 'draw', // 'draw' or 'erase'
    onModeChange = (mode) => console.log('Mode changed to:', mode),
    brushSize = 20,
    eraserSize = 20,
    onBrushSizeChange = (size) => console.log('Brush size changed to:', size),
    onEraserSizeChange = (size) => console.log('Eraser size changed to:', size)
  } = $props();

  function handleModeChange(mode) {
    activeMode = mode;
    onModeChange(mode);
  }
</script>

<div class="drawing-tools" transition:fade>
  <div class="tool-group">
    <button 
      class="tool-button" 
      class:active={activeMode === 'draw'}
      on:click={() => handleModeChange('draw')}
      title="Draw Mode"
    >
      <Icon icon="mdi:pencil" />
    </button>
    <button 
      class="tool-button" 
      class:active={activeMode === 'erase'}
      on:click={() => handleModeChange('erase')}
      title="Erase Mode"
    >
      <Icon icon="mdi:eraser" />
    </button>
    
  </div>
   <div class="size-controls">
    {#if activeMode === 'draw'}
      <MenuSlider 
        value={brushSize}
        min={1}
        max={100}
        scale={1}
        name="Brush Size"
        unit="px"
        onValueChange={onBrushSizeChange}
      />
    {:else}
      <MenuSlider 
        value={eraserSize}
        min={1}
        max={100}
        scale={1}
        name="Eraser Size"
        unit="px"
        onValueChange={onEraserSizeChange}
      />
    {/if}
  </div>
 
</div>


<style>
  .drawing-tools {
    position: absolute;
    right: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    background: var(--glass-background);
     border-radius: 8px;
      padding: 8px;
     box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(2px);
    z-index: 100;
  
        border: 1px solid var(--dim-color);
  }

  .tool-group {
    display: flex;
    flex-direction: row;
    gap: 4px;
  }

  .tool-button {
    width: 36px;
        height: 36px;
    border: none;
    border-radius: 8px;
    background: var(--primary-color);
    color: var(--dim-color);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .tool-button:hover {
    background: var(--highlight-color);
    color: white;
  }

  .tool-button.active {
    background: var(--highlight-color);
    color: white;
  }

  .tool-button :global(svg) {
    width: 24px;
    height: 24px;
  }
  
  .size-controls {
 margin-top: 8px;
    width: 100%;
    border: 1px solid var(--dim-color);
    height: 10px;
   
  }
</style> 