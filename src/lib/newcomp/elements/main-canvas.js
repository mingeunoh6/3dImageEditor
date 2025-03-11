// main-canvas.js

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { CopyShader } from 'three/addons/shaders/CopyShader.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { ParallelMeshBVHWorker } from 'three-mesh-bvh/src/workers/ParallelMeshBVHWorker';
import {
	WebGLPathTracer,
	BlurredEnvMapGenerator,
	GradientEquirectTexture
} from 'three-gpu-pathtracer/build/index.module.js';

export class mainRenderer {
	constructor(canvas, options = {}) {
		console.log(canvas);
		this.canvas = canvas;

		this.options = Object.assign(
			{
				pixelRatio: Math.min(window.devicePixelRatio, 2), // Limit for performance
				alpha: true,
				antialias: true,
				shadows: true,
				exposure: 1.0,
				toneMapping: THREE.ACESFilmicToneMapping,
				toneMappingExposure: 1.2,
				envMapIntensity: 1.0,
				useHDRI: true,
				hdriPath: '/hdri/brown_photostudio_02_1k.hdr',
				shadowMapSize: 2048,
				usePhysicalLights: true,
				autoRotate: false,
				autoRotateSpeed: 1.0,
				background: new THREE.Color(0x101010)
			},
			options
		);

		// Internal properties
		this.scene = null;
		this.pathTracerScene = null;
		this.camera = null;
		this.renderer = null;
		this.pathTracer = null;
		this.controls = null;
		this.pmremGenerator = null;
		this.envMap = null;
		this.width = 0;
		this.height = 0;
		this.isPortrait = false;
		this.frameId = null;
		this.clock = new THREE.Clock();
		this.isInitialized = false;
		this.isAnimating = false;
		this.resizeObserver = null;
		this.objectsInScene = [];
		this.pathTracingEnabled = false;
		this.blurredEnvMapGenerator = null;
		this.blurredEnvMap = null;
		this.gradientBackground = null;
		this.transformControl = null;
		// Add to the constructor properties:
		this._updatePathTracerBound = null;
		this.ground = false;

		//extra render properties
		this.composer = null;
		this.renderPass = null;
		this.outlinePass = null;
		this.fxaaPass = null;
		this.highlightedObjects = [];

		// Bind methods
		this.init = this.init.bind(this);
		this.resize = this.resize.bind(this);
		this.render = this.render.bind(this);
		this.animate = this.animate.bind(this);
		this.dispose = this.dispose.bind(this);
		this.checkOrientation = this.checkOrientation.bind(this);
		this.loadHDRI = this.loadHDRI.bind(this);
		this.getObjectsInScene = this.getObjectsInScene.bind(this);

		this.initPostProcessing = this.initPostProcessing.bind(this);
		this.highlightObject = this.highlightObject.bind(this);
		this.clearHighlight = this.clearHighlight.bind(this);

		if (this.canvas) {
			this.init();
		}
	}

	async init() {
		if (this.isInitialized) return;

		// Create scene
		this.scene = new THREE.Scene();
		if (!this.options.useHDRI) {
			this.scene.background = this.options.background;
		}

		this.resize();

		// Create camera
		this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.01, 1000);
		this.camera.position.set(0, 2, 5);
		this.scene.add(this.camera);

		let canvas = this.canvas;

