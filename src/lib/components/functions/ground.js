import * as THREE from 'three';

class ShadowGround {
	constructor(size) {
		this.ground = new THREE.Mesh(
			new THREE.PlaneGeometry(size, size),
			new THREE.ShadowMaterial({ opacity: 0.2 })
		);
		this.ground.rotation.x = -Math.PI / 2;
		this.ground.receiveShadow = true;
		this.ground.name = 'ground';
		this.grid = new THREE.GridHelper(size, 100, 0xffffff, 0xffffff);
		this.grid.name = 'grid';
	}

	addToScene(scene) {
		scene.add(this.ground);
	}

	addGrid(scene) {
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
