import * as THREE from 'three';
class CustomDirectionalLight {
	constructor(color, intensity, position) {
		this.light = new THREE.DirectionalLight(color, intensity);
		this.light.position.set(...position);
		this.light.castShadow = true;
		this.light.shadow.bias = -0.0001;

		// Configure shadow map size and camera settings
		this.light.shadow.mapSize.width = 2048;
		this.light.shadow.mapSize.height = 2048;
		this.light.shadow.camera.near = 0.1;
		this.light.shadow.camera.far = 1000;
		this.light.shadow.camera.left = -100;
		this.light.shadow.camera.right = 100;
		this.light.shadow.camera.top = 100;
		this.light.shadow.camera.bottom = -100;
	}

	addToScene(scene) {
		scene.add(this.light);
	}

	changeIntensity(intensity) {
		this.light.intensity = intensity;
	}

	changeColor(color) {
		console.log(color);
		let hexColor = new THREE.Color(color);
		this.light.color = hexColor;
	}

	changeVisible(visible) {
		this.light.visible = visible;
	}
}

export default CustomDirectionalLight;
