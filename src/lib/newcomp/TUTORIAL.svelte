<script>
    import { onMount } from "svelte";

let {

    viewportWidth,
    viewportHeight
   
} = $props()

let tutorialCanvas;


$effect(()=>{
   resizeCanvas(viewportWidth,viewportHeight)
})


function resizeCanvas(width, height){
    console.log('resizeMaskCanvas', width, height);
    
    if(tutorialCanvas){
   

        // Set display size (CSS)
        tutorialCanvas.style.width = `${width}px`;
        tutorialCanvas.style.height = `${height}px`;
        
   
        
    }
}


onMount(() => {
  console.log('TUTORIAL ACTIVE');
   resizeCanvas(viewportWidth,viewportHeight)
  
});

</script>

<canvas bind:this={tutorialCanvas}></canvas>


<style>
    canvas {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        border: 1px solid pink;
        z-index: 990;
        border-radius: 16px;
    }

</style>