// tutorial-canvas.js

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export class TutorialCanvas {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        this.animationFrameId = null;
        this.heroModel = null;
        this.heroStartPosition = new THREE.Vector3(-3, 0, 0); // Start from left
        this.heroTargetPosition = new THREE.Vector3(0, 0, 0); // Move to center
        this.heroAnimationComplete = false;
        this.heroAnimationSpeed = 0.02; // Adjust speed as needed

        if (canvas) {
            this.init();
        }
    }

    async init() {
        // Create scene
        this.scene = new THREE.Scene();

        // Create camera
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(0, 0, 3);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.shadowMap.enabled = true;

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        //add hdri environment map
        // Load HDRI environment map
        const rgbeLoader = new RGBELoader();
        rgbeLoader.load('/hdri/brown_photostudio_02_1k.hdr', (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;

            // Set scene environment
            this.scene.environment = texture;

            // Optional: set as background (comment out if you want transparent background)
            // this.scene.background = texture;

            // Create PMREMGenerator to optimize the environment map
            const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
            pmremGenerator.compileEquirectangularShader();

            const envMap = pmremGenerator.fromEquirectangular(texture).texture;
            this.scene.environment = envMap;

            texture.dispose();
            pmremGenerator.dispose();
        });

        this.heroModel = await this.loadTutorialHero();

        // Position the hero at the starting position
        if (this.heroModel) {
            this.heroModel.position.copy(this.heroStartPosition);
            // Make the hero face the direction it's walking (towards center)
            this.heroModel.rotation.y = Math.PI * 0.5; // Rotate to face right/center
        }

        // Start animation loop
        this.animate();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        this.onWindowResize();
    }

    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());

        const deltaTime = this.clock.getDelta();

        // Animate hero walking from left to center
        if (this.heroModel && !this.heroAnimationComplete) {
            // Calculate step towards target
            const step = this.heroAnimationSpeed;

            // Move the hero model
            this.heroModel.position.lerp(this.heroTargetPosition, step);

            // Add a slight bobbing motion to simulate walking
            const walkCycle = Math.sin(this.clock.getElapsedTime() * 5) * 0.05;
            this.heroModel.position.y = walkCycle;

            // Check if we've reached the target (with a small threshold)
            if (this.heroModel.position.distanceTo(this.heroTargetPosition) < 0.05) {
                this.heroAnimationComplete = true;
                this.heroModel.position.copy(this.heroTargetPosition);
                this.heroModel.position.y = 0; // Reset the y position
            }
        }

        // Render scene
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    onWindowResize() {
        if (!this.canvas) return;

        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        if (this.camera) {
            this.camera.aspect = aspect;
            this.camera.updateProjectionMatrix();
        }

        if (this.renderer) {
            this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        }
    }

    loadTutorialHero() {
        return new Promise((resolve, reject) => {
            //call mgFace.glb and add to the scene
            // Load the GLB model
            const loader = new GLTFLoader();
            loader.load(
                '/mgFace.glb',
                (gltf) => {
                    const model = gltf.scene;

                    // Position the model appropriately
                    model.position.set(0, 0, 0);
                    model.scale.set(1, 1, 1);

                    // Apply materials and shadows if needed
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;

                            // If the model needs environment reflections
                            if (child.material) {
                                if (this.scene) {
                                    child.material.envMap = this.scene.environment;
                                }
                                child.material.needsUpdate = true;
                            }
                        }
                    });

                    // Add the model to the scene
                    if (this.scene) {
                        this.scene.add(model);
                    }

                    // Store reference to the model if needed for animations or interactions

                    console.log('Tutorial hero model loaded successfully');
                    resolve(model);
                },
                // Progress callback
                (xhr) => {
                    console.log(`Loading model: ${(xhr.loaded / xhr.total) * 100}% loaded`);
                },
                // Error callback
                (error) => {
                    console.error('Error loading tutorial hero model:', error);
                    reject(error);
                }
            );
        });
    }

    dispose() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        window.removeEventListener('resize', this.onWindowResize);

        // Dispose resources
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}