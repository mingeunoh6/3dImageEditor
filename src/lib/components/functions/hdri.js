import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

class HDRLoader {
	constructor(scene, renderer, canvasResizer) {
		this.scene = scene;
		this.renderer = renderer;
		this.canvasResizer = canvasResizer;
	}

	async loadHDR(url) {
		const rgbeLoader = new RGBELoader();
		return new Promise((resolve, reject) => {
			rgbeLoader.load(
				url,
				(texture) => {
					texture.mapping = THREE.EquirectangularReflectionMapping;

					this.scene.environment = texture;
					this.scene.background = 0x1f1f1f;

					resolve(texture);
				},
				undefined,
				(error) => {
					reject(error);
				}
			);
		});
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
						this.canvasResizer(aspectRatio);

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
}

export default HDRLoader;
