import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

class GLBImporter {
	constructor(scene, controlGroup, renderer) {
		this.scene = scene;
		this.loader = new GLTFLoader();
		this.renderer = renderer;
		this.maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

		// Create a DRACOLoader and configure it
		const dracoLoader = new DRACOLoader();
		// Set the path to the Draco decoder files
		dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
		this.loader.setDRACOLoader(dracoLoader);

		this.controlGroup = controlGroup;
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
						this.controlGroup.add(gltf.scene);
						console.log('imported');
						gltf.scene.traverse((child) => {
							if (child.isMesh) {
								console.log('checking mesh');
								child.frustumCulled = false;
								child.castShadow = true;
								child.receiveShadow = true;
								//만약 매터리얼이 있다면, if mesh has an material, side is double

								if (child.material) {
									// Handle arrays of materials
									if (Array.isArray(child.material)) {
										child.material = child.material.map((mat) =>
											this.convertToPhysicalMaterial(mat)
										);
									} else {
										child.material = this.convertToPhysicalMaterial(child.material);
									}

									// Set double-sided rendering
									child.material.depthWrite = true;

									// child.material.depthTest = true;
									// child.material.side = THREE.DoubleSide;
									child.material.needsUpdate = true;

									//check renderer supports anisotropy

									if (child.material.map) {
										child.material.map.anisotropy = this.maxAnisotropy;
									}
								}
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

	convertToPhysicalMaterial(originalMaterial) {
		const physicalMaterial = new THREE.MeshPhysicalMaterial({
			// Base properties
			color: originalMaterial.color,
			map: originalMaterial.map,
			alphaMap: originalMaterial.alphaMap,
			normalMap: originalMaterial.normalMap,
			aoMap: originalMaterial.aoMap,
			aoMapIntensity: originalMaterial.aoMapIntensity,
			emissive: originalMaterial.emissive,
			emissiveMap: originalMaterial.emissiveMap,
			emissiveIntensity: originalMaterial.emissiveIntensity,

			// Physical material specific properties
			roughness: originalMaterial.roughness || 0.5,
			roughnessMap: originalMaterial.roughnessMap,
			metalness: originalMaterial.metalness || 0.5,
			metalnessMap: originalMaterial.metalnessMap,

			// Additional physical properties
			clearcoat: 0.0,
			clearcoatRoughness: 0.0,
			ior: 1.5,
			transmission: originalMaterial.transparent ? 0.95 : 0,

			// Common properties
			transparent: originalMaterial.transparent,
			opacity: originalMaterial.opacity,
			side: originalMaterial.side,
			alphaTest: originalMaterial.alphaTest,
			depthWrite: originalMaterial.depthWrite,
			depthTest: originalMaterial.depthTest
		});

		// Copy UV transformations if they exist
		if (originalMaterial.map) {
			physicalMaterial.map.repeat = originalMaterial.map.repeat;
			physicalMaterial.map.offset = originalMaterial.map.offset;
			physicalMaterial.map.wrapS = originalMaterial.map.wrapS;
			physicalMaterial.map.wrapT = originalMaterial.map.wrapT;
		}

		return physicalMaterial;
	}
}

export default GLBImporter;