		// Create renderer
		this.renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			alpha: this.options.alpha,
			antialias: this.options.antialias
		});
		this.renderer.setSize(this.width, this.height);
		this.renderer.setPixelRatio(this.options.pixelRatio);

		// PBR settings
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.toneMapping = this.options.toneMapping;
		this.renderer.toneMappingExposure = this.options.toneMappingExposure;

		//PathTrace settings
		this.pathTracer = new WebGLPathTracer(this.renderer);
		this.pathTracer.setBVHWorker(new ParallelMeshBVHWorker());
		this.pathTracer.tiles.set(3, 3);
		this.pathTracer.multipleImportanceSampling = true;
		this.pathTracer.transmissiveBounces = 10;
		this.pathTracer.minSamples = 5;
		this.blurredEnvMapGenerator = new BlurredEnvMapGenerator(this.renderer);
		this.gradientBackground = new GradientEquirectTexture();
		this.gradientBackground.topColor.set('#111111');
		this.gradientBackground.bottomColor.set('#000000');
		this.gradientBackground.update();
		this.scene.background = null;

		// this.pathTracer.setScene(this.scene, this.camera);
		// Enable shadows
		if (this.options.shadows) {
			this.renderer.shadowMap.enabled = true;
			this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		}

		// Create orbit controls
		this.controls = new OrbitControls(this.camera, this.canvas);
		this.controls.addEventListener('change', () => {
			// When camera changes position, we need to reset the path tracer
			if (this.pathTracer) {
				// Update camera in the path tracer
				this.pathTracer.updateCamera();
			}
		});
		this.controls.update();

		//transform controller
		this.transformControl = new TransformControls(this.camera, this.renderer.domElement);
		this.transformControl.addEventListener('dragging-changed', (e) => {
			this.controls.enabled = !e.value;
		});
		this.transformControl.setMode('translate');

		// Setup PMREM for environment maps
		this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
		this.pmremGenerator.compileEquirectangularShader();

		// Load HDRI environment if specified
		if (this.options.useHDRI && this.options.hdriPath) {
			this.loadHDRI(this.options.hdriPath);
		} else {
			// Create a basic environment map
			this.createDefaultEnvironment();
		}
		this.pathTracer.updateEnvironment();

		// Create lighting setup
		this.setupLights();
		if (this.ground) {
			this.createGround();
		}

		// Setup resize observer
		this.resizeObserver = new ResizeObserver(() => {
			this.resize();
		});
		this.resizeObserver.observe(this.canvas);

		this.setupPathTracingDefaults();

		// Mark as initialized

		this.isInitialized = true;
	}

	initPostProcessing() {
		// Ensure renderer exists
		if (!this.renderer) return;

		// Create composer
		this.composer = new EffectComposer(this.renderer);

		// Render pass
		this.renderPass = new RenderPass(this.scene, this.camera);
		this.composer.addPass(this.renderPass);

		// Outline pass
		const size = this.renderer.getSize(new THREE.Vector2());
		this.outlinePass = new OutlinePass(size, this.scene, this.camera);

		// Configure default outline appearance
		this.outlinePass.edgeStrength = 3;
		this.outlinePass.edgeGlow = 0;
		this.outlinePass.edgeThickness = 1;
		this.outlinePass.visibleEdgeColor.set(0x00ff00);
		this.outlinePass.hiddenEdgeColor.set(0x00ff00);

		this.composer.addPass(this.outlinePass);

		// FXAA for anti-aliasing
		this.fxaaPass = new ShaderPass(FXAAShader);
		this.fxaaPass.uniforms['resolution'].value.set(
			1 / (this.canvas.width * window.devicePixelRatio),
			1 / (this.canvas.height * window.devicePixelRatio)
		);
		this.composer.addPass(this.fxaaPass);

		this.composer.renderer.outputColorSpace = this.renderer.outputColorSpace;
		this.composer.renderer.toneMapping = this.renderer.toneMapping;
		this.composer.renderer.toneMappingExposure = this.renderer.toneMappingExposure;
	}

	highlightObject(object, options = {}) {
		// Clear previous highlights
		this.clearHighlight();

		// Exit if no object to highlight
		if (!object) return;

		// Store the current highlighted object
		this.currentHighlightedObject = object;

		// Create a highlight group that will contain all outline meshes
		const highlightGroup = new THREE.Group();
		highlightGroup.name = 'HighlightGroup';
		highlightGroup.userData.isHighlight = true;

		// Make the highlight group a child of the object to follow its transformations
		object.add(highlightGroup);

		// Create outlines
		const outlineMaterial = new THREE.MeshBasicMaterial({
			color: options.color || 0x00ff00,
			side: THREE.BackSide,
			transparent: true,
			opacity: 0.5
		});

		// Traverse the object and create outline for each mesh
		const outlineMeshes = [];
		object.traverse((child) => {
			if (child.isMesh) {
				// Create an outline mesh by slightly scaling the geometry
				const outlineGeometry = child.geometry.clone();
				const outlineMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);

				// Calculate world matrix for positioning
				const worldMatrix = new THREE.Matrix4();
				child.updateMatrixWorld(true);
				worldMatrix.copy(child.matrixWorld);

				// Get the inverse matrix of the parent object
				const inverseParentMatrix = new THREE.Matrix4();
				object.updateMatrixWorld(true);
				inverseParentMatrix.copy(object.matrixWorld).invert();

				// Calculate the local matrix relative to the parent object
				const localMatrix = new THREE.Matrix4().multiplyMatrices(inverseParentMatrix, worldMatrix);

				// Apply the local matrix
				outlineMesh.applyMatrix4(localMatrix);

				// Scale up slightly to create an outline effect
				outlineMesh.scale.multiplyScalar(1.02);

				// Mark as highlight mesh for raycaster filtering
				outlineMesh.userData.isHighlight = true;

				// Add the outline mesh to the highlight group
				highlightGroup.add(outlineMesh);
				outlineMeshes.push(outlineMesh);
			}
		});

		// Store reference to the highlight group and outline meshes
		this.currentHighlightedObject.userData.highlightGroup = highlightGroup;
		this.currentHighlightedObject.userData.highlightMeshes = outlineMeshes;
	}

	clearHighlight() {
		// Remove previous highlight group and meshes
		if (this.currentHighlightedObject) {
			const highlightGroup = this.currentHighlightedObject.userData.highlightGroup;
			const highlightMeshes = this.currentHighlightedObject.userData.highlightMeshes;

			if (highlightGroup) {
				// Remove the highlight group from the parent object
				this.currentHighlightedObject.remove(highlightGroup);

				// Dispose of all meshes in the group
				if (highlightMeshes) {
					highlightMeshes.forEach((mesh) => {
						if (mesh.geometry) mesh.geometry.dispose();
						if (mesh.material) mesh.material.dispose();
					});
				}

				// Clear the references
				delete this.currentHighlightedObject.userData.highlightGroup;
				delete this.currentHighlightedObject.userData.highlightMeshes;
			}

			this.currentHighlightedObject = null;
		}
	}

	hideAllHighlight() {
		if (this.currentHighlightedObject) {
			// Hide the highlight group if it exists
			const highlightGroup = this.currentHighlightedObject.userData.highlightGroup;
			if (highlightGroup) {
				highlightGroup.visible = false;
			}

			// Also check for individual highlight meshes (for backward compatibility)
			const highlightMeshes = this.currentHighlightedObject.userData.highlightMeshes;
			if (highlightMeshes) {
				highlightMeshes.forEach((mesh) => {
					if (mesh) mesh.visible = false;
				});
			}
		}

		// Hide transform controls if they exist
		if (this.transformControl && this.transformControl.object) {
			this.transformControl.visible = false;
		}
	}

	resize() {
		if (!this.canvas) return;

		console.log('canvas resizing');

		//get canvas dimensions
		const rect = this.canvas.getBoundingClientRect();
		this.width = rect.width;
		this.height = rect.height;

		//check orientation
		this.checkOrientation();

		//update camera apsect ratio
		if (this.camera) {
			this.camera.aspect = this.width / this.height;
			this.camera.updateProjectionMatrix();
		}

		//update renderer size
		if (this.renderer) {
			this.renderer.setSize(this.width, this.height);
		}

		if (this.composer && this.renderer) {
			const size = this.renderer.getSize(new THREE.Vector2());
			this.fxaaPass.uniforms['resolution'].value.set(
				1 / (size.width * window.devicePixelRatio),
				1 / (size.height * window.devicePixelRatio)
			);
		}

		if (this.pathTracer) {
			this.pathTracer.updateCamera();
		}
	}

	checkOrientation() {
		const wasPortrait = this.isPortrait;
		this.isPortrait = window.innerHeight > window.innerWidth;

		// Return true if orientation changed
		return wasPortrait !== this.isPortrait;
	}

	async enablePathTracing(enable) {
		console.log('Path tracing enabled:', enable);

		// If there's no change in state, do nothing
		if (this.pathTracingEnabled === enable) return;

		// Update tracking state
		this.pathTracingEnabled = enable;

		// Hide highlight objects and transform controls
		this.hideAllHighlight();

		if (enable) {
			if (this.pathTracer) {
				// Create or update the path tracing scene
				await this.updatePathTracerScene();
			} else {
				console.error('Path tracer not initialized');
				this.pathTracingEnabled = false;
			}
		} else {
			// When disabling path tracing, ensure we render the main scene once
			if (this.renderer && this.scene && this.camera) {
				this.renderer.render(this.scene, this.camera);
			}
		}
	}

	setupPathTracingDefaults() {
		this.excludeObjectTypeFromPathTracing((object) => {
			return (
				object.isTransformControls ||
				object.isHelper ||
				object.type.includes('Helper') ||
				object.userData.isUI === true ||
				object.userData.excludeFromPathTracer === true
			);
		});
	}

	loadHDRI(path) {
		return new Promise((resolve, reject) => {
			const loader = new RGBELoader();
			new RGBELoader().load(
				path,
				(texture) => {
					// 기존 환경 맵이 있으면 dispose
					if (this.envMap) {
						this.envMap.dispose();
						this.scene.environment.dispose();
					}
					texture.colorSpace = THREE.SRGBColorSpace;
					texture.mapping = THREE.EquirectangularReflectionMapping;
					// 새 환경 맵 설정

					this.envMap = texture;
					this.blurredEnvMap = this.blurredEnvMapGenerator?.generate(this.envMap, 0.35);
					// this.scene.background = this.envMap;
					this.scene.environment = this.envMap;

					// pathTracer 환경 맵 업데이트
					this.pathTracer.updateEnvironment();
					texture.dispose();

					resolve(this.envMap);
				},
				undefined,
				reject
			);
		});
	}

	resetHDRI() {
		this.loadHDRI(this.options.hdriPath);
		this.scene.background = null;
	}

	loadImageBackground(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();

			reader.onload = (event) => {
				const dataUrl = event.target.result;

				const loader = new THREE.TextureLoader();
				loader.load(
					dataUrl,
					(texture) => {
						// 기존 환경 맵이 있으면 dispose
						if (this.envMap) {
							this.envMap.dispose();
							this.scene.environment.dispose();
						}
						texture.colorSpace = THREE.SRGBColorSpace;
						this.scene.background = texture;

						const envTexture = texture.clone();
						envTexture.mapping = THREE.EquirectangularReflectionMapping;

						this.envMap = envTexture;
						this.blurredEnvMap = this.blurredEnvMapGenerator?.generate(this.envMap, 0.35);
						// this.scene.background = this.envMap;
						this.scene.environment = this.envMap;

						// pathTracer 환경 맵 업데이트
						this.pathTracer.updateEnvironment();
						texture.dispose();

						resolve(texture);
					},
					undefined,
					(error) => {
						reject(error);
					}
				);
			};

			reader.onerror = () => {
				reject(new Error('Failed to read the background image file.'));
			};

			reader.readAsDataURL(file);
		});
	}

	createDefaultEnvironment() {
		// Create a simple gradient environment
		const envScene = new THREE.Scene();

		// Create gradient skybox
		const topColor = new THREE.Color(0x0077ff);
		const bottomColor = new THREE.Color(0xffffff);

		const uniforms = {
			topColor: { value: topColor },
			bottomColor: { value: bottomColor },
			offset: { value: 400 },
			exponent: { value: 0.6 }
		};

		const skyGeo = new THREE.SphereGeometry(1000, 32, 15);
		const skyMat = new THREE.ShaderMaterial({
			uniforms: uniforms,
			vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
			fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
			side: THREE.BackSide
		});

		const sky = new THREE.Mesh(skyGeo, skyMat);
		envScene.add(sky);

		// Generate environment map from this scene
		this.envMap = this.pmremGenerator.fromScene(envScene).texture;
		this.scene.environment = this.envMap;

		// Optionally set as background too
		if (this.options.useHDRI) {
			this.scene.background = this.envMap;
		}

		// Cleanup
		envScene.dispose();
		this.pmremGenerator.dispose();
	}

	async _updatePathTracerOnTransform() {
		// If path tracing is enabled, update the scene in the path tracer
		if (this.pathTracingEnabled && this.pathTracer) {
			// Reset the samples count to restart the path tracing with the new object position
			console.log('changing');
			this.hideAllHighlight();
			// Update the scene in the path tracer
			let options = { onProgress: (v) => console.log('Updating path tracer after transform:', v) };
			await this.pathTracer.setSceneAsync(this.scene, this.camera, options);
		}
	}

	setupLights() {
		// Ambient light
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
		this.scene.add(ambientLight);

		// Main directional light with shadows
		const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
		directionalLight.position.set(5, 10, 7.5);
		directionalLight.castShadow = this.options.shadows;

		// Shadow settings
		if (this.options.shadows) {
			const shadowMapSize = this.options.shadowMapSize;
			directionalLight.shadow.mapSize.width = shadowMapSize;
			directionalLight.shadow.mapSize.height = shadowMapSize;
			directionalLight.shadow.camera.near = 0.5;
			directionalLight.shadow.camera.far = 50;
			directionalLight.shadow.camera.left = -10;
			directionalLight.shadow.camera.right = 10;
			directionalLight.shadow.camera.top = 10;
			directionalLight.shadow.camera.bottom = -10;
			directionalLight.shadow.bias = -0.0001;
		}

		this.scene.add(directionalLight);

		// Additional fill light
		const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
		fillLight.position.set(-5, 2, -7.5);
		this.scene.add(fillLight);

		this.pathTracer.updateLights();
	}

	generateUniqueId() {
		return 'obj_' + Math.random().toString(36).substring(2, 11);
	}

	async addObject(object, centerAndScale = true, filename = null, visibleInPathTracer = true) {
		this.clearHighlight();
		// Generate a unique ID for tracking
		const objectId = this.generateUniqueId();
		object.userData.objectId = objectId;

		this.setObjectPathTracingVisibility(object, visibleInPathTracer);

		if (centerAndScale) {
			// Center and scale the object
			const box = new THREE.Box3().setFromObject(object);
			const center = box.getCenter(new THREE.Vector3());
			const size = box.getSize(new THREE.Vector3());

			// Center the object
			object.position.sub(center);

			// Scale to reasonable size if needed
			const maxDim = Math.max(size.x, size.y, size.z);
			if (maxDim > 5) {
				const scale = 5 / maxDim;
				object.scale.multiplyScalar(scale);
			}
		}

		// Add material environment maps if needed
		// if (this.envMap) {
		// 	object.traverse((child) => {
		// 		if (child.isMesh && child.material) {
		// 			// Handle material arrays
		// 			if (Array.isArray(child.material)) {
		// 				child.material.forEach((material) => {
		// 					if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
		// 						material.envMap = this.envMap;
		// 						material.envMapIntensity = this.options.envMapIntensity;
		// 						material.needsUpdate = true;
		// 					}
		// 				});
		// 			}
		// 			// Handle single materials
		// 			else if (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial) {
		// 				child.material.envMap = this.envMap;
		// 				child.material.envMapIntensity = this.options.envMapIntensity;
		// 				child.material.needsUpdate = true;
		// 			}

		// 			// Enable shadows
		// 			if (this.options.shadows) {
		// 				child.castShadow = true;
		// 				child.receiveShadow = true;
		// 			}
		// 		}
		// 	});
		// }
		this.objectsInScene = [
			...this.objectsInScene,
			{
				id: objectId,
				name: filename,
				object: object
			}
		];
		this.scene.add(object);
		if (this.pathTracingEnabled && this.pathTracer) {
			await this.updatePathTracerScene();
		}

		// add to the scene object list

		return object;
	}

	// Remove an object from the scene and tracking array
	async removeObject(object) {
		if (!object) return;
		this.clearHighlight();
		this.removeTransformControl();
		// Find the object in our tracking array
		const index = this.objectsInScene.findIndex(
			(obj) => obj.object === object || obj.id === object.userData?.objectId
		);

		if (index !== -1) {
			// Remove from tracking array
			this.objectsInScene.splice(index, 1);
		}

		// Remove from scene
		this.scene.remove(object);
		// pathTracer 업데이트
		if (this.pathTracer) {
			// 모든 오브젝트가 추가된 후 한 번만 호출
			let options = { onProgress: (v) => console.log(v) };
			await this.pathTracer.setSceneAsync(this.scene, this.camera, options);
		}
	}

	getCurrentTransformControlMode() {
		return this.transformControl.getMode();
	}

	transformControlActivate(object) {
		if (!this.scene.children.includes(this.transformControl)) {
			this.scene.add(this.transformControl);
		}

		// Detach from any previous object
		if (this.transformControl.object) {
			this.transformControl.detach();

			// Remove previous event listeners to avoid duplicates
			this.transformControl.removeEventListener('objectChange', this._updatePathTracerBound);
		}

		console.log('transform', object);

		// Set current mode
		this.transformControl.setMode(this.getCurrentTransformControlMode());

		// Attach to selected object
		this.transformControl.attach(object);

		// Make sure transform control is visible
		this.transformControl.visible = true;

		// Create bound function for path tracer updates
		if (!this._updatePathTracerBound) {
			this._updatePathTracerBound = this._updatePathTracerOnTransform.bind(this);
		}

		// Add listener for transform changes to update path tracer
		this.transformControl.addEventListener('objectChange', this._updatePathTracerBound);
	}

	removeTransformControl() {
		if (this.transformControl) {
			// Remove event listener if it exists
			if (this._updatePathTracerBound) {
				this.transformControl.removeEventListener('objectChange', this._updatePathTracerBound);
			}

			// Detach from any object first
			this.transformControl.detach();

			// Make sure it's removed from the scene
			if (this.scene.children.includes(this.transformControl)) {
				this.scene.remove(this.transformControl);
			}

			this.transformControl.visible = false;

			// Force a render to update the scene
			this.render();
		}
	}

	changeTransformMode(mode) {
		if (!this.transformControl.object) {
			alert('No selected object');
			return;
		}

		switch (mode) {
			case 'move':
				this.transformControl.setMode('translate');
				break;
			case 'rotate':
				this.transformControl.setMode('rotate');
				break;
			case 'scale':
				this.transformControl.setMode('scale');
				break;
		}
	}

	async updateObjectForPathTracer() {
		if (this.pathTracer) {
			// 모든 오브젝트가 추가된 후 한 번만 호출
			let options = { onProgress: (v) => console.log(v) };
			await this.pathTracer.setSceneAsync(this.scene, this.camera, options);
		}
	}

	// Get all objects in scene
	getObjectsInScene() {
		return [...this.objectsInScene];
	}

	createGround(size = 200, material = null, visibleInPathTracer = true) {
		const geometry = new THREE.PlaneGeometry(size, size);
		const defaultMaterial =
			material ||
			new THREE.ShadowMaterial({
				opacity: 0.5
			});

		const ground = new THREE.Mesh(geometry, defaultMaterial);
		ground.rotation.x = -Math.PI / 2;
		ground.position.y = -0.001; // Slight offset to prevent z-fighting
		ground.receiveShadow = this.options.shadows;

		// Mark the ground as not selectable
		ground.userData.isGround = true;
		ground.userData.notSelectable = true;
		ground.name = 'Ground';

		// Set path tracing visibility
		ground.userData.visibleInPathTracer = visibleInPathTracer;

		this.scene.add(ground);
		return ground;
	}

	setEnvMapIntensity(intensity) {
		this.options.envMapIntensity = intensity;

		// Update materials
		this.scene.traverse((child) => {
			if (child.isMesh && child.material) {
				if (Array.isArray(child.material)) {
					child.material.forEach((material) => {
						if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
							material.envMapIntensity = intensity;
							material.needsUpdate = true;
						}
					});
				} else if (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial) {
					child.material.envMapIntensity = intensity;
					child.material.needsUpdate = true;
				}
			}
		});
	}

	render() {
		if (this.pathTracingEnabled && this.pathTracer) {
			// When path tracing is enabled, the pathTracer will handle rendering
			// No need to call the standard renderer here
		} else {
			// Standard rendering
			if (this.composer) {
				this.composer.render();
			} else if (this.renderer && this.scene && this.camera) {
				this.renderer.render(this.scene, this.camera);
			}
		}
	}
	animate() {
		if (!this.isInitialized || this.isAnimating) return;

		this.isAnimating = true;
		this.clock.start();

		const loop = () => {
			this.frameId = requestAnimationFrame(loop);

			if (this.pathTracingEnabled && this.pathTracer) {
				try {
					// Path tracing mode - render with pathTracer
					this.pathTracer.pausePathTracing = this.pathTracer.samples >= 1024;
					this.pathTracer.renderSample();

					// Reduce logging frequency for better performance
					if (this.pathTracer.samples % 10 === 0) {
						console.log('Path tracing samples:', this.pathTracer.samples);
					}
				} catch (error) {
					console.error('Error during path tracing:', error);
					this.pathTracingEnabled = false;

					// Fall back to standard rendering if path tracing fails
					if (this.renderer && this.scene && this.camera) {
						this.renderer.render(this.scene, this.camera);
					}
				}
			} else {
				// Standard rendering mode
				this.render();
			}

			// Update orbital controls if damping is enabled
			if (this.controls && this.controls.enableDamping) {
				this.controls.update();
			}
		};

		loop();
	}

	/**
	 * Stop animation loop
	 */
	stop() {
		if (this.frameId) {
			cancelAnimationFrame(this.frameId);
			this.frameId = null;
		}
		this.isAnimating = false;
	}

	/**
	 * Clean up and dispose of resources
	 */
	dispose() {
		this.stop();
		this.clearHighlight();
		// Unregister resize observer
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}

		// Dispose of Three.js resources
		if (this.renderer) {
			this.renderer.dispose();
			this.renderer = null;
		}

		// Dispose of composer resources
		if (this.composer) {
			this.composer.dispose();
			this.composer = null;
		}

		if (this.transformControl) {
			this.transformControl.dispose();
			this.transformControl = null;
		}

		// Clean up transform control event listener
		if (this.transformControl && this._updatePathTracerBound) {
			this.transformControl.removeEventListener('objectChange', this._updatePathTracerBound);
			this._updatePathTracerBound = null;
		}

		if (this.controls) {
			this.controls.dispose();
			this.controls = null;
		}

		if (this.envMap) {
			this.envMap.dispose();
			this.envMap = null;
		}

		// Clear the scene
		if (this.scene) {
			this.disposeSceneObjects(this.scene);
			this.scene = null;
		}

		if (this.pathTracer) {
			this.pathTracer.dispose();
			this.pathTracer = null;
		}

		// Clear object tracking array
		this.objectsInScene = [];

		this.camera = null;
		this.canvas = null;
		this.isInitialized = false;
	}

	/**
	 * Recursive disposal of scene objects
	 * @param {THREE.Object3D} obj - The object to dispose
	 */
	disposeSceneObjects(obj) {
		if (!obj) return;

		// Recursively dispose of child objects
		if (obj.children && obj.children.length > 0) {
			// Create a copy of the children array to avoid issues with it being modified during iteration
			const children = [...obj.children];
			for (const child of children) {
				this.disposeSceneObjects(child);
				obj.remove(child);
			}
		}

		// Dispose of geometries and materials
		if (obj.geometry) {
			obj.geometry.dispose();
		}

		if (obj.material) {
			if (Array.isArray(obj.material)) {
				for (const material of obj.material) {
					this.disposeMaterial(material);
				}
			} else {
				this.disposeMaterial(obj.material);
			}
		}
	}

	/**
	 * Dispose of a material and its textures
	 * @param {THREE.Material} material - The material to dispose
	 */
	disposeMaterial(material) {
		if (!material) return;

		// Dispose of material properties/textures
		for (const key of Object.keys(material)) {
			const value = material[key];
			if (value && typeof value === 'object' && typeof value.dispose === 'function') {
				value.dispose();
			}
		}

		material.dispose();
	}

	/**
	 * Take a screenshot of the current view
	 * @param {number} width - Optional custom width
	 * @param {number} height - Optional custom height
	 * @returns {string} - Data URL of the screenshot
	 */
	takeScreenshot(width = null, height = null) {
		if (!this.renderer) return null;

		// Use custom size or current size
		const useWidth = width || this.width;
		const useHeight = height || this.height;

		// If we need to resize for the screenshot
		if (width || height) {
			this.camera.aspect = useWidth / useHeight;
			this.camera.updateProjectionMatrix();
		}

		// Render the scene
		this.renderer.render(this.scene, this.camera);

		// Get the screenshot
		const dataURL = this.renderer.domElement.toDataURL('image/png');

		// Restore original size if needed
		if (width || height) {
			this.renderer.setSize(this.width, this.height);
			this.camera.aspect = this.width / this.height;
			this.camera.updateProjectionMatrix();
			this.render();
		}

		return dataURL;
	}

	setObjectPathTracingVisibility(object, isVisible) {
		if (!object) return;

		object.userData.visibleInPathTracer = isVisible;

		object.traverse((child) => {
			child.userData.visibleInPathTracer = isVisible;
		});

		if (this.pathTracingEnabled && this.pathTracer) {
			this.updatePathTracerScene();
		}
	}

	async updatePathTracerScene() {
		if (!this.pathTracer) return;

		// Create path tracer scene if it doesn't exist
		if (!this.pathTracerScene) {
			this.pathTracerScene = new THREE.Scene();
		} else {
			while (this.pathTracerScene.children.length > 0) {
				const child = this.pathTracerScene.children[0];
				this.pathTracerScene.remove(child);
			}
		}

		// Copy environment and background settings
		this.pathTracerScene.background = this.scene.background;
		this.pathTracerScene.environment = this.scene.environment;

		// Add lights first
		this.scene.traverse((object) => {
			if (object.isLight) {
				// Create a new light clone
				const lightClone = object.clone();
				this.pathTracerScene.add(lightClone);
			}
		});

		// Add objects that should be visible in path tracing
		this.scene.traverse((object) => {
			// Skip lights as we've already handled them
			if (object.isLight) return;

			// Skip objects explicitly marked as not visible in path tracer
			if (object.userData.visibleInPathTracer === false) return;

			// Skip transform controls and helpers
			if (
				object.isTransformControls ||
				object.isHelper ||
				object.type.includes('Helper') ||
				object.userData.isUI === true ||
				object.userData.isHighlight === true
			) {
				return;
			}

			// Only add top-level objects that aren't already in a hierarchy
			if (object.parent === this.scene) {
				const clone = object.clone(true); // deep clone
				this.pathTracerScene.add(clone);
			}
		});

		// Update the path tracer with the new scene
		let options = { onProgress: (v) => console.log('Updating path tracer scene:', v) };

		// Important fix: use this.pathTracerScene instead of pathTracerScene
		await this.pathTracer.setSceneAsync(this.pathTracerScene, this.camera, options);
	}

	excludeFromPathTracing(object) {
		this.setObjectPathTracingVisibility(object, false);
	}

	includeInPathTracing(object) {
		this.setObjectPathTracingVisibility(object, true);
	}

	excludeObjectTypeFromPathTracing(predicate) {
		this.scene?.traverse((object) => {
			if (predicate(object)) {
				this.excludeFromPathTracing(object);
			}
		});

		if (this.pathTracingEnabled && this.pathTracer) {
			this.updatePathTracerScene();
		}
	}

	excludeHelpersFromPathTracing() {
		this.excludeObjectTypeFromPathTracing((object) => {
			return (
				object.isHelper ||
				object.type.includes('Helper') ||
				(object.name && object.name.includes('Helper'))
			);
		});
	}

	excludeGroundFromPathTracing() {
		this.excludeObjectTypeFromPathTracing((object) => {
			return object.userData.isGround === true || (object.name && object.name === 'Ground');
		});
	}
}
