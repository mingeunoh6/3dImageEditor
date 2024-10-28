import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

class HDRLoader {
	constructor(scene, renderer, canvasResizer,scaleFactor) {
		this.scene = scene;
		this.renderer = renderer;
		this.canvasResizer = canvasResizer;
		this.scaleFactor = scaleFactor;
	}

	async loadHDR(url) {
		const rgbeLoader = new RGBELoader();
		return new Promise((resolve, reject) => {
			rgbeLoader.load(
				url,
				(texture) => {
					texture.mapping = THREE.EquirectangularReflectionMapping;

					this.scene.environment = texture;

					resolve(texture);
				},
				undefined,
				(error) => {
					reject(error);
				}
			);
		});
	}

	async loadDefaultHDR() {
		try {
			await this.loadHDR('/hdri/brown_photostudio_02_1k.hdr');
		} catch (error) {
			console.error('Error loading HDR:', error);
		}
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
						texture.colorSpace = THREE.SRGBColorSpace;
						this.scene.background = texture;

						const envTexture = texture.clone();
						envTexture.mapping = THREE.EquirectangularReflectionMapping;

						this.scene.environment = envTexture;

						const aspectRatio = texture.image.width / texture.image.height;
						this.canvasResizer(aspectRatio,this.scaleFactor);

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

	clearBackground() {
		this.scene.background = null;
	}

	clearEnvironment() {
		this.scene.environment = null;
	}
}

export default HDRLoader;
