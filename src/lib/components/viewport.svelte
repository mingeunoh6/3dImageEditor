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
	import ShadowGround from '$lib/components/functions/ground.js';
	import ShadowLight from '$lib/components/functions/shadowLight.js';

	export let glbFile = null;
	export let bgFile = null;

	let scaleFactor = 2;
	let scene, camera, renderer, maskRenderer, passRenderer, controls, canvas;
	let ambientLight;
	let scene1, scene2;
	let maskCanvas, passCanvas;
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
	let envMapIntensity;
	let envMapRotation;
	let ground;
	let isGrid = false;
	let lights = [];
	let isBackground = true;
	let shadowLight;
	let shadowOpacity = 0.5;
	let shadowDistance = 0;
	let shadowSize = 10;
	let shadowRotation = 0;
	let isShadowHelper = false;

	$: if (bgFile) {
		console.log('bgFile', bgFile);
		changeBackground(bgFile);
	}

	$: if (glbFile) {
		console.log('glbFile', glbFile);
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

		if (document.getElementById('overlay').style.display !== 'none') {
			hideOverlay();
		}

		console.log('added', addedModel);
		glbFile = null;
	}

	function hideOverlay() {
		document.getElementById('overlay').style.display = 'none';
	}

	async function changeBackground(bgFile) {
		hdrLoader
			.loadImageBackground(bgFile)
			.then((texture) => {
				console.log('texture', texture);
			})
			.catch((error) => {
				console.error('Error loading HDR:', error);
			});
		if (document.getElementById('overlay').style.display !== 'none') {
			hideOverlay();
		}
		bgFile = null;
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
		// while (scene2.children.length > 0) {
		// 	scene2.remove(scene2.children[0]);
		// }

		//clean up renderers

		if (renderer) {
			renderer.dispose();
		}

		if (maskRenderer) {
			maskRenderer.dispose();
		}

		// if (passRenderer) {
		// 	passRenderer.dispose();
		// }

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
						glbFile = null;
					})
					.catch((error) => console.error('Error loading model:', error));
			});
		if (document.getElementById('overlay').style.display !== 'none') {
			hideOverlay();
		}
		if (bgFile) {
			changeBackground(bgFile);
		}
	}

	function changeFov(fov) {
		camera.fov = fov;
		camera.updateProjectionMatrix();

		console.log('Camera FOV changed to:', fov);
	}

	function changeGridStatus(gridStatus) {
		console.log('gridStatus changed to', gridStatus);
		isGrid = gridStatus;
		if (ground) {
			ground.gridOption(isGrid);
		}
	}

	function changeEnvMapSetting(type, value){
		if(!isBackground){
			
			return;
		}
		switch(type){
			case 'intensity':
				envMapIntensity = value;
				scene.environmentIntensity = envMapIntensity;
				break;
			case 'rotation':
				envMapRotation = value;
				scene.environmentRotation.y= envMapRotation*Math.PI/180
				break;
		}
	}

	function changeShadowStatus(type, value) {
		switch (type) {
			case 'opacity':
				shadowOpacity = value;
				ground.shadowOpacity(shadowOpacity);
				break;
			case 'distance':
				shadowDistance = value;
				shadowLight.changeDistance(shadowDistance);
				break;
			case 'size':
				shadowSize = value;
				shadowLight.changeSize(shadowSize);
				break;
			case 'rotation':
				shadowRotation = value;
				shadowLight.changeRotation(shadowRotation);
				break;
				case 'helper':
					isShadowHelper = value;
					shadowLight.toggleShadowHelper(isShadowHelper);
					break;

		}
	}

	function changeSubLightRot(rot) {
		const lightGroup = scene.getObjectByName('baseLightGroup');
		lightGroup.rotation.y = rot;
	}

	function changeSubLightIntensity(lightId, intensity) {
		if (lights.length === 0) {
			console.error('No lights in the scene');
			return;
		}
		switch (lightId) {
			case 0:
				ambientLight.intensity = intensity;
				break;
			case 1:
				lights[0].changeIntensity(intensity);
				break;
			case 2:
				lights[1].changeIntensity(intensity);
				break;
			case 3:
				lights[2].changeIntensity(intensity);
				break;
		}
		// lights.forEach((light) => {
		// 	light.changeIntensity(intensity);
		// });
	}

	function changeSubLightColor(lightId, lightColor) {
		if (lights.length === 0) {
			console.error('No lights in the scene');
			return;
		}
		switch (lightId) {
			case 0:
				let newColor = new THREE.Color(lightColor);
				ambientLight.color = newColor;
				break;
			case 1:
				lights[0].changeColor(lightColor);
				break;
			case 2:
				lights[1].changeColor(lightColor);
				break;
			case 3:
				lights[2].changeColor(lightColor);
				break;
		}
	}

	function changeSubLightStatus(lightId, lightStatus) {
		if (lights.length === 0) {
			console.error('No lights in the scene');
			return;
		}
		switch (lightId) {
			case 0:
				ambientLight.visible = lightStatus;
				break;
			case 1:
				lights[0].changeVisible(lightStatus);
				break;
			case 2:
				lights[1].changeVisible(lightStatus);
				break;
			case 3:
				lights[2].changeVisible(lightStatus);
				break;
		}
	}

	async function init() {
		scene = new THREE.Scene();
		scene1 = new THREE.Scene();
		// scene2 = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(10, canvas.clientWidth / canvas.clientHeight, 0.01, 10000);
		raycaster = new THREE.Raycaster();
		mouse = new THREE.Vector2();
		// Main renderer
		renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			antialias: true,
			logarithmicDepthBuffer: true
		});
		setRendererResolution(renderer, canvas, scaleFactor);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		//shadows
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Use soft shadows for smoother edges
		renderer.shadowMap.needsUpdate = true;
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.0;

		// Render renderer
		maskRenderer = new THREE.WebGLRenderer({
			canvas: maskCanvas,
			antialias: true
		});
		setRendererResolution(maskRenderer, maskCanvas, scaleFactor);
		maskRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		// // Pass renderer
		// passRenderer = new THREE.WebGLRenderer({ canvas: passCanvas, antialias: true });
		// setRendererResolution(passRenderer, passCanvas,scaleFactor);
		// passRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		camera.position.z = 5;

		//set initial renderer, canvas size and resolution in square aspect ratio
		resizeCanvasAndRenderers(1, scaleFactor);

		//orbit control
		controls = new OrbitControls(camera, renderer.domElement);
		controls.update();

		controller = new TransformControls(camera, renderer.domElement);
		controller.addEventListener('dragging-changed', function (event) {
			controls.enabled = !event.value;
		});

		//제품 모델 컨트롤 그룹
		controlGroup = new THREE.Group();
		scene.add(controlGroup);
		controlGroup.position.set(0, 0, 0);

		//glbImport
		glbImporter = new GLBImporter(scene, controlGroup);

		// hdr;
		hdrLoader = new HDRLoader(scene, renderer, resizeCanvasAndRenderers, scaleFactor);
		hdrLoader.loadDefaultHDR();

		// Add 3점 조명
		ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
		scene.add(ambientLight);
		const backLight = new CustomDirectionalLight(0xffffff, 0.3, [0, 4, -2], 'back');
		const keyLight = new CustomDirectionalLight(0xffffff, 1.2, [-2, 4, 2], 'key');
		const fillLight = new CustomDirectionalLight(0xffffff, 0.7, [2, 4, 2], 'fill');
		const lightHelper1 = new THREE.DirectionalLightHelper(keyLight.light, 5);
		const lightHelper2 = new THREE.DirectionalLightHelper(fillLight.light, 5);
		const lightHelper3 = new THREE.DirectionalLightHelper(backLight.light, 5);
		// scene.add(lightHelper1);
		// scene.add(lightHelper2);
		// scene.add(lightHelper3);
		keyLight.addToScene(scene);
		fillLight.addToScene(scene);
		backLight.addToScene(scene);

		// Add lights to the lights array
		lights.push(keyLight);
		lights.push(fillLight);
		lights.push(backLight);

		//Create shadow group
		shadowLight = new ShadowLight(shadowDistance, shadowSize, shadowRotation);
		shadowLight.addToScene(scene);
		shadowLight.toggleShadowHelper(isShadowHelper);

		const baseLightGroup = new THREE.Group();
		baseLightGroup.add(keyLight.light);
		baseLightGroup.add(fillLight.light);
		baseLightGroup.add(backLight.light);

		baseLightGroup.position.set(0, 0, 0);
		baseLightGroup.name = 'baseLightGroup';
		scene.add(baseLightGroup);

		//shadow Ground
		ground = new ShadowGround(1000);
		ground.addToScene(scene);

		//grid
		ground.addGrid(scene);
		ground.gridOption(isGrid);

		// Add event listeners
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

	//오브젝트 선택 이벤트
	function onSelect(event) {
		// Get mouse position in normalized device coordinates (-1 to +1) for both components
		const rect = canvas.getBoundingClientRect();
		mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

		// Create a raycaster and set its position based on the mouse coordinates
		raycaster.setFromCamera(mouse, camera);

		// Check for intersections with objects in the scene
		const intersects = raycaster.intersectObjects(scene.children, true);

		if (intersects.length > 0) {
			let selectedObject = intersects[0].object;
			// Check if the selected object is the ground or grid
			if (selectedObject.name === 'ground' || selectedObject.name === 'grid') {
				return;
			}

			if (controller.object) {
				return;
			}
			controller.detach();
			// Get the first intersected object
			let currentOBJ = controlGroup;

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

	function imageOutputRender() {
		//clear scene
		//reset scene1
		while (scene1.children.length > 0) {
			scene1.remove(scene1.children[0]);
		}

		//reset scene2
		// while (scene2.children.length > 0) {
		// 	scene2.remove(scene2.children[0]);
		// }

		if (controller) {
			controller.detach();
		}

		// 그리드 제거
		if (ground) {
			ground.gridOption(false);
		}
		//helper 제거
		if (shadowLight) {
			shadowLight.toggleShadowHelper(false);
		}

		if (addedModel.length === 0) {
			console.error('No model added to the scene');
			alert('Please upload product model first.');
			return;
		}

		// Create off-screen renderers
		// Reuse or create off-screen renderers

		// Adjust this value to increase/decrease resolution
		const aspectRatio = maskCanvas.width / maskCanvas.height;
		const offscreenWidth = 1024 * scaleFactor;
		const offscreenHeight = offscreenWidth / aspectRatio;

		if (!this.offscreenMaskRenderer) {
			this.offscreenMaskRenderer = new THREE.WebGLRenderer({ antialias: true });
			this.offscreenMaskRenderer.setSize(offscreenWidth, offscreenHeight);
			this.offscreenMaskRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		} else {
			this.offscreenMaskRenderer.setSize(offscreenWidth, offscreenHeight);
			this.offscreenMaskRenderer.clear();
		}

		// if (!this.offscreenPassRenderer) {
		// 	this.offscreenPassRenderer = new THREE.WebGLRenderer({ antialias: true });
		// 	this.offscreenPassRenderer.setSize(offscreenWidth, offscreenHeight);
		// 	this.offscreenPassRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		// } else {
		// 	this.offscreenPassRenderer.setSize(offscreenWidth, offscreenHeight);
		// 	this.offscreenPassRenderer.clear();
		// }

		if (!this.offscreenMainRenderer) {
			this.offscreenMainRenderer = new THREE.WebGLRenderer({
				alpha: true,
				antialias: true,
				logarithmicDepthBuffer: true
			});
			this.offscreenMainRenderer.setSize(offscreenWidth, offscreenHeight);
			this.offscreenMainRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
			//shadows
			this.offscreenMainRenderer.shadowMap.enabled = true;
			this.offscreenMainRenderer.shadowMap.type = THREE.PCFSoftShadowMap; // Use soft shadows for smoother edges

			this.offscreenMainRenderer.outputColorSpace = THREE.SRGBColorSpace;
			this.offscreenMainRenderer.toneMapping = THREE.ACESFilmicToneMapping;
			this.offscreenMainRenderer.toneMappingExposure = 1.0;
		} else {
			this.offscreenMainRenderer.setSize(offscreenWidth, offscreenHeight);
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
		maskRenderer.render(scene1, camera);
		this.offscreenMaskRenderer.render(scene1, camera);

		// // Clone object for render pass 2
		// renderpass2obj = controlGroup.clone();
		// let objectMatlist = [];
		// renderpass2obj.traverse((child) => {
		// 	if (child.isMesh && child.material) {
		// 		objectMatlist.push(child.material);
		// 	}
		// });
		// renderpass2obj.traverse((child) => {
		// 	if (child.isMesh && child.material && objectMatlist.includes(child.material)) {
		// 		if (child.material === objectMatlist[0]) {
		// 			child.material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
		// 		} else if (child.material === objectMatlist[1]) {
		// 			child.material = new THREE.MeshBasicMaterial({ color: 0x0000ff });
		// 		} else if (child.material === objectMatlist[2]) {
		// 			child.material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
		// 		} else if (child.material === objectMatlist[3]) {
		// 			child.material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
		// 		} else if (child.material === objectMatlist[4]) {
		// 			child.material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
		// 		} else if (child.material === objectMatlist[5]) {
		// 			child.material = new THREE.MeshBasicMaterial({ color: 0xff00ff });
		// 		} else if (child.material === objectMatlist[6]) {
		// 			child.material = new THREE.MeshBasicMaterial({ color: 0x0ffff0 });
		// 		} else if (child.material === objectMatlist[7]) {
		// 			child.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
		// 		} else if (child.material === objectMatlist[8]) {
		// 			child.material = new THREE.MeshBasicMaterial({ color: 0x00ffd0 });
		// 		} else if (child.material === objectMatlist[9]) {
		// 			child.material = new THREE.MeshBasicMaterial({ color: 0xffd000 });
		// 		} else {
		// 			child.material = new THREE.MeshBasicMaterial({ color: 0x444444 });
		// 		}
		// 	}
		// });

		// scene2.add(renderpass2obj);
		// console.log('Pass output render');
		// passRenderer.render(scene2, camera);
		// this.offscreenPassRenderer.render(scene2, camera);

		//background decision
		let saveSceneBG = scene.background;
		if (!isBackground) {
			scene.background = null;
		}

		// Render the main scene to the off-screen renderer
		this.offscreenMainRenderer.render(scene, camera);

		// Save rendered scenes as PNG images from off-screen renderers
		const renderDataUrl = this.offscreenMaskRenderer.domElement.toDataURL('image/png');
		// const passDataUrl = this.offscreenPassRenderer.domElement.toDataURL('image/png');
		const viewportDataUrl = this.offscreenMainRenderer.domElement.toDataURL('image/png');

		// Create download links
		setTimeout(() => {
			downloadImage(viewportDataUrl, 'result.png');
			downloadImage(renderDataUrl, 'mask.png');
			// downloadImage(passDataUrl, 'pass_scene.png');

			// Reset scene background
			if (!isBackground) {
				scene.background = saveSceneBG;
			}

			// Clean up off-screen renderers
			this.offscreenMaskRenderer.dispose();
			// this.offscreenPassRenderer.dispose();
			this.offscreenMainRenderer.dispose();
		}, 1000);

		//이미지 내보내기를 위해 임시로 제거했던 것 다시 추가
		if (ground) {
			ground.gridOption(isGrid);
		}

		if (shadowLight) {
			shadowLight.toggleShadowHelper(isShadowHelper);
		}
	}

	function setRendererResolution(renderer, canvas, scaleFactor) {
		const width = canvas.clientWidth * scaleFactor;
		const height = canvas.clientHeight * scaleFactor;
		renderer.setSize(width, height, false);
		canvas.style.width = canvas.clientWidth + 'px';
		canvas.style.height = canvas.clientHeight + 'px';
	}

	function resizeCanvasAndRenderers(aspectRatio, scaleFactor) {
		// const scaleFactor = 1; // or whatever value you're using
		const maxSize = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.8);
		const baseSize = 1024 * scaleFactor;
		let width, height;

		if (aspectRatio > 1) {
			// Landscape
			width = maxSize;
			height = maxSize / aspectRatio;
		} else {
			// Portrait or square
			height = maxSize;
			width = maxSize * aspectRatio;
		}

		// Resize main renderer and canvas
		renderer.setSize(width * scaleFactor, height * scaleFactor, false);
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;

		// Resize render renderer and canvas
		maskRenderer.setSize((width * scaleFactor) / 2, (height * scaleFactor) / 2, false);
		maskCanvas.style.width = `${width / 2}px`;
		maskCanvas.style.height = `${height / 2}px`;

		// Resize pass renderer and canvas
		// passRenderer.setSize((width * scaleFactor) / 2, (height * scaleFactor) / 2, false);
		// passCanvas.style.width = `${width / 2}px`;
		// passCanvas.style.height = `${height / 2}px`;

		// Update camera aspect ratio
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
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
		if (scene.background && scene.background.isTexture) {
			const aspectRatio = scene.background.image.width / scene.background.image.height;
			resizeCanvasAndRenderers(aspectRatio, scaleFactor);
		}

		const width = canvas.clientWidth;
		const height = canvas.clientHeight;

		camera.aspect = width / height;
		camera.updateProjectionMatrix();

		setRendererResolution(renderer, canvas, scaleFactor);
		setRendererResolution(maskRenderer, maskCanvas, scaleFactor);
		// setRendererResolution(passRenderer, passCanvas,scaleFactor);
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

	function handleBackgroundOption(e) {
		isBackground = e.target.checked;
		console.log('isBackground', isBackground);
	}

	export {
		loadNewModel,
		changeFov,
		changeSubLightRot,
		changeSubLightIntensity,
		changeSubLightStatus,
		changeSubLightColor,
		changeGridStatus,
		changeShadowStatus,
		changeEnvMapSetting
	};
</script>

<div id="viewport-main-wrapper">
	<div id="viewport-wrapper">
		<div id="main-viewport">
			<canvas id="viewport" bind:this={canvas}> </canvas>
				<div id="transform-tool">
			<button class="transform-btn" on:click={changeTransformMode}>이동</button>
			<button class="transform-btn" on:click={changeTransformMode}>회전</button>
			<button class="transform-btn" on:click={changeTransformMode}>크기</button>
		</div>
			<div id="overlay">
				<div id="overlay-content">
					<h1>GUIDE</h1>
					<p>
						1.<br /> 왼쪽 패널의 <span class="highlight">"GLB 불러오기"</span> 버튼을 클릭해 3D
						모델을 불러오거나<br /> <span class="highlight">"라이브러리에서 불러오기"</span> 에서 원하는
						제품을 고르세요.
					</p>
					<p>
						2.<br /><span class="highlight">"배경 불러오기"</span> 버튼을 통해 배경 이미지를
						불러오거나<br /><span class="highlight">"AI로 배경 생성"</span> 기능을 통해 배경을
						생성하면<br /> 배경이 자연스럽게 제품의 주변광으로 적용됩니다.
					</p>
				</div>
			</div>
		</div>

<div id="preview-wrapper">
			<canvas id="mask-canvas" bind:this={maskCanvas}></canvas>
			<!-- <canvas id="pass-canvas" bind:this={passCanvas}></canvas> -->
		</div>

		
	
	</div>
	<div id="viewport-menu">
		<button on:click={imageOutputRender}>제품 이미지 / 마스크 다운로드</button>
		<div class="checkBox-wrapper">
			<p>배경 포함</p>
			<div class="checkBox-section">
				<p>off</p>
				<label class="switch">
					<input
						type="checkbox"
						id="background-download-switch"
						checked={isBackground}
						on:input={(e) => handleBackgroundOption(e)}
					/>
					<span class="toggle-slider round"></span>
				</label>
				<p>on</p>
			</div>
		</div>
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
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		margin: 8px;
		gap: 8px;
	}
	#viewport-wrapper {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 90vh;
		
	}

	.side-wrapper {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 8px;
		height: 90vh;
	
	}
	#main-viewport {
		position: relative;
	}

	#overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		color: var(--text-color);
		background-color: rgba(0, 0, 0, 0.5);
		box-sizing: border-box;
		padding: 30px;
		z-index: 997;
	}
	#overlay-content {
		width: 100%;
		height: 100%;
		text-align: center;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;

		gap: 10px;
	}
	#overlay-content h1 {
		font-size: 2rem;
		margin-bottom: 32px;
	}

	.highlight {
		color: var(--highlight-color);
	}

	#overlay-content p {
		font-size: 1rem;
		line-height: 1.7rem;
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
		max-width: 80vw;
		max-height: 80vh;
		width: auto;
		height: auto;
	}
	#preview-wrapper {
		display: flex;
		flex-direction: column;
	}

	#mask-canvas,
	#pass-canvas {
		box-sizing: border-box;

		border: 1px solid black;
		background-color: var(--accent-hover-color);
		margin-bottom: 0; /* Space between render and pass canvases */
	}

	#pass-canvas {
		margin-bottom: 0; /* Remove margin from the last canvas */
	}

	button {
		box-sizing: border-box;
		width: 50%;
		height: 42px;
		border: none;
		background-color: var(--secondary-color);
		color: var(--text-color);
	}

	button:hover {
		background-color: var(--accent-color);
		cursor: pointer;
	}

	.sub-button {
		background-color: #f88030;
	}

	#mask-canvas,
	#pass-canvas {
		max-width: 40vw;
		max-height: 40vh;
		width: auto;
		height: auto;
	}

	.checkBox-wrapper {
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		gap: 8px;
	}

	.checkBox-section {
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		gap: 8px;
	}

	.checkBox-wrapper p {
		color: var(--text-color);
		font-size: 1rem;
	}

	.switch {
		position: relative;
		display: inline-block;
		width: 42px;
		height: 24px;
	}

	/* Hide default HTML checkbox */
	.switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}
	/* The slider */
	.toggle-slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: #ccc;
		-webkit-transition: 0.4s;
		transition: 0.4s;
	}

	.toggle-slider:before {
		position: absolute;
		content: '';
		height: 16px;
		width: 16px;
		left: 4px;
		bottom: 4px;
		background-color: white;
		-webkit-transition: 0.4s;
		transition: 0.4s;
	}

	input:checked + .toggle-slider {
		background-color: #2196f3;
	}

	input:focus + .toggle-slider {
		box-shadow: 0 0 1px #2196f3;
	}

	input:checked + .toggle-slider:before {
		-webkit-transform: translateX(19px);
		-ms-transform: translateX(19px);
		transform: translateX(19px);
	}

	/* Rounded sliders */
	.toggle-slider.round {
		border-radius: 34px;
	}

	.toggle-slider.round:before {
		border-radius: 50%;
	}
	@media (max-width: 768px) {
	}

	@media (max-width: 1024px) {
	}

	@media (min-width: 1024px) {
	}
</style>
