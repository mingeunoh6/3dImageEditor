import * as THREE from 'three';

class Wall {
	constructor(width = 1, height = 1, depth = 1) {
		// Create geometry with default or provided dimensions
		this.geometry = new THREE.BoxGeometry(width, height, depth);

		// Create material with a default color
		this.material = new THREE.MeshStandardMaterial({
			color: 0x808080, // Gray color
			roughness: 0.7,
			metalness: 0.3
		});

		// Create the mesh
		this.mesh = new THREE.Mesh(this.geometry, this.material);
	}

	// Method to update dimensions
	updateDimensions(width, height, depth) {
		// Remove old geometry
		this.geometry.dispose();

		// Create new geometry with updated dimensions
		this.geometry = new THREE.BoxGeometry(width, height, depth);
		this.mesh.geometry = this.geometry;
	}

	// Method to update material color
	setColor(color) {
		this.material.color.set(color);
	}

	// Method to update position
	setPosition(x, y, z) {
		this.mesh.position.set(x, y, z);
	}

	// Method to update rotation
	setRotation(x, y, z) {
		this.mesh.rotation.set(x, y, z);
	}

	// Method to get the mesh
	getMesh() {
		return this.mesh;
	}
}

export default Wall;
