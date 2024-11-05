import * as THREE from 'three';
class ShadowLight {
	constructor(shadowDistance, shadowSize, shadowRotation) {
		this.shadowDistance = shadowDistance;
		this.shadowSize = shadowSize;
		this.shadowRotation = shadowRotation;
		this.shadowLightControlGroup = new THREE.Group();
		this.shadowLight = new THREE.DirectionalLight(0xffffff, 1);
		this.shadowLight.position.set(0, 50, 0);
		this.shadowLight.castShadow = true;
		this.shadowLight.shadow.mapSize.width = 2048;
		this.shadowLight.shadow.mapSize.height = 2048;
		this.shadowLight.shadow.camera.near = 0.1;
		this.shadowLight.shadow.camera.far = 1000;
		this.shadowLight.shadow.camera.left = -this.shadowSize;
		this.shadowLight.shadow.camera.right = this.shadowSize;
		this.shadowLight.shadow.camera.top = this.shadowSize;
		this.shadowLight.shadow.camera.bottom = -this.shadowSize;
		this.shadowLight.shadow.camera.rotation.y = this.shadowRotation;
		this.shadowLight.shadow.camera.updateProjectionMatrix();
		this.shadowLight.shadow.bias = -0.0001;

		this.shadowHelper = new THREE.CameraHelper(this.shadowLight.shadow.camera);
	}

	addToScene(scene) {
		this.shadowLightControlGroup.add(this.shadowLight);
		scene.add(this.shadowHelper);
		scene.add(this.shadowLightControlGroup);
	}

	changeRotation(rotation) {
		this.shadowRotation = rotation * (Math.PI / 180);
		this.shadowLightControlGroup.rotation.y = this.shadowRotation;
	}

	changeSize(size) {
		this.shadowSize = Number(size);
		this.shadowLight.shadow.camera.left = -this.shadowSize;
		this.shadowLight.shadow.camera.right = this.shadowSize;
		this.shadowLight.shadow.camera.top = this.shadowSize;
		this.shadowLight.shadow.camera.bottom = -this.shadowSize;
		this.shadowLight.shadow.camera.updateProjectionMatrix();
		this.shadowLight.shadow.camera.updateMatrixWorld();

		this.shadowHelper.update();
	}

	changeDistance(distacne) {
		this.shadowDistance = distacne;
		this.shadowLight.position.x = this.shadowDistance;
		this.shadowHelper.update();
	}

	toggleShadowHelper(isShadowHelper) {
		this.shadowHelper.visible = isShadowHelper;
		this.shadowHelper.update();
	}
}

export default ShadowLight;
