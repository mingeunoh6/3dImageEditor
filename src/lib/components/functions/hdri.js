import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

class HDRLoader {
	constructor(scene, renderer) {
		this.scene = scene;
		this.renderer = renderer;
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
}

export default HDRLoader;
