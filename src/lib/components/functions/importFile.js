import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

class GLBImporter {
	constructor(scene) {
		this.scene = scene;
		this.loader = new GLTFLoader();
	}

	importGLB(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (event) => {
				const contents = event.target.result;
				this.loader.parse(
					contents,
					'',
					(gltf) => {
						this.scene.add(gltf.scene);
						gltf.scene.traverse((child) => {
							if (child.isMesh) {
								child.castShadow = true;
								child.receiveShadow = true;
							}
						});
						resolve(gltf.scene);
					},
					(error) => {
						reject(error);
					}
				);
			};
			reader.readAsArrayBuffer(file);
		});
	}
}

export default GLBImporter;
