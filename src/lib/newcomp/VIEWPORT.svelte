<script>
    import { onMount } from 'svelte';
    import Icon from '@iconify/svelte';
    import * as THREE from 'three';
    import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';


    let viewport;
    let viewportWidth = $state(0);
    let viewportHeight = $state(0);
    let isPortrait = $state(false);






         function setViewport() {
        viewportWidth = viewport.clientWidth;
        viewportHeight = viewport.clientHeight;
        
        // Check if the screen is portrait or landscape
        isPortrait = window.innerHeight > window.innerWidth;
        console.log(`Screen orientation: ${isPortrait ? 'Portrait' : 'Landscape'}`);
    }
    

    
    onMount(()=>{

    })






</script>





<canvas id="viewport" bind:this={viewport}></canvas>



<style>
    #viewport{
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        border: 5px solid orange;
    }

</style>