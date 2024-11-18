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
	import Icon from '@iconify/svelte';

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
	let shadowSize = 250;
	let shadowRotation = 0;
	let isShadowHelper = false;
	let transfromControllerDragging = false;


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
				      const aspectRatio = texture.image.width / texture.image.height;
            resizeCanvasAndRenderers(aspectRatio, scaleFactor);
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

	function changeEnvMapSetting(type, value) {
		if (!isBackground) {
			return;
		}
		switch (type) {
			case 'intensity':
				envMapIntensity = value;
				scene.environmentIntensity = envMapIntensity;
				break;
			case 'rotation':
				envMapRotation = value;
				scene.environmentRotation.y = (envMapRotation * Math.PI) / 180;
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
			logarithmicDepthBuffer: true,
			alpha: true
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

		//모델 컨트롤을 위한 컨트롤러 생성
		controller = new TransformControls(camera, renderer.domElement);
		controller.addEventListener('dragging-changed', function (event) {
			console.log('dragging-changed', event);
			transfromControllerDragging = true;
			controls.enabled = !event.value;
		});

		//제품 모델 컨트롤 그룹
		controlGroup = new THREE.Group();
		scene.add(controlGroup);
		controlGroup.position.set(0, 0, 0);

		//glbImport , 컨트롤 그룹에 모델을 추가하게 됨
		glbImporter = new GLBImporter(scene, controlGroup, renderer);

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

		// Helper function to check if an object should be ignored
		function shouldIgnoreObject(object) {
			const ignoreTypes = [
				'GridHelper',
				'DirectionalLight',
				'AmbientLight',
				'TransformControlPlane',
				'CameraHelper',
				'TransformControls',
				'Object3D' // Ignore generic Object3D containers
			];

			return (
				object.name === 'ground' ||
				ignoreTypes.includes(object.type) ||
				object.userData.isController || // Add this flag to controller-related objects
				(object.parent && object.parent.type === 'TransformControls')
			);
		}

		const raycastableObjects = [];
		scene.traverse((object) => {
			if (!shouldIgnoreObject(object) && object.isMesh) {
				raycastableObjects.push(object);
			}
		});

		// Check for intersections with objects in the scene
		const intersects = raycaster.intersectObjects(raycastableObjects, false);
		console.log(intersects.length);

		if (intersects.length > 0) {
			let selectedObject = intersects[0].object;
			console.log('Selected object:', selectedObject);

			//이미 컨트롤러가 활성화 되었다면
			if (controller.object) {
				console.log('Controller already active:', controller.object);
				return;
			}
			// Detach current control
			controller.detach();

			// Ensure controller is in the scene
			if (!scene.children.includes(controller)) {
				scene.add(controller);
			}

			// Get the control group and attach controller
			let currentOBJ = controlGroup;
			controller.attach(currentOBJ);
			controller.space = 'local';
			controller.visible = true;
			// Mark controller-related objects to be ignored in future raycasts
			controller.traverse((obj) => {
				obj.userData.isController = true;
			});
		} else {
			if (transfromControllerDragging) {
				return;
			}

			console.log('No object selected');
			controller.detach();
			scene.remove(controller);
			controller.visible = false;
		
	transfromControllerDragging = false;
			
		
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
		console.log('event', event.target.id);

		const mode = event.target.id;
		switch (mode) {
			case 'move':
				controller.setMode('translate');
				break;
			case 'rotate':
				controller.setMode('rotate');
				break;
			case 'scale':
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
    if (addedModel.length === 0) {
        console.error('No model added to the scene');
        alert('Please upload product model first.');
        return;
    }

    // Clear scene1
    while (scene1.children.length > 0) {
        scene1.remove(scene1.children[0]);
    }

    // Temporarily hide UI elements
    if (controller) {
        controller.detach();
    }
    if (ground) {
        ground.gridOption(false);
    }
    if (shadowLight) {
        shadowLight.toggleShadowHelper(false);
    }

    // Calculate output dimensions based on aspect ratio
    let aspectRatio = 1;
    if (scene.background && scene.background.isTexture) {
        aspectRatio = scene.background.image.width / scene.background.image.height;
    }

    // Base size is 1024 * scaleFactor
    let outputWidth, outputHeight;
    if (aspectRatio >= 1) {
        // Landscape or square
        outputWidth = 1024 * scaleFactor;
        outputHeight = (1024 / aspectRatio) * scaleFactor;
    } else {
        // Portrait
        outputHeight = 1024 * scaleFactor;
        outputWidth = 1024 * aspectRatio * scaleFactor;
    }

    // Create or reuse off-screen renderer
    if (!this.offscreenMainRenderer) {
        this.offscreenMainRenderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            logarithmicDepthBuffer: true
        });
    }

    // Set up renderer with calculated dimensions
    this.offscreenMainRenderer.setSize(outputWidth, outputHeight);
    this.offscreenMainRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Use exact pixel ratio for consistent output
    this.offscreenMainRenderer.shadowMap.enabled = true;
    this.offscreenMainRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.offscreenMainRenderer.outputColorSpace = THREE.SRGBColorSpace;
    this.offscreenMainRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.offscreenMainRenderer.toneMappingExposure = 1.0;

    // Store current camera settings
    const originalAspect = camera.aspect;
    const originalFov = camera.fov;

    // Update camera for render
    camera.aspect = outputWidth / outputHeight;
    camera.updateProjectionMatrix();

    // Handle background
    let saveSceneBG = scene.background;
    if (!isBackground) {
        scene.background = null;
    }

    // Render and capture image
    this.offscreenMainRenderer.render(scene, camera);
    const viewportDataUrl = this.offscreenMainRenderer.domElement.toDataURL('image/png');

    // Restore camera settings
    camera.aspect = originalAspect;
    camera.fov = originalFov;
    camera.updateProjectionMatrix();

    // Download image
    if (viewportDataUrl) {
        downloadImage(viewportDataUrl, 'result.png');
    } else {
        console.error('Failed to generate image');
    }

    // Restore scene state
    if (!isBackground) {
        scene.background = saveSceneBG;
    }
    if (ground) {
        ground.gridOption(isGrid);
    }
    if (shadowLight) {
        shadowLight.toggleShadowHelper(isShadowHelper);
    }

    // Clean up
    this.offscreenMainRenderer.dispose();
}

function maskOutputRender() {
    if (addedModel.length === 0) {
        console.error('No model added to the scene');
        alert('Please upload product model first.');
        return;
    }

    // Clear scene1
    while (scene1.children.length > 0) {
        scene1.remove(scene1.children[0]);
    }

    // Temporarily hide UI elements
    if (controller) {
        controller.detach();
    }
    if (ground) {
        ground.gridOption(false);
    }
    if (shadowLight) {
        shadowLight.toggleShadowHelper(false);
    }

    // Calculate output dimensions based on aspect ratio
    let aspectRatio = 1;
    if (scene.background && scene.background.isTexture) {
        aspectRatio = scene.background.image.width / scene.background.image.height;
    }

    // Base size is 1024 * scaleFactor
    let outputWidth, outputHeight;
    if (aspectRatio >= 1) {
        // Landscape or square
        outputWidth = 1024 * scaleFactor;
        outputHeight = (1024 / aspectRatio) * scaleFactor;
    } else {
        // Portrait
        outputHeight = 1024 * scaleFactor;
        outputWidth = 1024 * aspectRatio * scaleFactor;
    }

    // Create or reuse off-screen mask renderer
    if (!this.offscreenMaskRenderer) {
        this.offscreenMaskRenderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });
    }

    // Set up renderer with calculated dimensions
    this.offscreenMaskRenderer.setSize(outputWidth, outputHeight);
    this.offscreenMaskRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));; // Use exact pixel ratio for consistent output


    // Store current camera settings
    const originalAspect = camera.aspect;
    const originalFov = camera.fov;

    // Update camera for render
    camera.aspect = outputWidth / outputHeight;
    camera.updateProjectionMatrix();

    // Create mask material
    const maskMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        alphaTest: 0.5
    });

    // Clone object for mask render
    renderpass1obj = controlGroup.clone();
    renderpass1obj.traverse((child) => {
        if (child.isMesh) {
            child.material = maskMat;
        }
    });

    // Add to scene
    scene1.add(renderpass1obj);
    scene1.background = null; // Ensure transparent background for mask

    // Render mask
    this.offscreenMaskRenderer.render(scene1, camera);

    // Capture mask image
    const renderDataUrl = this.offscreenMaskRenderer.domElement.toDataURL('image/png');

    // Restore camera settings
    camera.aspect = originalAspect;
    camera.fov = originalFov;
    camera.updateProjectionMatrix();

    // Download image
    if (renderDataUrl) {
        downloadImage(renderDataUrl, 'mask.png');
    } else {
        console.error('Failed to generate mask image');
    }

    // Cleanup and restore scene state
    scene1.remove(renderpass1obj);
    renderpass1obj.traverse((child) => {
        if (child.isMesh) {
            child.material.dispose();
        }
    });
    renderpass1obj = null;

    if (ground) {
        ground.gridOption(isGrid);
    }
    if (shadowLight) {
        shadowLight.toggleShadowHelper(isShadowHelper);
    }

    // Clean up
    maskMat.dispose();
    this.offscreenMaskRenderer.dispose();
}



	function setRendererResolution(renderer, canvas, scaleFactor) {
		const width = canvas.clientWidth * scaleFactor;
		const height = canvas.clientHeight * scaleFactor;
		renderer.setSize(width, height, false);
		canvas.style.width = canvas.clientWidth + 'px';
		canvas.style.height = canvas.clientHeight + 'px';
	}


