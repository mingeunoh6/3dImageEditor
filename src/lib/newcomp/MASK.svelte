<script>
import { onMount } from "svelte";
import MaskCanvas from "$lib/newcomp/elements/mask-canvas";
import MenuSlider from "$lib/newcomp/elements/menu-slider.svelte";
import { fade } from "svelte/transition";

let {
    maskingMode,
    viewportWidth,
    viewportHeight,
    activeDrawingMode,
    newBrushSize,
    newEraserSize
} = $props();

$effect(()=>{
    console.log('maskingMode', maskingMode);
    console.log('activeDrawingMode', activeDrawingMode);
    console.log('brushSize', newBrushSize);
    console.log('eraserSize', newEraserSize);
    if(maskingMode){
         resizeMaskCanvas(viewportWidth, viewportHeight);

       
    }
      if(activeDrawingMode === 'draw'){
            currentMode = 'draw';
            currentBrushSize = newBrushSize;
            currentEraserSize = newEraserSize;
        }else if(activeDrawingMode === 'eraser'){
            currentMode = 'eraser';
            currentBrushSize = newBrushSize;
            currentEraserSize = newEraserSize;
        }
});

let maskCanvas;
let maskCanvasWidth = $state(0);
let maskCanvasHeight = $state(0);
let isDrawing = $state(false);
let lastX = $state(0);
let lastY = $state(0);
let currentMode = $state('draw');
let currentBrushSize = $state(20);
let currentEraserSize = $state(20);


function resizeMaskCanvas(width, height){
    console.log('resizeMaskCanvas', width, height);
    maskCanvasWidth = width;
    maskCanvasHeight = height;
    if(maskCanvas){
        maskCanvas.width = maskCanvasWidth;
        maskCanvas.height = maskCanvasHeight;
        initializeCanvas();
        setupCanvasEvents();
    }
}

function initializeCanvas() {
    const ctx = maskCanvas.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, maskCanvasWidth, maskCanvasHeight);
}



function getMousePos(e) {
    const rect = maskCanvas.getBoundingClientRect();
    const scaleX = maskCanvas.width / rect.width;
    const scaleY = maskCanvas.height / rect.height;
    
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

function startDrawing(e) {
    console.log('startDrawing');
    isDrawing = true;
    const pos = getMousePos(e);
    lastX = pos.x;
    lastY = pos.y;
}

function draw(e) {
    if (!isDrawing) return;
    
    const ctx = maskCanvas.getContext('2d');
    const pos = getMousePos(e);
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    
    if (currentMode === 'draw') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(255, 255, 255, 1.0)';
        ctx.lineWidth = currentBrushSize;
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0)';
        ctx.lineWidth = currentEraserSize;
    }
    
    ctx.lineCap = 'round';
    ctx.stroke();

    lastX = pos.x;
    lastY = pos.y;
}

function stopDrawing() {
    isDrawing = false;
}

function setupCanvasEvents() {
    // Remove existing event listeners
    maskCanvas.removeEventListener('mousedown', startDrawing);
    maskCanvas.removeEventListener('mousemove', draw);
    maskCanvas.removeEventListener('mouseup', stopDrawing);
    maskCanvas.removeEventListener('mouseout', stopDrawing);
    
    // Add new event listeners
    maskCanvas.addEventListener('mousedown', startDrawing);
    maskCanvas.addEventListener('mousemove', draw);
    maskCanvas.addEventListener('mouseup', stopDrawing);
    maskCanvas.addEventListener('mouseout', stopDrawing);
}

onMount(() => {
    console.log('mask canvas mounted');
    resizeMaskCanvas(viewportWidth, viewportHeight);
});
</script>

{#if maskingMode}
    <canvas 
        transition:fade 
        id="mask-canvas" 
        bind:this={maskCanvas}
    ></canvas>

{/if}

<style>
    #mask-canvas {
        box-sizing: border-box;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        border: 1px solid var(--highlight-color);
        border-radius: 16px;
        cursor: crosshair;
        touch-action: none;
        pointer-events: auto;
        background-color: rgba(22, 255, 45, 0.3);
        opacity: 0.8;
    }
    
    .drawing-controls {
        position: fixed;
        right: 20px;
        top: 50%;
        transform: translateY(-50%);
        z-index: 1000;
    }
</style>