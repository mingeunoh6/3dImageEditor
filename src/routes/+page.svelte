<script>
	import { onMount } from 'svelte';
	import Viewport from '../lib/components/viewport.svelte';
	import LNB from '../lib/components/LNB.svelte';

	let glbFile = null;
	function handleGLBImport(event) {
		glbFile = event.detail.file;
	}

	onMount(() => {
		console.log('Hello from the page component');
	});
</script>

<main>
	<section id="LNB">
		<LNB on:importGLB={handleGLBImport} />
	</section>
	<section id="Viewport">
		<Viewport {glbFile} />
	</section>
</main>

<style>
	main {
		display: flex;
		padding: 0;
		margin: 0;

		height: 100%;
		width: 100%;
	}

	section {
		box-sizing: border-box;
		height: 100vh;
	}

	#LNB {
		width: 20vmin; /* 30% of the smaller viewport dimension */
		border: 1px solid black;
		background-color: lightgreen;
	}

	#Viewport {
		flex-grow: 1;
		border: 1px solid black;
		background-color: #323232;
	}
</style>