function resizeCanvasAndRenderers(aspectRatio, scaleFactor) {
    const parentContainer = canvas.parentElement.parentElement;
    const containerWidth = parentContainer.clientWidth;
    const containerHeight = parentContainer.clientHeight;
    const containerAspect = containerWidth / containerHeight;

    let width, height;

    if (aspectRatio > containerAspect) {
        width = containerWidth;
        height = width / aspectRatio;
        if (height > containerHeight) {
            height = containerHeight;
            width = height * aspectRatio;
        }
    } else {
        height = containerHeight;
        width = height * aspectRatio;
        if (width > containerWidth) {
            width = containerWidth;
            height = width / aspectRatio;
        }
    }

    // Update main renderer and canvas
    renderer.setSize(width * scaleFactor, height * scaleFactor, false);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Update mask renderer and canvas
    if (maskRenderer) {
        maskRenderer.setSize(width * scaleFactor / 2, height * scaleFactor / 2, false);
        maskCanvas.style.width = `${width / 2}px`;
        maskCanvas.style.height = `${height / 2}px`;
    }

    // Update camera
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // Update viewports
    renderer.setViewport(0, 0, width * scaleFactor, height * scaleFactor);
    if (maskRenderer) {
        maskRenderer.setViewport(0, 0, (width * scaleFactor) / 2, (height * scaleFactor) / 2);
    }

    // Force a render to update the view
    renderer.render(scene, camera);
}


