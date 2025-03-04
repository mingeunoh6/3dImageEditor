<script>
import { onMount } from 'svelte';
import LT from '$lib/newcomp/LT.svelte';
import CT from '$lib/newcomp/CT.svelte';
import RT from '$lib/newcomp/RT.svelte';
import PROMPT from '$lib/newcomp/PROMPT.svelte';
import VIEWPORT from '$lib/newcomp/VIEWPORT.svelte';



onMount(() => {
    console.log('new page mounted');
});
</script>


<main>


<!-- left top tool section -->

<LT/>



<!-- center top tool section -->

<CT></CT>







<!-- right top tool section -->

<RT/>






<!-- bottom prompt input section -->

<PROMPT/>





<!-- 3d canvas section -->

<VIEWPORT/>



</main>
<style>

    main {
        box-sizing: border-box;
        position: relative;
        width: 100vw;
        height: 100vh;
        border: 5px solid green;
        
    }

</style>