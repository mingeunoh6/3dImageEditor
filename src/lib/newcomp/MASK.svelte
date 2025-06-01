<script>
import { onMount } from "svelte";
import MaskCanvas from "$lib/newcomp/elements/mask-canvas";
import MenuSlider from "$lib/newcomp/elements/menu-slider.svelte";
import { fade } from "svelte/transition";

// 글로벌 캔버스 상태 import
import { canvasState } from '$lib/stores/globalState.svelte.js';

let {
    maskingMode,
    // viewportWidth, viewportHeight를 props에서 제거하고 글로벌 상태 사용
    // viewportWidth,
    // viewportHeight,
    activeDrawingMode,
    newBrushSize,
    newEraserSize,
    sendMaskingData,
} = $props();

// 글로벌 상태에서 뷰포트 크기 참조
let viewportWidth = $derived(canvasState.viewportWidth);
let viewportHeight = $derived(canvasState.viewportHeight);

let brushHelper; 
let eraserHelper;
let helperX = $state(0);
let helperY = $state(0);
let isHelperVisible = $state(false);


$effect(()=> {
    console.log('maskingMode', maskingMode);

    if(maskingMode){
         // First resize the canvas with the current viewport dimensions
         resizeMaskCanvas(viewportWidth, viewportHeight);
         
         // Then restore saved drawing data if available
         restoreDrawingData();
    } else {
         // When masking mode is turned off, save the current state
         saveDrawingData();
    }
});

// Create a black and white mask from the current drawing
function createBWMask() {
    if (!maskCanvas || !ctx) return null;
    
    // Create an offscreen canvas for the B&W mask
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = maskCanvas.width;
    offscreenCanvas.height = maskCanvas.height;
    const offscreenCtx = offscreenCanvas.getContext('2d');
    
    if (!offscreenCtx) return null;
    
    // Fill with black background
    offscreenCtx.fillStyle = 'black';
    offscreenCtx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    
    // Get current canvas data
    const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const data = imageData.data;
    
    // Create a new image data for the B&W mask
    const maskImageData = offscreenCtx.createImageData(maskCanvas.width, maskCanvas.height);
    const maskData = maskImageData.data;
    
    // Convert to black and white mask
    // Any non-transparent pixel in the original becomes white in the mask
    for (let i = 0; i < data.length; i += 4) {
        // If pixel has any opacity (alpha > 0), make it white
        if (data[i + 3] > 0) {
            maskData[i] = 255;     // R
            maskData[i + 1] = 255; // G
            maskData[i + 2] = 255; // B
            maskData[i + 3] = 255; // A
        } else {
            // Keep it black (already filled with black)
            maskData[i + 3] = 255; // Make sure alpha is 255 for black pixels too
        }
    }
    
    // Put the B&W mask on the offscreen canvas
    offscreenCtx.putImageData(maskImageData, 0, 0);
    
    // Return the B&W mask as data URL
    return offscreenCanvas.toDataURL('image/png');
}

// Separate function to save the drawing state
function saveDrawingData() {
    console.log('saving')
    if (maskCanvas && ctx) {
        // Save the original drawing data for restoration
        originalDrawingData = maskCanvas.toDataURL('image/png');
        console.log('Original drawing data saved for restoration');
        
        // Create and save the B&W mask for export
        drawingData = createBWMask();
        sendMaskingData(drawingData)
    }
    //send to parent component
   
}

// Separate function to restore the drawing state
function restoreDrawingData() {
    if (originalDrawingData && maskCanvas && ctx) {
        // Always use source-over when restoring images to prevent transparency issues
        ctx.globalCompositeOperation = 'source-over';
        
        const img = new Image();
        img.onload = () => {
            // Clear the canvas first to ensure a clean slate
            ctx.clearRect(0, 0, maskCanvasWidth, maskCanvasHeight);
            // Draw the saved original image (not the B&W mask)
            ctx.drawImage(img, 0, 0, maskCanvasWidth, maskCanvasHeight);
            console.log('Original drawing data restored');
            
            // Only set drawing mode after restoration is complete
            // but don't apply eraser mode globally to the canvas
            if (currentMode === 'draw') {
                updateDrawingMode();
            }
        };
        img.src = originalDrawingData;
    }
}

$effect(()=> {
    console.log('activeDrawingMode', activeDrawingMode);
    console.log('brushSize', newBrushSize);
    console.log('eraserSize', newEraserSize);
   
      if(activeDrawingMode === 'draw'){
            currentMode = 'draw';
            currentBrushSize = newBrushSize;
            currentEraserSize = newEraserSize;
            
        }else if(activeDrawingMode === 'eraser'){
            currentMode = 'eraser';
            currentBrushSize = newBrushSize;
            currentEraserSize = newEraserSize;
          
        }
        
        // We don't update the drawing mode here as it would apply to the entire canvas
        // Instead, we'll only apply the drawing mode during actual draw operations
});