// 	function resizeCanvasAndRenderers(aspectRatio, scaleFactor) {
// //check device orientation
// 		// const scaleFactor = 1; // or whatever value you're using
// 		const maxSize = Math.min(window.innerWidth * 0.8, window.innerHeight);
// 		const baseSize = 1024 * scaleFactor;
// 		let width, height;
// 		const isLandscape = window.innerWidth > window.innerHeight;
// 		if(isLandscape){
			
// 		if (aspectRatio > 1) {
// 				width = window.innerWidth*0.7;
// 			height = width / aspectRatio;
	
// 		} else {
// 			// Portrait or square
// 	height = window.innerHeight*0.8;
// 			width = height * aspectRatio;
// 		}
// 		} else {
// 				if (aspectRatio > 1) {
// 			// Landscape
// 			width = maxSize;
// 			height = maxSize / aspectRatio;
// 		} else {
// 			// Portrait or square
// 			height = maxSize;
// 			width = maxSize * aspectRatio;
// 		}
// 		}





	

// 		// Resize main renderer and canvas
// 		renderer.setSize(width * scaleFactor, height * scaleFactor, false);
// 		canvas.style.width = `${width}px`;
// 		canvas.style.height = `${height}px`;

// 		// Resize render renderer and canvas
// 		maskRenderer.setSize((width * scaleFactor) / 2, (height * scaleFactor) / 2, false);
// 		maskCanvas.style.width = `${width / 2}px`;
// 		maskCanvas.style.height = `${height / 2}px`;

