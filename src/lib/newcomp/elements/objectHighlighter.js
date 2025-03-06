import * as THREE from 'three';

class ObjectHighlighter {
	constructor(renderer) {
		this.renderer = renderer;
		this.highlightMaterial = new THREE.MeshBasicMaterial({
			color: 0x00ff00,
			transparent: true,
			opacity: 0.3,
			depthTest: false
		});
		this.currentHighlight = null;
	}

	highlight(object) {
		// Clear previous highlight efficiently
		this.clearHighlight();

		if (!object) return;

		// Create a single, reusable highlight mesh
		const highlightMesh = this.createHighlightMesh(object);

		// Add to scene with minimal overhead
		this.renderer.scene.add(highlightMesh);
		this.currentHighlight = highlightMesh;
	}

	createHighlightMesh(object) {
		// Compute bounding box once
		const box = new THREE.Box3().setFromObject(object);
		const size = box.getSize(new THREE.Vector3());

		// Create a single geometry that encompasses the entire object
		const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);

		// Create a single highlight mesh
		const highlightMesh = new THREE.Mesh(geometry, this.highlightMaterial);

		// Position the highlight mesh at the center of the original object
		const center = box.getCenter(new THREE.Vector3());
		highlightMesh.position.copy(center);

		// Slightly scale up to ensure visibility
		highlightMesh.scale.multiplyScalar(1.1);

		// Mark as highlight mesh for easy identification
		highlightMesh.userData.isHighlight = true;

		return highlightMesh;
	}

	clearHighlight() {
		if (this.currentHighlight) {
			// Remove the previous highlight mesh
			this.renderer.scene.remove(this.currentHighlight);

			// Dispose of geometry to free memory
			this.currentHighlight.geometry.dispose();
			this.currentHighlight = null;
		}
	}

	dispose() {
		this.clearHighlight();
		this.highlightMaterial.dispose();
	}
}


class EdgeHighlighter {
	constructor(renderer, options = {}) {
		this.renderer = renderer;
		this.scene = renderer.scene;

		// Default options
		this.options = {
			edgeColor: 0x00ff00,
			edgeThickness: 3,
			...options
		};

		// Create a shader material for edge detection
		this.edgeShaderMaterial = this.createEdgeShaderMaterial();

		// Store original materials to restore later
		this.originalMaterials = new WeakMap();

		// Currently highlighted object
		this.currentHighlightedObject = null;
	}

	createEdgeShaderMaterial() {
		return new THREE.ShaderMaterial({
			uniforms: {
				edgeColor: { value: new THREE.Color(this.options.edgeColor) },
				edgeThickness: { value: this.options.edgeThickness }
			},
			vertexShader: `
                uniform float edgeThickness;
                
                void main() {
                    // Expand the vertex along its normal
                    vec3 expandedPosition = position + normal * edgeThickness * 0.01;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(expandedPosition, 1.0);
                }
            `,
			fragmentShader: `
                uniform vec3 edgeColor;
                
                void main() {
                    gl_FragColor = vec4(edgeColor, 1.0);
                }
            `,
			side: THREE.BackSide,
			transparent: false,
			depthTest: true
		});
	}

	highlight(object) {
		// Clear previous highlight
		this.clearHighlight();

		if (!object) return;

		// Store and replace materials
		this.storeMaterials(object);
		this.applyEdgeHighlight(object);

		this.currentHighlightedObject = object;
	}

	storeMaterials(object) {
		// Store original materials for restoration
		object.traverse((child) => {
			if (child.isMesh) {
				// Store original materials
				this.originalMaterials.set(child, child.material);

				// Create edge highlight materials
				const edgeMaterial =
					child.material instanceof Array
						? child.material.map(() => this.edgeShaderMaterial.clone())
						: this.edgeShaderMaterial.clone();

				child.material = edgeMaterial;
			}
		});
	}

	applyEdgeHighlight(object) {
		// Additional visual emphasis can be added here if needed
		object.traverse((child) => {
			if (child.isMesh) {
				child.renderOrder = 1; // Ensure edges are rendered on top
			}
		});
	}

	clearHighlight() {
		if (this.currentHighlightedObject) {
			// Restore original materials
			this.currentHighlightedObject.traverse((child) => {
				if (child.isMesh && this.originalMaterials.has(child)) {
					child.material = this.originalMaterials.get(child);
					child.renderOrder = 0;
				}
			});

			this.currentHighlightedObject = null;
		}
	}

	dispose() {
		// Clean up any resources if needed
		this.clearHighlight();
		this.edgeShaderMaterial.dispose();
	}

	// Optional: Update highlight color dynamically
	setEdgeColor(color) {
		this.options.edgeColor = color;
		this.edgeShaderMaterial.uniforms.edgeColor.value.set(color);
	}

	// Optional: Update edge thickness
	setEdgeThickness(thickness) {
		this.options.edgeThickness = thickness;
		this.edgeShaderMaterial.uniforms.edgeThickness.value = thickness;
	}
}
export  {ObjectHighlighter, EdgeHighlighter};