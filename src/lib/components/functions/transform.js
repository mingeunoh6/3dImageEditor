import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls';

class GLBModelController {
	constructor(scene, camera, renderer, orbitControls) {
		this.scene = scene;
		this.camera = camera;
		this.renderer = renderer;
		this.orbitControls = orbitControls;
		this.selectedObject = null;
		this.transformControls = new TransformControls(camera, renderer.domElement);

		// Add transform controls to the scene initially

		// Disable OrbitControls while TransformControls are active
		this.transformControls.addEventListener('dragging-changed', (event) => {
			this.orbitControls.enabled = !event.value;
		});

		// Bind the event listener only once
		this.handleKeyDown = this.handleKeyDown.bind(this);
		window.addEventListener('keydown', this.handleKeyDown);
	}

	handleKeyDown(event) {
		switch (event.key) {
			case 'q': // Disable TransformControls
				this.transformControls.detach();
				break;
			case 'w': // Translate
				this.transformControls.setMode('translate');
				break;
			case 'e': // Rotate
				this.transformControls.setMode('rotate');
				break;
			case 'r': // Scale
				this.transformControls.setMode('scale');
				break;
		}
	}

	setSelectedObj(object) {
		if (object === null) {
			this.transformControls.detach();
			this.selectedObject = null;
			return;
		}

		// Traverse up the hierarchy to find the root object
		let objectLayer = object;
		while (objectLayer.parent && objectLayer.parent.type !== 'Scene') {
			objectLayer = objectLayer.parent;
		}

		// If there's a new selected object
		if (this.selectedObject !== objectLayer) {
			this.selectedObject = objectLayer;
			this.transformControls.attach(this.selectedObject); // Attach to the transform controls
			console.log('Selected object:', this.selectedObject);
		}
	}

	getSelectedObj() {
		return this.selectedObject;
	}

	dispose() {
		// Remove the transform controls and event listeners on dispose
		this.transformControls.detach();
		this.scene.remove(this.transformControls);
		this.transformControls.dispose();
		window.removeEventListener('keydown', this.handleKeyDown);
	}
}

export default GLBModelController;