let maskCanvas;
let ctx = $state(null)
let drawingData = $state(null) // Stores the B&W mask image for export
let originalDrawingData = $state(null) // Stores the original drawing for display
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
    
    if(maskCanvas){
        // Get device pixel ratio for high quality on high-DPI displays
        const pixelRatio = window.devicePixelRatio || 1;
        
        // Get current context
        ctx = maskCanvas.getContext('2d');
        
        // Save important context properties
        const contextSettings = {
            lineWidth: ctx.lineWidth,
            strokeStyle: ctx.strokeStyle,
            fillStyle: ctx.fillStyle,
            globalAlpha: ctx.globalAlpha,
            globalCompositeOperation: ctx.globalCompositeOperation,
            lineCap: ctx.lineCap,
            lineJoin: ctx.lineJoin
        };
        
        // Store original image data
        const originalWidth = maskCanvas.width;
        const originalHeight = maskCanvas.height;
        const originalImageData = ctx.getImageData(0, 0, originalWidth, originalHeight);
        
        // Calculate new canvas size with pixel ratio for high resolution
        maskCanvasWidth = Math.floor(width);
        maskCanvasHeight = Math.floor(height);
        
        // Set display size (CSS)
        maskCanvas.style.width = `${maskCanvasWidth}px`;
        maskCanvas.style.height = `${maskCanvasHeight}px`;
        
        // Set actual size in memory (scaled to account for extra pixel density)
        maskCanvas.width = maskCanvasWidth * pixelRatio;
        maskCanvas.height = maskCanvasHeight * pixelRatio;
        
        // After resizing, we have the same context object but it's reset
        // Scale all drawing operations by the pixel ratio
        ctx.scale(pixelRatio, pixelRatio);
        
        // Create an offscreen high-resolution canvas
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = originalWidth;
        offscreenCanvas.height = originalHeight;
        const offscreenCtx = offscreenCanvas.getContext('2d');
        
        // Put the original pixel data
        if (offscreenCtx) {
            offscreenCtx.putImageData(originalImageData, 0, 0);
        }
        
        // Calculate the scale factor to maintain aspect ratio while filling canvas
        const scaleX = maskCanvasWidth / originalWidth;
        const scaleY = maskCanvasHeight / originalHeight;
        
        // For a mask, we likely want to fill the entire canvas
        ctx.drawImage(
            offscreenCanvas,
            0, 0, originalWidth, originalHeight,
            0, 0, maskCanvasWidth, maskCanvasHeight
        );
        
        // Restore context settings
        Object.assign(ctx, contextSettings);
        
        setupCanvasEvents();
    }
}



function getMousePos(e) {
    const rect = maskCanvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    
    // Calculate proper mouse position accounting for:
    // 1. Canvas position in viewport (rect)
    // 2. CSS vs actual canvas size difference
    // 3. Device pixel ratio
    
    // Get mouse position relative to canvas CSS size
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert to canvas coordinate system
    // This accounts for the difference between display size and actual canvas size
    const x = mouseX * (maskCanvas.width / rect.width / pixelRatio);
    const y = mouseY * (maskCanvas.height / rect.height / pixelRatio);
    
    return { x, y };
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
    
    ctx = maskCanvas.getContext('2d');
    const pos = getMousePos(e);
    
    // Apply the correct drawing mode only during the actual drawing operation
    if (currentMode === 'draw') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(255, 255, 255, 1.0)';
        ctx.lineWidth = currentBrushSize;
    } else { // Eraser mode
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
        ctx.lineWidth = currentEraserSize;
    }
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    // After drawing/erasing, restore to source-over to prevent accidental clearing
    if (currentMode === 'eraser') {
        ctx.globalCompositeOperation = 'source-over';
    }

    lastX = pos.x;
    lastY = pos.y;
}

function stopDrawing() {
    if (isDrawing && maskCanvas) {
        // Save the current drawing state when mouse is released
        // but only update the originalDrawingData, not the B&W mask
        originalDrawingData = maskCanvas.toDataURL('image/png');
        console.log('Original drawing data updated after drawing operation');
        saveDrawingData()
    }
    isDrawing = false;
}

// Function to update the canvas context based on current drawing mode
// But only apply these settings during actual drawing operations
function updateDrawingMode() {
    if (!ctx) return;
    
    if (currentMode === 'draw') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(255, 255, 255, 1.0)';
        ctx.lineWidth = currentBrushSize;
    } else {
        // Only set destination-out during actual erasing operations
        // but not during canvas setup or data restoration
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
        ctx.lineWidth = currentEraserSize;
    }
    ctx.lineCap = 'round';
}

