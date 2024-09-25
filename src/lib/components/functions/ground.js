import * as THREE from 'three';

class ShadowGround {
	constructor(size) {
		this.ground = new THREE.Mesh(
			new THREE.PlaneGeometry(size, size),
			new THREE.ShadowMaterial({ opacity: 0.5 })
		);
		this.ground.rotation.x = -Math.PI / 2;
		this.ground.receiveShadow = true;
		this.grid = new THREE.GridHelper(size, 30, 0xffffff, 0xffffff);
	}

	addToScene(scene) {
		scene.add(this.ground);
		scene.add(this.grid);
	}

	gridOption(visible) {
		this.grid.visible = visible;
	}

	changeSize(size) {
		this.ground.geometry = new THREE.PlaneGeometry(size, size);
	}

	shadowOpacity(opacity) {
		this.ground.material.opacity = opacity;
	}

	changeVisible(visible) {
		this.ground.visible = visible;
	}
}

export default ShadowGround;
