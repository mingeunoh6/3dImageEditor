<script>
	import { onMount } from 'svelte';
	import Viewport from '../lib/components/viewport.svelte';
	import LNB from '../lib/components/LNB.svelte';
	let viewportRef;
	let glbFile = null;
	let bgFile = null;
	function handleGLBImport(event) {
		glbFile = event.detail.file;
	}

	function handleBGImport(event) {
		bgFile = event.detail.file;
		console.log('changeBG');
	}

	function handleSelectAsset(event) {
		const { assetName } = event.detail;
		viewportRef.loadNewModel(assetName);
	}

	function handleCameraFov(event) {
		const { fov } = event.detail;
		viewportRef.changeFov(fov);
	}

	function handleEnvMapIntensity(event) {
		const { envMapIntensity } = event.detail;
		viewportRef.changeEnvMapIntensity(envMapIntensity);
	}

	onMount(() => {
		console.log('Hello from the page component');
	});
</script>

<main>
	<section id="LNB">
		<LNB
			on:importGLB={handleGLBImport}
			on:importBG={handleBGImport}
			on:selectAsset={handleSelectAsset}
			on:changeFov={handleCameraFov}
			on:changeEnvMapIntensity={handleEnvMapIntensity}
		/>
	</section>
	<section id="Viewport">
		<Viewport {glbFile} {bgFile} bind:this={viewportRef} />
	</section>
</main>

<style>
	main {
		display: flex;
		padding: 0;
		margin: 0;
		flex-direction: row;

		height: 100%;
		width: 100%;
		overflow: hidden;
	}

	section {
		box-sizing: border-box;
		height: 100vh;
	}

	#LNB {
		min-width: 320px;
		width: 30vmin; /* 30% of the smaller viewport dimension */
		border: 1px solid black;
		background-color: lightgreen;
	}

	#Viewport {
		flex-grow: 1;
		border: 1px solid black;
		background-color: #323232;
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>
