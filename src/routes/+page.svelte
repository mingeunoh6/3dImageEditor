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

	function handleSubLightRot(event) {
		const { subLightRot } = event.detail;
		viewportRef.changeSubLightRot(subLightRot);
	}
	function handleSubLightIntensity(event) {
		const { lightId, lightIntensity } = event.detail;
		console.log(lightId, lightIntensity);
		viewportRef.changeSubLightIntensity(lightId, lightIntensity);
	}

	function handleSubLightStatus(event) {
		const { lightId, lightStatus } = event.detail;
		console.log(lightId, lightStatus);
		viewportRef.changeSubLightStatus(lightId, lightStatus);
	}
	function handleSubLightColor(event) {
		const { lightId, lightColor } = event.detail;
		console.log(lightId, lightColor);
		viewportRef.changeSubLightColor(lightId, lightColor);
	}

	function handleGridStatus(event) {
		const { gridStatus } = event.detail;
			console.log('gridStatus', gridStatus);
		viewportRef.changeGridStatus(gridStatus);
	}

	function handleShadow(event) {
		const {type, value } = event.detail;
		console.log(type, value);
		viewportRef.changeShadowStatus(type, value);
	}

	function handleEnvironment(event) {
		const { type, value } = event.detail;

		viewportRef.changeEnvMapSetting(type, value);
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
			on:changeSubLightRot={handleSubLightRot}
			on:changeSubLightIntensity={handleSubLightIntensity}
			on:changeSubLightStatus={handleSubLightStatus}
			on:changeSubLightColor={handleSubLightColor}
			on:changeGridStatus={handleGridStatus}
			on:changeShadow={handleShadow}
			on:changeEnvironment = {handleEnvironment}
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
		position: relative;
		min-width: 360px;
		width: 30vmin; /* 30% of the smaller viewport dimension */
	}

	#Viewport {
		flex-grow: 1;
	box-sizing: border-box;
		background-color: var(--background-color);
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>
