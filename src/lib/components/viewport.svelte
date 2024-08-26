<script>
	// @ts-ignore
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/addons/controls/OrbitControls';
	import HDRLoader from '$lib/components/functions/hdri';
	import GLBImporter from '$lib/components/functions/importFile';
	import GLBModelController from '$lib/components/functions/transform';
	import CustomDirectionalLight from '$lib/components/functions/directionalLight';
	import { TransformControls } from 'three/addons/controls/TransformControls';

	export let glbFile = null;
	export let bgFile = null;

	let scene, camera, renderer, renderRenderer, passRenderer, controls, canvas;
	let scene1, scene2;
	let renderCanvas, passCanvas;
	let originalCube, redCube;
	let glbImporter;
	let hdrLoader;
	let transformController;
	let raycaster, mouse;
	let unSelectableObjects = [];
	let addedModel = [];
	let renderpass1obj;
	let renderpass2obj;
	let currentSelectedObj = null;
	let textureloader = new THREE.TextureLoader();
	let controller;
	let controlGroup;
	let envMapTexture;

	$: if (bgFile) {
		console.log('bgFile', bgFile);

		changeBackground(bgFile);
	}

	$: if (glbFile) {
		clearScene();
		resetTransform();
		glbImporter
			.importGLB(glbFile)
			.then((model) => {
				console.log('GLB model added to the scene', model);

				addedModel.push(model);
			})
			.catch((error) => {
				console.error('Error importing GLB file', error);
			});

		glbFile = null;
	}

	async function changeBackground(bgFile) {
		console.log('dd', bgFile);

		hdrLoader
			.loadImageBackground(bgFile)
			.then((texture) => {
				console.log('texture', texture);
			})
			.catch((error) => {
				console.error('Error loading HDR:', error);
			});
		bgFile = null;
	}

	function changeEnvMapIntensity(intensity) {
		if (addedModel.length > 0) {
			addedModel[0].traverse((child) => {
				if (child.isMesh) {
					child.material.envMapIntensity = intensity;
					child.material.needsUpdate = true;
				}
			});
		}
	}

	function clearScene() {
		//reset glb imported outside

		//reset scene
		while (controlGroup.children.length > 0) {
			controlGroup.remove(controlGroup.children[0]);
		}

		//reset scene1
		while (scene1.children.length > 0) {
			scene1.remove(scene1.children[0]);
		}

		//reset scene2
		while (scene2.children.length > 0) {
			scene2.remove(scene2.children[0]);
		}

		//clean up renderers

		if (renderer) {
			renderer.dispose();
		}

		if (renderRenderer) {
			renderRenderer.dispose();
		}

		if (passRenderer) {
			passRenderer.dispose();
		}

		if (addedModel.length > 0) {
			addedModel = [];
		}
	}

	// Function to load a new GLB model
	function loadNewModel(assetName) {
		clearScene();
		resetTransform();
		const filePath = `glb/${assetName}`; // Update this path as needed
		fetch(filePath)
			.then((res) => res.blob())
			.then((blob) => {
				const file = new File([blob], assetName);
				glbImporter
					.importGLB(file)
					.then((model) => {
						console.log('GLB model added to the scene', model);
						if (envMapTexture) {
							model.traverse((child) => {
								if (child.isMesh) {
									child.material.envMap = envMapTexture;
									child.material.envMapIntensity = 10;
									child.material.needsUpdate = true;
								}
							});
						}
						addedModel.push(model);
					})
					.catch((error) => console.error('Error loading model:', error));
			});

		if (bgFile) {
			changeBackground(bgFile);
			changeEnvMapIntensity(intensity);
		}
	}

	function changeFov(fov) {
		camera.fov = fov;
		camera.updateProjectionMatrix();

		console.log('Camera FOV changed to:', fov);
	}

	async function init() {
		scene = new THREE.Scene();
		scene1 = new THREE.Scene();
		scene2 = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(10, canvas.clientWidth / canvas.clientHeight, 0.01, 1000);
		raycaster = new THREE.Raycaster();
		mouse = new THREE.Vector2();
		// Main renderer
		renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
		renderer.setSize(canvas.clientWidth, canvas.clientHeight);
		renderer.setPixelRatio(window.devicePixelRatio);
		//shadows
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Use soft shadows for smoother edges
		renderer.shadowMap.bias = 0.0001;
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.0;

		// Render renderer
		renderRenderer = new THREE.WebGLRenderer({
			canvas: renderCanvas,
			antialias: true
		});
		renderRenderer.setSize(renderCanvas.clientWidth, renderCanvas.clientHeight);
		renderRenderer.setPixelRatio(window.devicePixelRatio);

		// Pass renderer
		passRenderer = new THREE.WebGLRenderer({ canvas: passCanvas, antialias: true });
		passRenderer.setSize(passCanvas.clientWidth, passCanvas.clientHeight);
		passRenderer.setPixelRatio(window.devicePixelRatio);

		camera.position.z = 5;
		controls = new OrbitControls(camera, renderer.domElement);
		controls.update();

		controller = new TransformControls(camera, renderer.domElement);
		console.log('controller', controller);
		controller.addEventListener('dragging-changed', function (event) {
			controls.enabled = !event.value;
		});

		//plane
		const planeGeometry = new THREE.PlaneGeometry(100, 100);
		const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.5 });
		const plane = new THREE.Mesh(planeGeometry, planeMaterial);
		plane.receiveShadow = true;
		plane.rotation.x = -Math.PI / 2;
		plane.position.y = -0.5;
		// scene.add(plane);

		plane.receiveShadow = true;

		//create grid plane
		// const gridHelper = new THREE.GridHelper(10, 10);
		// scene.add(gridHelper);
		// //add to unselectable objects
		// unSelectableObjects.push(gridHelper);

		//add object control group
		controlGroup = new THREE.Group();
		scene.add(controlGroup);
		controlGroup.position.set(0, 0, 0);

		//glbImport
		glbImporter = new GLBImporter(scene, controlGroup);

		// hdr;
		hdrLoader = new HDRLoader(scene, renderer);
		try {
			await hdrLoader.loadHDR('/hdri/brown_photostudio_02_1k.hdr');
		} catch (error) {
			console.error('Error loading HDR:', error);
		}

		//background
		// // Load background texture

		// Add custom directional lights
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
		scene.add(ambientLight);
		const directionalLight1 = new CustomDirectionalLight(0xffffff, 1, [0, 3, -3]);
		const directionalLight2 = new CustomDirectionalLight(0xffffff, 1, [-2, 3, 2]);
		const directionalLight3 = new CustomDirectionalLight(0xffffff, 1, [2, 3, 2]);
		const lightHelper1 = new THREE.DirectionalLightHelper(directionalLight1.light, 5);
		const lightHelper2 = new THREE.DirectionalLightHelper(directionalLight2.light, 5);
		const lightHelper3 = new THREE.DirectionalLightHelper(directionalLight3.light, 5);
		// scene.add(lightHelper1);
		// scene.add(lightHelper2);
		// scene.add(lightHelper3);
		directionalLight1.addToScene(scene);
		directionalLight2.addToScene(scene);
		directionalLight3.addToScene(scene);
		//viewport selector

		canvas.addEventListener('click', onSelect, false);
		window.addEventListener('keydown', handleKeyDown);
		// Add resize event listener
		window.addEventListener('resize', onWindowResize, false);
		animate();

		function animate() {
			requestAnimationFrame(animate);

			renderer.render(scene, camera);

			// Temporarily replace the original cube with the red cube for the render canvas
		}
	}

	function onSelect(event) {
		console.log('onSelect');
		// Get mouse position in normalized device coordinates (-1 to +1) for both components
		const rect = canvas.getBoundingClientRect();
		mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

		// Create a raycaster and set its position based on the mouse coordinates
		raycaster.setFromCamera(mouse, camera);

		// Check for intersections with objects in the scene
		const intersects = raycaster.intersectObjects(scene.children, true);

		if (intersects.length > 0) {
			if (controller.object) {
				return;
			}
			controller.detach();
			// Get the first intersected object
			let currentOBJ = controlGroup;

			console.log('Attaching controller to:', currentOBJ);
			// Ensure controller is added to scene and set to visible
			if (!scene.children.includes(controller)) {
				scene.add(controller);
			}

			controller.attach(currentOBJ);
			controller.space = 'local';
			controller.visible = true;
		} else {
			// Optionally handle the case where no object was selected
			console.log('No object selected');

			controller.detach();
			scene.remove(controller);
			controller.visible = false;
		}
	}
	function handleKeyDown(event) {
		switch (event.key) {
			case 'q': // Disable TransformControls
				controller.detach();
				break;
			case 'w': // Translate
				controller.setMode('translate');
				break;
			case 'e': // Rotate
				controller.setMode('rotate');
				break;
			case 'r': // Scale
				controller.setMode('scale');
				break;
		}
	}

	function changeTransformMode(event) {
		if (!controller.object) {
			alert('선택된 모델이 없습니다');
			return;
		}

		const mode = event.target.innerText;
		switch (mode) {
			case '이동':
				controller.setMode('translate');
				break;
			case '회전':
				controller.setMode('rotate');
				break;
			case '크기':
				controller.setMode('scale');
				break;
		}
	}

	function resetTransform() {
		if (controller.object) {
			controller.object.position.set(0, 0, 0);
			controller.object.rotation.set(0, 0, 0);
			controller.object.scale.set(1, 1, 1);
		}
	}

	function disableOrbitControl() {
		controls.enabled = false;
	}

	function imageOutputRender() {
		//clear scene
		//reset scene1
		while (scene1.children.length > 0) {
			scene1.remove(scene1.children[0]);
		}

		//reset scene2
		while (scene2.children.length > 0) {
			scene2.remove(scene2.children[0]);
		}

		if (controller) {
			controller.detach();
		}
		if (addedModel.length === 0) {
			console.error('No model added to the scene');
			alert('Please upload product model first.');
			return;
		}

		// Create off-screen renderers
		// Reuse or create off-screen renderers
		if (!this.offscreenRenderRenderer) {
			this.offscreenRenderRenderer = new THREE.WebGLRenderer({ antialias: true });
			this.offscreenRenderRenderer.setSize(1024, 1024);
		} else {
			this.offscreenRenderRenderer.clear();
		}

		if (!this.offscreenPassRenderer) {
			this.offscreenPassRenderer = new THREE.WebGLRenderer({ antialias: true });
			this.offscreenPassRenderer.setSize(1024, 1024);
		} else {
			this.offscreenPassRenderer.clear();
		}

		if (!this.offscreenMainRenderer) {
			this.offscreenMainRenderer = new THREE.WebGLRenderer({ antialias: true });
			this.offscreenMainRenderer.setSize(1024, 1024);
		} else {
			this.offscreenMainRenderer.clear();
		}

		// Clone object for render pass 1
		const maskMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
		maskMat.side = THREE.DoubleSide;
		maskMat.alphaTest = 0.5;
		renderpass1obj = controlGroup.clone();
		renderpass1obj.traverse((child) => {
			if (child.isMesh) {
				child.material = maskMat;
			}
		});

		scene1.add(renderpass1obj);
		console.log('Image output render');
		renderRenderer.render(scene1, camera);
		this.offscreenRenderRenderer.render(scene1, camera);

		// Clone object for render pass 2
		renderpass2obj = controlGroup.clone();
		let objectMatlist = [];
		renderpass2obj.traverse((child) => {
			if (child.isMesh && child.material) {
				objectMatlist.push(child.material);
			}
		});
		renderpass2obj.traverse((child) => {
			if (child.isMesh && child.material && objectMatlist.includes(child.material)) {
				if (child.material === objectMatlist[0]) {
					child.material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
				} else if (child.material === objectMatlist[1]) {
					child.material = new THREE.MeshBasicMaterial({ color: 0x0000ff });
				} else if (child.material === objectMatlist[2]) {
					child.material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
				} else if (child.material === objectMatlist[3]) {
					child.material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
				} else if (child.material === objectMatlist[4]) {
					child.material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
				} else if (child.material === objectMatlist[5]) {
					child.material = new THREE.MeshBasicMaterial({ color: 0xff00ff });
				} else if (child.material === objectMatlist[6]) {
					child.material = new THREE.MeshBasicMaterial({ color: 0x0ffff0 });
				} else if (child.material === objectMatlist[7]) {
					child.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
				} else if (child.material === objectMatlist[8]) {
					child.material = new THREE.MeshBasicMaterial({ color: 0x00ffd0 });
				} else if (child.material === objectMatlist[9]) {
					child.material = new THREE.MeshBasicMaterial({ color: 0xffd000 });
				} else {
					child.material = new THREE.MeshBasicMaterial({ color: 0x444444 });
				}
			}
		});

		scene2.add(renderpass2obj);
		console.log('Pass output render');
		passRenderer.render(scene2, camera);
		this.offscreenPassRenderer.render(scene2, camera);

		// Render the main scene to the off-screen renderer
		this.offscreenMainRenderer.render(scene, camera);

		// Save rendered scenes as PNG images from off-screen renderers
		const renderDataUrl = this.offscreenRenderRenderer.domElement.toDataURL('image/png');
		const passDataUrl = this.offscreenPassRenderer.domElement.toDataURL('image/png');
		const viewportDataUrl = this.offscreenMainRenderer.domElement.toDataURL('image/png');

		// Create download links
		setTimeout(() => {
			downloadImage(viewportDataUrl, 'viewport_scene.png');
			downloadImage(renderDataUrl, 'rendered_scene.png');
			downloadImage(passDataUrl, 'pass_scene.png');

			// Clean up off-screen renderers
			this.offscreenRenderRenderer.dispose();
			this.offscreenPassRenderer.dispose();
			this.offscreenMainRenderer.dispose();
		}, 1000);
	}
	function downloadImage(dataUrl, fileName) {
		const link = document.createElement('a');
		link.href = dataUrl;
		link.download = fileName;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	function onWindowResize() {
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;

		camera.aspect = width / height;
		camera.updateProjectionMatrix();

		renderer.setSize(width, height);
	}

	onMount(() => {
		console.log('viewport component mounted');
		init();

		return () => {
			// Cleanup on destroy
			renderer.dispose();

			transformController.dispose();

			renderer.dispose();
			controls.dispose();
			controller.dispose();
			canvas.removeEventListener('click', onSelect);
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('resize', onWindowResize);
		};
	});

	export { loadNewModel, changeFov, changeEnvMapIntensity };
</script>

<div id="viewport-main-wrapper">
	<div id="viewport-wrapper">
		<canvas id="viewport" bind:this={canvas}> </canvas>
		<div id="preview-wrapper">
			<canvas id="render-canvas" bind:this={renderCanvas}></canvas>
			<canvas id="pass-canvas" bind:this={passCanvas}></canvas>
		</div>
	</div>
	<div id="viewport-menu">
		<button on:click={imageOutputRender}>제품 이미지 / 제품 마스크 다운로드</button>
	</div>
	<div id="transform-tool">
		<button class="transform-btn" on:click={changeTransformMode}>이동</button>
		<button class="transform-btn" on:click={changeTransformMode}>회전</button>
		<button class="transform-btn" on:click={changeTransformMode}>크기</button>
	</div>
</div>

<style>
	#viewport-main-wrapper {
		position: relative;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}
	#viewport-menu {
		width: 80%;
		height: 64px;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}
	#viewport-wrapper {
		box-sizing: border-box;
		display: flex;
		justify-content: center;
		align-items: flex-start;
	}

	#transform-tool {
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		position: absolute;
		left: 0;
		top: 0;
		z-index: 100;
		padding: 6px;
	}

	#transform-tool button {
		box-sizing: border-box;
		width: 72px;
		height: 72px;
		border: 1px solid var(--primary-color);

		margin-bottom: 6px;
	}
	#transform-tool button:hover {
		background-color: var(--accent-color);
	}

	#viewport {
		box-sizing: border-box;
		width: 80vmin; /* 50% of the smaller viewport dimension */
		height: 80vmin;
		border: 1px solid black;
		background-color: var(--background-color);
	}

	#preview-wrapper {
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		margin-left: 0; /* Space between viewport and side canvases */
	}

	#render-canvas,
	#pass-canvas {
		box-sizing: border-box;
		width: 40vmin; /* 50% of the viewport canvas size */
		height: 40vmin;
		border: 1px solid black;
		background-color: var(--accent-hover-color);
		margin-bottom: 0; /* Space between render and pass canvases */
	}

	#pass-canvas {
		margin-bottom: 0; /* Remove margin from the last canvas */
	}

	button {
		box-sizing: border-box;
		width: 80%;
		height: 42px;
		border: none;
		background-color: var(--secondary-color);
		color: var(--text-color);
	}

	button:hover {
		background-color: var(--accent-color);
		cursor: pointer;
	}

	@media (max-width: 768px) {
	}

	@media (max-width: 1024px) {
	}

	@media (min-width: 1024px) {
	}
</style>
