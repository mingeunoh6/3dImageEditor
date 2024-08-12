import * as THREE from 'three';
class CustomDirectionalLight {
	constructor(color, intensity, position) {
		this.light = new THREE.DirectionalLight(color, intensity);
		this.light.position.set(...position);
		this.light.castShadow = true;
		this.light.shadow.bias = -0.0001;

		// Configure shadow map size and camera settings
		this.light.shadow.mapSize.width = 1024;
		this.light.shadow.mapSize.height = 1024;
		// this.light.shadow.camera.near = 0.5;
		// this.light.shadow.camera.far = 10;
		// this.light.shadow.camera.left = -5;
		// this.light.shadow.camera.right = 5;
		// this.light.shadow.camera.top = 5;
		// this.light.shadow.camera.bottom = -5;
	}

	addToScene(scene) {
		scene.add(this.light);
	}
}

export default CustomDirectionalLight;