// 		// Resize pass renderer and canvas
// 		// passRenderer.setSize((width * scaleFactor) / 2, (height * scaleFactor) / 2, false);
// 		// passCanvas.style.width = `${width / 2}px`;
// 		// passCanvas.style.height = `${height / 2}px`;

// 		// Update camera aspect ratio
// 		camera.aspect = width / height;
// 		camera.updateProjectionMatrix();
// 	}

function downloadImage(dataUrl, fileName) {
    if (!dataUrl) {
        console.error('No data URL provided for download');
        return;
    }

    try {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            document.body.removeChild(link);
        }, 100);
    } catch (error) {
        console.error('Error downloading image:', error);
        alert('Failed to download image. Please try again.');
    }
}

	function onWindowResize() {
    // Get parent container dimensions
    const parentContainer = canvas.parentElement.parentElement;
    const containerWidth = parentContainer.clientWidth;
    const containerHeight = parentContainer.clientHeight;
    
    // Calculate aspect ratio
    let aspectRatio = 1;
    if (scene.background && scene.background.isTexture) {
        aspectRatio = scene.background.image.width / scene.background.image.height;
    }

    // Resize everything
    resizeCanvasAndRenderers(aspectRatio, scaleFactor);

    // Update main renderer resolution
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    
    // Update camera
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // Update renderer resolutions
    setRendererResolution(renderer, canvas, scaleFactor);
    setRendererResolution(maskRenderer, maskCanvas, scaleFactor);

    // Force a render to update the view
    renderer.render(scene, camera);
}

function recreateRenderer() {
    if (renderer) {
        renderer.dispose();
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            logarithmicDepthBuffer: true,
            alpha: true
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
    }
}


	onMount(() => {
    console.log('viewport component mounted');
    init();
    
    // Initial resize
    resizeCanvasAndRenderers(1, scaleFactor);
    
    // Add debounced resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            onWindowResize();
        }, 100);
    });

    return () => {
        // Cleanup
        clearTimeout(resizeTimeout);
        if (renderer) renderer.dispose();
        if (maskRenderer) maskRenderer.dispose();
        if (this.offscreenMainRenderer) this.offscreenMainRenderer.dispose();
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
				<div id="viewport-menu">
			<div class="checkBox-wrapper">
			<p>배경 포함</p>
			<div class="checkBox-section">
				
				<label class="switch">
					<input
						type="checkbox"
						id="background-download-switch"
						checked={isBackground}
						on:input={(e) => handleBackgroundOption(e)}
					/>
					<span class="toggle-slider round"></span>
				</label>
				
			</div>
		</div>
		<button on:click={imageOutputRender}>이미지 다운로드</button>
			<button on:click={maskOutputRender}>제품 마스크 다운로드</button>
	
	</div>
			<canvas id="viewport" bind:this={canvas}> 	</canvas>
			<div id="transform-tool">
				<button class="transform-btn" id="move" on:click={changeTransformMode}><Icon class="transform_tool_icon" icon="iconamoon:move-light" /></button>
				<button class="transform-btn" id="rotate" on:click={changeTransformMode}><Icon class="transform_tool_icon" icon="tabler:rotate-360" /></button>
				<button class="transform-btn" id="scale" on:click={changeTransformMode}><Icon class="transform_tool_icon" icon="icon-park-outline:scale" /></button>
			</div>
			<div id="overlay">
				<div id="overlay-content">
					<!-- <h1>GUIDE</h1> -->
					<p>
						좌측 패널에서 제품을 업로드하거나, <br />
						라이브러리에서 제품을 선택하여 화면에 표시하세요. </p>	
				
				</div>
			
			</div>
		</div>

		<div id="preview-wrapper">
			<canvas id="mask-canvas" bind:this={maskCanvas}></canvas>
			<!-- <canvas id="pass-canvas" bind:this={passCanvas}></canvas> -->
		</div>
	</div>

</div>


<style>
#viewport-main-wrapper {
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: flex-start; /* Changed from center to flex-start */
    align-items: center;
    width: 100%;
    height: 100%;
    padding: 1rem;
    /* Add min-height to ensure content fits */
    min-height: 100vh;
	
}