function setupCanvasEvents() {
    // Remove existing event listeners
    maskCanvas.removeEventListener('mousedown', startDrawing);
    maskCanvas.removeEventListener('mousemove', draw);
    maskCanvas.removeEventListener('mouseup', stopDrawing);
    maskCanvas.removeEventListener('mouseout', stopDrawing);
    maskCanvas.removeEventListener('mousemove', handleMouseMove);
    maskCanvas.removeEventListener('mouseenter', handleMouseEnter);
    maskCanvas.removeEventListener('mouseleave', handleMouseLeave);
    
    // Add new event listeners
    maskCanvas.addEventListener('mousedown', startDrawing);
    maskCanvas.addEventListener('mousemove', draw);
    maskCanvas.addEventListener('mouseup', stopDrawing);
    maskCanvas.addEventListener('mouseout', stopDrawing);
    
    // Add mouse move event for helper tracking
    maskCanvas.addEventListener('mousemove', handleMouseMove);
    maskCanvas.addEventListener('mouseenter', handleMouseEnter);
    maskCanvas.addEventListener('mouseleave', handleMouseLeave);
    
    // Add touch event support for mobile devices
    maskCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        startDrawing(mouseEvent);
        
        // Update helper for touch start
        updateHelperPosition(touch.clientX, touch.clientY);
        isHelperVisible = true;
    });
    
    maskCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        draw(mouseEvent);
        
        // Update helper for touch move
        updateHelperPosition(touch.clientX, touch.clientY);
    });
    
    maskCanvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopDrawing();
        
        // Hide helper on touch end
        isHelperVisible = false;
    });
}

function handleMouseEnter(e) {
    isHelperVisible = true;
}

function handleMouseLeave(e) {
    isHelperVisible = false;
}

function handleMouseMove(e) {
    if (!isDrawing) {
        // Only update helper position when not drawing
        updateHelperPosition(e.clientX, e.clientY);
    } else {
        // Still update position while drawing
        updateHelperPosition(e.clientX, e.clientY);
    }
}

function updateHelperPosition(clientX, clientY) {
    if (!maskCanvas) return;
    
    // Convert client coordinates to canvas-relative coordinates
    const rect = maskCanvas.getBoundingClientRect();
    
    // Calculate the center position for the helper
    // We need to offset by half the helper size so the cursor is in the center
    const helperSize = currentMode === 'draw' ? currentBrushSize : currentEraserSize;
    helperX = clientX - (helperSize / 2);
    helperY = clientY - (helperSize / 2);
}

// Function to get the current B&W mask
// This can be called externally when the mask is needed
function getMask() {
    // Create and return a fresh B&W mask
    return createBWMask();
}

onMount(() => {
    console.log('mask canvas mounted');
    resizeMaskCanvas(viewportWidth, viewportHeight);
    
    // Always use source-over as the default composite operation
    // to prevent accidental clearing of the entire canvas
    if (maskCanvas && ctx) {
        ctx.globalCompositeOperation = 'source-over';
    }
    
    // Add global mouse move event for tracking outside the canvas
    // This helps with smooth transitions at canvas boundaries
    window.addEventListener('mousemove', (e) => {
        if (maskingMode && maskCanvas) {
            const rect = maskCanvas.getBoundingClientRect();
            
            // Check if mouse is inside canvas bounds
            if (
                e.clientX >= rect.left && 
                e.clientX <= rect.right && 
                e.clientY >= rect.top && 
                e.clientY <= rect.bottom
            ) {
                // Mouse is over canvas, update helper position
                updateHelperPosition(e.clientX, e.clientY);
                if (!isHelperVisible) isHelperVisible = true;
            } else {
                // Mouse is outside canvas, hide helper
                if (isHelperVisible) isHelperVisible = false;
            }
        }
    });
    
    // Cleanup function
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
    };
});
</script>

{#if maskingMode}
    <canvas 
        transition:fade 
        id="mask-canvas" 
        bind:this={maskCanvas}
    ></canvas>

    {#if isHelperVisible}
        {#if currentMode === 'draw'}
            <div 
                class="drawing-helper brush-helper" 
                bind:this={brushHelper}
                style="width: {currentBrushSize}px; height: {currentBrushSize}px; left: {helperX}px; top: {helperY}px;"
                transition:fade={{ duration: 150 }}
            ></div>
        {:else if currentMode === 'eraser'}
            <div 
                class="drawing-helper eraser-helper" 
                bind:this={eraserHelper}
                style="width: {currentEraserSize}px; height: {currentEraserSize}px; left: {helperX}px; top: {helperY}px;"
                transition:fade={{ duration: 150 }}
            ></div>
        {/if}
    {/if}
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

    .drawing-helper {
        position: fixed;
        z-index: 999;
        border: 1px solid var(--dim-color);
        border-radius: 50%;
        pointer-events: none;
        transform: translate(0, 0);
        transition: width 0.2s ease, height 0.2s ease;
    }

    .brush-helper {
        background-color: rgba(255, 255, 255, 0.5);
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.3);
    }
    
    .eraser-helper {
        background-color: rgba(255, 0, 0, 0.2);
        border: 1px dashed rgba(255, 255, 255, 0.8);
    }
</style>