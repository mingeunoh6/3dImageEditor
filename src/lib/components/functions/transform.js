import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

class GLBModelController {
	constructor(scene, camera, renderer, orbitControls) {
		this.scene = scene;
		this.camera = camera;
		this.renderer = renderer;
		this.orbitControls = orbitControls;
		this.selectedObject = null;
		this.transformControls = new TransformControls(camera, renderer.domElement);

		this.init();
	}

	init() {}

	setSelectedObj(object) {
		if (object === null) {
			this.selectedObject = null;
			return;
		}

		// Traverse up the hierarchy to find the root object
		let objectLayer = object;
		while (objectLayer.parent && objectLayer.parent.type != 'Scene') {
			objectLayer = objectLayer.parent;
		}

		// If there's a new selected object
		if (this.selectedObject !== objectLayer) {
			this.selectedObject = objectLayer;
			// Detach transform controls from the previous object
			console.log('selectedObject:', this.selectedObject);
		}
	}

	getSelectedObj() {
		return this.selectedObject;
	}
}

export default GLBModelController;