#viewport-wrapper {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    /* Set a specific height that leaves room for the menu */
    height: calc(100vh - 120px); /* Adjust the 120px based on your menu height */
    margin-bottom: 60px; /* Space for the menu */

}

#main-viewport {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;

		
}

#viewport-menu {
    position: fixed; /* Changed from absolute to fixed */
    bottom: 1.5rem; /* Position from bottom */
    width: 100%;

    max-width: 500px;
    z-index: 99;
    box-sizing: border-box;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 8px;


}

#viewport {
	box-sizing: border-box;
	border: 1px solid var(--border-color);
	background-color: var(--background-color);
	border-radius: 8px;
	width: 100%;
	height: 100%;
	position: relative;
}

/* Responsive adjustments */
@media (max-width: 768px) {

}

@media (max-width: 480px) {

}

	.side-wrapper {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 8px;
		height: 90vh;
	}

	/* #viewport-menu {
		position:absolute;
		top: 100%;
		right: 0;
		width: 100%;
		max-width: 600px;
		z-index: 999;
		box-sizing: border-box;
		display: flex;
		flex-direction: row;
		justify-content: flex-end;
		align-items:center;
		gap: 8px;
		margin-top: 8px;
	} */
#overlay {
    position: absolute;
    inset: 0;  /* This replaces top, right, bottom, left: 0 */
    margin: auto;
    width: 100%;  /* Match canvas width */
    height: 100%; /* Match canvas height */
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--text-color);
    background-color: var(--background-color);
    box-sizing: border-box;
    padding: 30px;
    z-index: 997;
    border-radius: 8px;
    pointer-events: none;
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
    pointer-events: auto;
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
		margin-left: 10px;
		margin-top:10px

	}


	#transform-tool button {
		box-sizing: border-box;
		width: 4rem;
		height: 4rem;

display: flex;
		justify-content: center;
		align-items: center;
		margin-bottom: 6px;
	}

		div :global(.transform_tool_icon ) {
		font-size: 1.8rem;
		color: var(--text-color);
		pointer-events: none;

	}

	#transform-tool button:hover {
		background-color: var(--secondary-color);
		color: var(--onSurface-color);
	}


	#preview-wrapper {
		display: flex;
		flex-direction: column;
				background-color: var(--background-color);
				border-radius: 8px;
	}

	#mask-canvas,
	#pass-canvas {
		box-sizing: border-box;
display: none;
		border: 1px solid var(--border-color);
		background-color: var(--accent-hover-color);
		margin-bottom: 0; /* Space between render and pass canvases */
	}

	#pass-canvas {
		margin-bottom: 0; /* Remove margin from the last canvas */
	}

	button {
			font-family:
		'Pretendard Variable',
		Pretendard,
		-apple-system,
		BlinkMacSystemFont,
		system-ui,
		Roboto,
		'Helvetica Neue',
		'Segoe UI',
		'Apple SD Gothic Neo',
		'Noto Sans KR',
		'Malgun Gothic',
		'Apple Color Emoji',
		'Segoe UI Emoji',
		'Segoe UI Symbol',
		sans-serif;
		font-size: 0.9rem;
		font-weight: 500;
		box-sizing: border-box;
		width: 100%;
		height: 42px;
		border: none;
		background-color: var(--onSurface-color);
		color: var(--text-color);
		border-radius: 8px;
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
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    background-color: var(--border-color);
    padding: 8px 18px;
    border-radius: 8px;
    height: 42px;
    width: 50%;
    box-sizing: border-box;
}

	.checkBox-section {
    box-sizing: border-box;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 8px;
    flex-shrink: 0; /* Prevents the toggle from shrinking */
}

	.checkBox-wrapper p {
    font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 
        system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 
        'Noto Sans KR', 'Malgun Gothic', 'Apple Color Emoji', 'Segoe UI Emoji', 
        'Segoe UI Symbol', sans-serif;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-color);
    /* Add these properties to prevent text wrapping */
    white-space: nowrap;
    flex-shrink: 0; /* Prevents the text from shrinking */
    margin: 0; /* Optional: removes any margin that might cause issues */
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
		background-color: var(--secondary-color);
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
		background-color: var(--accent-color);
	}

	input:focus + .toggle-slider {
		box-shadow: 0 0 1px var(--border-color);
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
