<script>
    import { onMount } from "svelte";
    import { TutorialCanvas } from "./elements/tutorial-canvas";

let {

    viewportWidth,
    viewportHeight
   
} = $props()

let tutorialCanvas;
let tutorialScene;


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
function initTutorial(){
 tutorialScene = new TutorialCanvas(tutorialCanvas)
}


onMount(() => {
  console.log('TUTORIAL ACTIVE');
   resizeCanvas(viewportWidth,viewportHeight)
initTutorial()
  
});

</script>

<canvas bind:this={tutorialCanvas}></canvas>


<style>
    canvas {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        border: none;
        z-index: 990;
        border-radius: 16px;
    }

</style>
