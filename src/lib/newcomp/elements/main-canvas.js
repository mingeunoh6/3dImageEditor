import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export class mainRenderer {
	constructor(canvas, options = {}) {
        console.log(canvas)
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
		this.camera = null;
		this.renderer = null;
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

		// Bind methods
		this.init = this.init.bind(this);
		this.resize = this.resize.bind(this);
		this.render = this.render.bind(this);
		this.animate = this.animate.bind(this);
		this.dispose = this.dispose.bind(this);
		this.checkOrientation = this.checkOrientation.bind(this);
		this.loadHDRI = this.loadHDRI.bind(this);

		if (this.canvas) {
			this.init();
		}
	}

	init() {
		if (this.isInitialized) return;
console.log('create-main-renderer');
		// Create scene
		this.scene = new THREE.Scene();
		if (!this.options.useHDRI) {
			this.scene.background = this.options.background;
		}

		this.resize();

		// Create camera
		this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
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

		// Enable shadows
		if (this.options.shadows) {
			this.renderer.shadowMap.enabled = true;
			this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		}

		// Create orbit controls
		this.controls = new OrbitControls(this.camera, this.canvas);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.05;
		this.controls.autoRotate = this.options.autoRotate;
		this.controls.autoRotateSpeed = this.options.autoRotateSpeed;

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

		// Create lighting setup
		this.setupLights();

		// Setup resize observer
		this.resizeObserver = new ResizeObserver(() => {
			this.resize();
		});
		this.resizeObserver.observe(this.canvas);

		// Mark as initialized
		this.isInitialized = true;
	}

	resize() {
		if (!this.canvas) return;

        console.log('canvas resizing')


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
	}

	checkOrientation() {
		const wasPortrait = this.isPortrait;
		this.isPortrait = window.innerHeight > window.innerWidth;

		// Return true if orientation changed
		return wasPortrait !== this.isPortrait;
	}

	loadHDRI(path) {
		return new Promise((resolve, reject) => {
			new RGBELoader().load(
				path,
				(texture) => {
					this.envMap = this.pmremGenerator?.fromEquirectangular(texture).texture;
					this.scene.background = this.envMap;
					this.scene.environment = this.envMap;

					texture.dispose();
					this.pmremGenerator.dispose();

					resolve(this.envMap);
				},
				undefined,
				reject
			);
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
	}

	addObject(object, centerAndScale = true) {
     
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
		if (this.envMap) {
			object.traverse((child) => {
				if (child.isMesh && child.material) {
					// Handle material arrays
					if (Array.isArray(child.material)) {
						child.material.forEach((material) => {
							if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
								material.envMap = this.envMap;
								material.envMapIntensity = this.options.envMapIntensity;
								material.needsUpdate = true;
							}
						});
					}
					// Handle single materials
					else if (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial) {
						child.material.envMap = this.envMap;
						child.material.envMapIntensity = this.options.envMapIntensity;
						child.material.needsUpdate = true;
					}

					// Enable shadows
					if (this.options.shadows) {
						child.castShadow = true;
						child.receiveShadow = true;
					}
				}
			});
		}

		this.scene.add(object);
		return object;
	}

	createGround(size = 20, material = null) {
		const geometry = new THREE.PlaneGeometry(size, size);
		const defaultMaterial =
			material ||
			new THREE.MeshStandardMaterial({
				color: 0x999999,
				metalness: 0.1,
				roughness: 0.9
			});

		const ground = new THREE.Mesh(geometry, defaultMaterial);
		ground.rotation.x = -Math.PI / 2;
		ground.position.y = -0.001; // Slight offset to prevent z-fighting
		ground.receiveShadow = this.options.shadows;

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
		if (!this.renderer || !this.scene || !this.camera) return;

		this.controls.update();
		this.renderer.render(this.scene, this.camera);
	}

	animate() {
		if (!this.isInitialized || this.isAnimating) return;

		this.isAnimating = true;
		this.clock.start();

		const loop = () => {
			this.frameId = requestAnimationFrame(loop);
			this.render();
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
			this.renderer.setSize(useWidth, useHeight);
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
}