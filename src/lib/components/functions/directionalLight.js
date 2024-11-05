import * as THREE from 'three';
class CustomDirectionalLight {
	constructor(color, intensity, position, type) {
		this.type = type;
		this.light = new THREE.DirectionalLight(color, intensity);
		this.light.position.set(...position);

		switch (this.type) {
			case 'key':
				this.light.castShadow = false;
				this.light.shadow.bias = -0.000001;

				// Configure shadow map size and camera settings
				this.light.shadow.mapSize.width = 2048;
				this.light.shadow.mapSize.height = 2048;
				this.light.shadow.camera.near = 0.01;
				this.light.shadow.camera.far = 150;
				this.light.shadow.camera.left = -150;
				this.light.shadow.camera.right = 150;
				this.light.shadow.camera.top = 150;
				this.light.shadow.camera.bottom = -150;

				break;
			case 'fill':
				this.light.castShadow = false;

				break;
			case 'back':
				this.light.castShadow = false;
				break;
			default:
				this.light.castShadow = true;
		}
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
