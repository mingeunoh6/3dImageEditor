<script>
	import { onMount, createEventDispatcher } from 'svelte';
	import Icon from '@iconify/svelte';
	import ExpandPanel from './EP.svelte';
	import GLBPanel from './EP-GLB.svelte';


	let language = 'en';
	let aiPanelStatus = false;
	let glbPanelStatus = false;
	let fov = 10;
	let subLightRot = 0;
	let envMapIntensity = 1;
	let isBackground = false;
	let lightIntensity = 1;
	let light1status = true;
	let light1intensity = 1.2;
	let light1color = 'ffffff';
	let light2status = true;
	let light2intensity = 0.7;
	let light2color = 'ffffff';
	let light3status = true;
	let light3intensity = 0.3;
	let light3color = 'ffffff';
	let light0status = true;
	let light0intensity = 0.3;
	let light0color = 'ffffff';
	let currentSetting = 'product-setting';
	let gridStatus = false;

	let shadowOpacity = 0.5;
	let shadowDistance = 0;
	let shadowSize = 250;
	let shadowRotation = 0;
	let isShadowHelper = false;

	let envRotation = 0;
	let envIntensity = 1;

	const dispatch = createEventDispatcher();
	function handleGLBImport(event) {
		glbPanelStatus = false;
		aiPanelStatus = false;
		document.getElementById('expand-panel-ai').style.left = '0%';
		document.getElementById('expand-panel-glb').style.left = '0%';
		const file = event.target.files[0];
		if (file) {
			dispatch('importGLB', { file });
			event.target.value = '';
		}
	}
	function handleBGImport(event) {
		glbPanelStatus = false;
		aiPanelStatus = false;
		document.getElementById('expand-panel-ai').style.left = '0%';
		document.getElementById('expand-panel-glb').style.left = '0%';
		isBackground = true;
		const file = event.target.files[0];
		if (file) {
			dispatch('importBG', { file });
		}
	}

	async function handleApplyAIBG(event) {
		isBackground = true;
		const imageUrl = event.detail.imageUrl;
		try {
			const response = await fetch(imageUrl);
			const blob = await response.blob();
			const file = new File([blob], 'background.png', { type: 'image/png' });

			// Now call your existing handleBGImport with the file
			dispatch('importBG', { file });

			// Close the AI panel
			aiPanelStatus = false;
			document.getElementById('expand-panel-ai').style.left = '0%';
		} catch (error) {
			console.error('Error converting URL to file:', error);
		}
	}

	async function handleAssetSelection(event) {
		glbPanelStatus = false;
		document.getElementById('expand-panel-glb').style.left = '0%';
		const assetName = event.detail.assetName;
		dispatch('selectAsset', { assetName });
	}

	function handleCameraFov(e) {
		fov = e.target.value;
		dispatch('changeFov', { fov });
	}

	function handleGridStatus(e) {
		const { id, checked } = e.target;

		gridStatus = checked;
		dispatch('changeGridStatus', { gridStatus });
	}

	function handleShadow(e) {
		const { id, value } = e.target;

		switch (id) {
			case 'shadow-opacity':
				shadowOpacity = value;
				dispatch('changeShadow', { type: 'opacity', value: shadowOpacity });
				break;
			case 'shadow-distance':
				shadowDistance = value;
				dispatch('changeShadow', { type: 'distance', value: shadowDistance });
				break;
			case 'shadow-rotation':
				shadowRotation = value;
				dispatch('changeShadow', { type: 'rotation', value: shadowRotation });
				break;
			case 'shadow-size':
				shadowSize = value;
				dispatch('changeShadow', { type: 'size', value: shadowSize });
				break;
			case 'shadow-helper':
				isShadowHelper = e.target.checked;
				dispatch('changeShadow', { type: 'helper', value: isShadowHelper });
		}

		// dispatch('changeShadow', { shadowOpacity });
	}

	function handleColorChange(e) {
		const { id, value } = e.target;
		let lightId;

		if (id === 'light-1-color' || id === 'light-1-color-input') {
			light1color = value.replace('#', '');
			lightId = 1;

			dispatch('changeSubLightColor', { lightId, lightColor: value });
		} else if (id === 'light-2-color' || id === 'light-2-color-input') {
			light2color = value.replace('#', '');
			lightId = 2;

			dispatch('changeSubLightColor', { lightId, lightColor: value });
		} else if (id === 'light-3-color' || id === 'light-3-color-input') {
			light3color = value.replace('#', '');
			lightId = 3;

			dispatch('changeSubLightColor', { lightId, lightColor: value });
		} else if (id === 'light-0-color' || id === 'light-0-color-input') {
			light0color = value.replace('#', '');
			lightId = 0;

			dispatch('changeSubLightColor', { lightId, lightColor: value });
		}
	}

	function handleSubLightRot(e) {
		subLightRot = e.target.value;
		console.log(subLightRot);
		dispatch('changeSubLightRot', { subLightRot });
	}

	function handleSubLightIntensity(e) {
		const { id, value } = e.target;
		let lightId;

		switch (id) {
			case 'light-1-intensity':
				light1intensity = value;
				lightId = 1;
				dispatch('changeSubLightIntensity', { lightId, lightIntensity: value });
				break;
			case 'light-2-intensity':
				light2intensity = value;
				lightId = 2;
				dispatch('changeSubLightIntensity', { lightId, lightIntensity: value });
				break;
			case 'light-3-intensity':
				light3intensity = value;
				lightId = 3;
				dispatch('changeSubLightIntensity', { lightId, lightIntensity: value });
				break;
			case 'light-0-intensity':
				light0intensity = value;
				lightId = 0;
				dispatch('changeSubLightIntensity', { lightId, lightIntensity: value });
				break;
		}

		// console.log(lightIntensity);
		// dispatch('changeSubLightIntensity', { lightIntensity });
	}

	function handleSubLightStatus(e) {
		const { id, checked } = e.target;
		if (id === 'light-1-switch') {
			light1status = checked;
			switch (checked) {
				case true:
					console.log('light1 on');
					break;
				case false:
					console.log('light1 off');
					break;
			}
			dispatch('changeSubLightStatus', { lightId: 1, lightStatus: checked });
		} else if (id === 'light-2-switch') {
			light2status = checked;
			switch (checked) {
				case true:
					console.log('light2 on');
					break;
				case false:
					console.log('light2 off');
					break;
			}
			dispatch('changeSubLightStatus', { lightId: 2, lightStatus: checked });
		} else if (id === 'light-3-switch') {
			light3status = checked;
			switch (checked) {
				case true:
					console.log('light3 on');
					break;
				case false:
					console.log('light3 off');
					break;
			}
			dispatch('changeSubLightStatus', { lightId: 3, lightStatus: checked });
		} else if (id === 'light-0-switch') {
			light0status = checked;
			switch (checked) {
				case true:
					console.log('light0 on');
					break;
				case false:
					console.log('light0 off');
					break;
			}
			dispatch('changeSubLightStatus', { lightId: 0, lightStatus: checked });
		}
	}

	function handleEnvironment(e) {
		const { id, value } = e.target;

		switch (id) {
			case 'envRotation':
				envRotation = value;
				dispatch('changeEnvironment', { type: 'rotation', value: envRotation });
				break;

			case 'envIntensity':
				envIntensity = value;
				dispatch('changeEnvironment', { type: 'intensity', value: envIntensity });
				break;
		}
	}

	function openAIpanel() {
		aiPanelStatus = !aiPanelStatus;
		glbPanelStatus = false;
		document.getElementById('expand-panel-glb').style.left = '0%';
		if (aiPanelStatus) {
			document.getElementById('expand-panel-ai').style.left = '100%';
		} else {
			document.getElementById('expand-panel-ai').style.left = '0%';
		}
	}

	function open3Dpanel() {
		glbPanelStatus = !glbPanelStatus;
		aiPanelStatus = false;
		document.getElementById('expand-panel-ai').style.left = '0%';
		if (glbPanelStatus) {
			document.getElementById('expand-panel-glb').style.left = '100%';
		} else {
			document.getElementById('expand-panel-glb').style.left = '0%';
		}
	}

	function closeAllExtendedPanel() {
		aiPanelStatus = false;
		glbPanelStatus = false;
		document.getElementById('expand-panel-ai').style.left = '0%';
		document.getElementById('expand-panel-glb').style.left = '0%';
	}

	function closeAIpanel() {
		aiPanelStatus = false;
		document.getElementById('expand-panel-ai').style.left = '0%';
	}

	function close3Dpanel() {
		glbPanelStatus = false;
		document.getElementById('expand-panel-glb').style.left = '0%';
	}


	function handleSettingButtonBG(target){

		const buttons= document.querySelectorAll('.setting-btn');
		//reset all buttons bg except the target
		buttons.forEach(button=>{
			if(button.id !== target.id){
				button.style.background = 'var(--block-color)';
			}
		});
		//change target button bg
		target.style.background = 'var(--background-color)';
	}



	function handleSettingSwitch(e) {
		const { id } = e.target;
		currentSetting = id;
		console.log(id);
 handleSettingButtonBG(e.target)
		switch (id) {
			case 'product-setting':
				document.getElementById('product').style.display = 'block';
			
				document.getElementById('bg').style.display = 'none';
				document.getElementById('camera').style.display = 'none';
				document.getElementById('shadow').style.display = 'none';
				document.getElementById('light').style.display = 'none';
					document.getElementById('system').style.display = 'none';
				closeAIpanel();
				break;
			case 'BG-setting':
				document.getElementById('product').style.display = 'none';
				document.getElementById('bg').style.display = 'block';
				document.getElementById('camera').style.display = 'none';
				document.getElementById('shadow').style.display = 'none';
				document.getElementById('light').style.display = 'none';
					document.getElementById('system').style.display = 'none';
				close3Dpanel();
				break;
			case 'camera-setting':
				document.getElementById('product').style.display = 'none';
				document.getElementById('bg').style.display = 'none';
				document.getElementById('camera').style.display = 'block';
				document.getElementById('shadow').style.display = 'none';
				document.getElementById('light').style.display = 'none';
					document.getElementById('system').style.display = 'none';
				closeAllExtendedPanel();
				break;
			case 'shadow-setting':
				document.getElementById('product').style.display = 'none';
				document.getElementById('bg').style.display = 'none';
				document.getElementById('camera').style.display = 'none';
				document.getElementById('shadow').style.display = 'block';
				document.getElementById('light').style.display = 'none';
					document.getElementById('system').style.display = 'none';
				closeAllExtendedPanel();
				break;
			case 'light-setting':
				document.getElementById('product').style.display = 'none';
				document.getElementById('bg').style.display = 'none';
				document.getElementById('camera').style.display = 'none';
				document.getElementById('shadow').style.display = 'none';
				document.getElementById('light').style.display = 'block';
				document.getElementById('system').style.display = 'none';
				closeAllExtendedPanel();
				break;
			case 'system-setting':
				document.getElementById('product').style.display = 'none';
				document.getElementById('bg').style.display = 'none';
				document.getElementById('camera').style.display = 'none';
				document.getElementById('shadow').style.display = 'none';
				document.getElementById('light').style.display = 'none';
				document.getElementById('system').style.display = 'block';
				closeAllExtendedPanel();
				break;
		}
	}

	onMount(() => {
		console.log('Hello LNB component');
	});
</script>

<section>
	<div class="Top-bar">
		<div class="main-title">
			<h5>PROJECT DASH 3D BETA 3.0.1 </h5>
				<h5>HSAD</h5>
		</div>
		<div class="main-title-sub">
			<h5>LAST UPDATE 2024-11-18</h5>
				
		</div>
	
	</div>

	<div class="setting-wrapper">
		<div class="switchWrapper">
			<div class="setting-btn" id="product-setting" on:click={handleSettingSwitch}>
				<Icon icon="fluent-mdl2:product" class="setting-icon" />
				<div class="setting-title">제품</div>
			</div>

			<div class="setting-btn" id="BG-setting" on:click={handleSettingSwitch}>
				<Icon icon="tabler:background" class="setting-icon" />
				<div class="setting-title">배경</div>
			</div>
			<div class="setting-btn" id="camera-setting" on:click={handleSettingSwitch}>
				<Icon icon="iconoir:perspective-view" class="setting-icon" />
				<div class="setting-title">FOV</div>
			</div>
			<div class="setting-btn" id="shadow-setting" on:click={handleSettingSwitch}>
				<Icon icon="ri:shadow-line" class="setting-icon" />
				<div class="setting-title">그림자</div>
			</div>
			<div class="setting-btn" id="light-setting" on:click={handleSettingSwitch}>
				<Icon icon="mdi:television-ambient-light" class="setting-icon" />
				<div class="setting-title">조명</div>
			</div>

			
				<div class="margin-block"></div>
				<!-- <div class="setting-btn" id="system-setting" on:click={handleSettingSwitch}>
					<Icon icon="lets-icons:setting-fill" class="setting-icon" />
					<div class="setting-title">설정</div>
				</div> -->
		
		</div>
		<div class="sectionWrapper">
				<div class="margin-block-S"></div>
			<!-- 제품설정 -->
			<div id="product" class="setting-detail product-detail">
				<div class="sub-title">
					<h5>제품 모델을 추가해주세요.</h5>
				</div>
				<div class="sub-card">
					<input
						type="file"
						id="glb-import"
						accept=".glb,.gltf"
						style="display: none;"
						on:input={handleGLBImport}
					/>
					<div class="button-list">
						<button class="btn" on:click={() => document.getElementById('glb-import').click()}
							>*.glb 파일 불러오기</button
						>
						<button id="3d-panel-open-btn" on:click={open3Dpanel} class="btn"
							>라이브러리에서 불러오기</button
						>
					</div>
				</div>
			</div>

			<!-- 배경설정 -->
			<div id="bg" class="setting-detail bg-detail">
				<div class="sub-title">
					<h5>배경을 추가해주세요.</h5>
				</div>
				<div class="sub-card">
					<input
						type="file"
						id="bg-import"
						accept=".png,.jpg,.jpeg, .webp"
						style="display: none;"
						on:change={handleBGImport}
					/>
					<div class="button-list">
						<button class="btn" on:click={() => document.getElementById('bg-import').click()}
							>배경 불러오기</button
						>
						<button id="ai-panel-open-btn" on:click={openAIpanel} class="btn"
							><div class="btn-icon-group">
								<Icon icon="mingcute:ai-fill" class="button-icon" />AI로 배경 생성
							</div></button
						>
					</div>
				</div>
				{#if isBackground}
						<div class="sub-sub-card-title">배경 광원 설정</div>
					<div class="sub-sub-card">
				
						<div class="sub-sub-card-content">
							<div class="sub-sub-card-property-title">회전</div>
							<input
								class="slider"
								type="range"
								id="envRotation"
								name="envRotation"
								min="0"
								max="360"
								value={envRotation}
								step="0.01"
								on:input={(e) => handleEnvironment(e)}
							/>
							<label for="envRotation">{envRotation}°</label>
						</div>
					</div>
							<div class="sub-sub-card">
						<div class="sub-sub-card-content">
							<div class="sub-sub-card-property-title">강도</div>
							<input
								class="slider"
								type="range"
								id="envIntensity"
								name="envIntensity"
								min="0"
								max="2"
								value={envIntensity}
								step="0.01"
								on:input={(e) => handleEnvironment(e)}
							/>
							<label for="envIntensity">{envIntensity}</label>
						</div>
					</div>
				{/if}
			</div>

			<!-- 카메라설정 -->
			<div id="camera" class="setting-detail camera-detail">
				<div class="sub-title">
					<h5>카메라 FOV를 변경합니다.</h5>
				</div>
				<div class="sub-sub-card">
					<div class="sub-sub-card-content">
						<div class="sub-sub-card-property-title">FOV 각도</div>
						<input
							class="slider"
							type="range"
							id="fov"
							name="fov"
							min="1"
							max="179"
							value={fov}
							on:input={(e) => handleCameraFov(e)}
						/>
						<label for="fov">{fov}°</label>
					</div>
				</div>
				<div class="sub-sub-card">
					<div class="sub-sub-card-content">
						<div class="sub-sub-card-property-title">투시 가이드</div>

						<label class="switch">
							<input
								type="checkbox"
								id="grid-switch"
								checked={gridStatus}
								on:input={(e) => handleGridStatus(e)}
							/>
							<span class="toggle-slider round"></span>
						</label>
					</div>
				</div>
			</div>

			<!-- 그림자 설정 -->
			<div id="shadow" class="setting-detail shadow-detail">
				<div class="sub-title">
					<h5>그림자 설정을 변경해보세요.</h5>
				</div>
				<div class="sub-sub-card">
					<div class="sub-sub-card-content">
						<div class="sub-sub-card-property-title">광원 가이드</div>

						<label class="switch">
							<input
								type="checkbox"
								id="shadow-helper"
								checked={isShadowHelper}
								on:input={(e) => handleShadow(e)}
							/>
							<span class="toggle-slider round"></span>
						</label>
					</div>
				</div>
				<div class="sub-sub-card">
					<div class="sub-sub-card-content">
						<div class="sub-sub-card-property-title">투명도</div>

						<input
							class="slider"
							type="range"
							id="shadow-opacity"
							name="shadow-opacity"
							min="0"
							max="1"
							value={shadowOpacity}
							step=".01"
							on:input={(e) => handleShadow(e)}
						/>
						<label for="shadow-opacity">{Math.round(shadowOpacity * 100)}%</label>
					</div>
				</div>
				<div class="sub-sub-card">
					<div class="sub-sub-card-content">
						<div class="sub-sub-card-property-title">거리</div>

						<input
							class="slider"
							type="range"
							id="shadow-distance"
							name="shadow-distance"
							min="0"
							max="100"
							value={shadowDistance}
							step=".1"
							on:input={(e) => handleShadow(e)}
						/>
						<label for="shadow-distance">{shadowDistance}</label>
					</div>
				</div>
				<div class="sub-sub-card">
					<div class="sub-sub-card-content">
						<div class="sub-sub-card-property-title">회전</div>

						<input
							class="slider"
							type="range"
							id="shadow-rotation"
							name="shadow-rotation"
							min="0"
							max="360"
							value={shadowRotation}
							step=".01"
							on:input={(e) => handleShadow(e)}
						/>

						<label for="shadow-rotation">{shadowRotation}°</label>
					</div>
				</div>
				<div class="sub-sub-card">
					<div class="sub-sub-card-content">
						<div class="sub-sub-card-property-title">광원크기</div>

						<input
							class="slider"
							type="range"
							id="shadow-size"
							name="shadow-size"
							min="1"
							max="1000"
							value={shadowSize}
							step="1"
							on:input={(e) => handleShadow(e)}
						/>

						<label for="shadow-size">{shadowSize}</label>
					</div>
				</div>
			</div>

			<!-- 3점 스튜디오 조명 설정 -->
			<div id="light" class="setting-detail light-detail">
				<div class="margin-block-S"></div>
				<div class="sub-title">
					<h5>스튜디오 조명을 설정할 수 있습니다.</h5>
				</div>
				<div class="sub-sub-card">
					<div class="sub-sub-card-content">
						<div class="sub-sub-card-property-title">회전</div>

						<input
							class="slider"
							type="range"
							id="sub-light-rot"
							name="sub-light-rot"
							min="0"
							max="360"
							value="0"
							step=".01"
							on:input={(e) => handleSubLightRot(e)}
						/>
						<label for="sub-light-rot">{subLightRot}°</label>
					</div>
				</div>
				<div class="margin-block"></div>

				<!-- 간접광 설정 -->
				<div class="sub-sub-card-title">간접광(Ambient-light)</div>
				<div class="sub-sub-card">
					<div class="sub-sub-card-content">
						<div class="sub-sub-card-property-title">전원</div>

						<label class="switch">
							<input
								type="checkbox"
								id="light-0-switch"
								checked={light0status}
								on:input={(e) => handleSubLightStatus(e)}
							/>
							<span class="toggle-slider round"></span>
						</label>
					</div>
				</div>
				<div class="sub-sub-card">
					<div class="sub-sub-card-content">
						<div class="sub-sub-card-property-title">강도</div>
						<input
							id="light-0-intensity"
							name="light-0-intensity"
							class="slider"
							type="range"
							min="0"
							max="2"
							value={light0intensity}
							step="0.01"
							on:input={(e) => handleSubLightIntensity(e)}
						/>
						<label for="light-0-intensity">{light0intensity}</label>
					</div>
				</div>
				<div class="sub-sub-card">
					<div class="sub-sub-card-content">
						<div class="sub-sub-card-property-title">색</div>
						<input
							class="colorPicker"
							type="color"
							id="light-0-color"
							name="light-0-color"
							value={`#` + `${light0color}`}
							on:input={(e) => handleColorChange(e)}
						/>
						<div class="colorInputGroup">
							#{light0color}
						</div>
					</div>
				</div>
				<div class="margin-block"></div>

				<!-- 3점 조명 설정 -->

				<!-- 키라이트 설정 -->
				<div class="sub-sub-card-title">1. 키 라이트(Key-light)</div>
				<div class="sub-sub-card">
					<div class="sub-sub-card-content">
						<div class="sub-sub-card-property-title">전원</div>

						<label class="switch">
							<input
								type="checkbox"
								id="light-1-switch"
								checked={light1status}
								on:input={(e) => handleSubLightStatus(e)}
							/>
							<span class="toggle-slider round"></span>
						</label>
					</div>
				</div>
				<div class="sub-sub-card">
					<div class="sub-sub-card-content">
						<div class="sub-sub-card-property-title">강도</div>
						<input
							id="light-1-intensity"
							name="light-1-intensity"
							class="slider"
							type="range"
							min="0"
							max="2"
							value={light1intensity}
							step="0.01"
							on:input={(e) => handleSubLightIntensity(e)}
						/>
						<label for="light-1-intensity">{light1intensity}</label>
					</div>
				</div>
				<div class="sub-sub-card">
					<div class="sub-sub-card-content">
						<div class="sub-sub-card-property-title">색</div>
						<input
							class="colorPicker"
							type="color"
							id="light-1-color"
							name="light-1-color"
							value={`#` + `${light1color}`}
							on:input={(e) => handleColorChange(e)}
						/>
						<div class="colorInputGroup">
							#{light1color}
						</div>
					</div>
				</div>
				<div class="margin-block"></div>
				<!-- 필라이트 설정 -->
				<div class="sub-sub-card-title">2. 필 라이트(Fill-light)</div>
				<div class="sub-sub-card">
					<div class="sub-sub-card-content">
						<div class="sub-sub-card-property-title">전원</div>

						<label class="switch">
							<input
								type="checkbox"
								id="light-2-switch"
								checked={light2status}
								on:input={(e) => handleSubLightStatus(e)}
							/>
							<span class="toggle-slider round"></span>
						</label>
					</div>
				</div>
				<div class="sub-sub-card">
					<div class="sub-sub-card-content">
						<div class="sub-sub-card-property-title">강도</div>
						<input
							id="light-2-intensity"
							name="light-2-intensity"
							class="slider"
							type="range"
							min="0"
							max="2"
							value={light2intensity}
							step="0.01"
							on:input={(e) => handleSubLightIntensity(e)}
						/>
						<label for="light-2-intensity">{light2intensity}</label>
					</div>
				</div>
				<div class="sub-sub-card">
					<div class="sub-sub-card-content">
						<div class="sub-sub-card-property-title">색</div>
						<input
							class="colorPicker"
							type="color"
							id="light-2-color"
							name="light-2-color"
							value={`#` + `${light2color}`}
							on:input={(e) => handleColorChange(e)}
						/>
						<div class="colorInputGroup">
							#{light2color}
						</div>
					</div>
				</div>
<div class="margin-block"></div>
				<!-- 백라이트 설정 -->
				<div class="sub-sub-card-title">3. 백 라이트(Back-light)</div>
				<div class="sub-sub-card">
					<div class="sub-sub-card-content">
						<div class="sub-sub-card-property-title">전원</div>

						<label class="switch">
							<input
								type="checkbox"
								id="light-3-switch"
								checked={light3status}
								on:input={(e) => handleSubLightStatus(e)}
							/>
							<span class="toggle-slider round"></span>
						</label>
					</div>
				</div>
				<div class="sub-sub-card">
					<div class="sub-sub-card-content">
						<div class="sub-sub-card-property-title">강도</div>
						<input
							id="light-3-intensity"
							name="light-3-intensity"
							class="slider"
							type="range"
							min="0"
							max="2"
							value={light3intensity}
							step="0.01"
							on:input={(e) => handleSubLightIntensity(e)}
						/>
						<label for="light-3-intensity">{light3intensity}</label>
					</div>
				</div>
				<div class="sub-sub-card">
					<div class="sub-sub-card-content">
						<div class="sub-sub-card-property-title">색</div>
						<input
							class="colorPicker"
							type="color"
							id="light-3-color"
							name="light-3-color"
							value={`#` + `${light3color}`}
							on:input={(e) => handleColorChange(e)}
						/>
						<div class="colorInputGroup">
							#{light3color}
						</div>
					</div>
				</div>
				<div class="margin-block-L"></div>
			
			</div>

					<!-- 전체 설정 -->
			<div id="system" class="setting-detail system-detail">
				<div class="sub-title">
					<h5>앱 설정을 변경합니다.</h5>
				</div>
				<div class="sub-sub-card">
					<div class="sub-sub-card-content">
					
							<div class="selector-group">
			<label for="basemodel">앱 언어 선택</label>
			<select id="basemodel" class="model-input" bind:value={language} required>
				<option value="KOREAN">한글</option>
				<option value="ENGLISH">영어</option>
			</select>
		</div>
				
					</div>
				</div>
				
			</div>
		</div>
	</div>
</section>

<div id="expand-panel-ai" class="expand-panel">
	<ExpandPanel on:applyBackground={handleApplyAIBG} />
</div>
<div id="expand-panel-glb" class="expand-panel">
	<GLBPanel on:selectAsset={handleAssetSelection} />
</div>

<style>
	section {
		position: absolute;
		top: 0;
		left: 0%;
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		overflow: hidden;
		z-index: 999;
		border-right: 1px solid var(--border-color);
		display: flex;
		flex-direction: column;
	}

	.Top-bar {
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		width: 100%;
height: 72px;
padding: 18px ;
		background-color: var(--background-color);
			border-bottom: 1px solid var(--border-color);
gap: 8px;
	}

		.main-title {
		display: flex;
justify-content: space-between;
		align-items: center;
		box-sizing: border-box;
	
		width: 100%;
		
		color: var(--text-color);
		background-color: var(--background-color);
	
	}
			.main-title-sub {
		display: flex;
justify-content: space-between;
		align-items: center;
		box-sizing: border-box;
	
		width: 100%;
		
		color: var(--text-color);
		background-color: var(--background-color);
	
	}
	.main-title h5{
		font-weight: 600;
		font-size: 0.9rem;
	}
			.main-title-sub h5 {
font-weight: 500;
		font-size: 0.7rem;
	}


	.setting-wrapper {
		display: flex;
		flex-direction: row;
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		overflow: auto;
		background-color: var(--onBackground-color);
	
	}

	.switchWrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		box-sizing: border-box;
		width: 25%;
		height: 100%;
			/* border: 1px solid var(--border-color); */
		background-color: var(--onBackground-color);
	}

	.expand-panel {
		position: absolute;
		top: 0;
		left: 0%;
		box-sizing: border-box;
		width: 80%;
		height: 100%;
		background-color: var(--onBackground-color);
		border-right: 1px solid var(--border-color);
		color: var(--text-color);
		z-index: 998;
		transition: left 0.5s ease-in-out;
	}

	.sectionWrapper {
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		width: 100%;
		height: 100%;

		overflow: auto;
		background-color: var(--background-color);
		/* border: 1px solid var(--border-color); */
	}


		.margin-block-S {
		height: 10px;
	}

	.margin-block {
		height: 20px;
	}

		.margin-block-L {
		height: 100px;
	}


	.sub-title {
		box-sizing: border-box;
		width: 100%;
		color: var(--text-color);
		padding: 18px;
	}
	.sub-title h5 {
		font-weight: 600;
		font-size: 0.9rem;
	}

	.sub-title-lv1 {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		box-sizing: border-box;
		width: 100%;
		color: var(--text-color);
		background-color: var(--background-color);
		padding: 8px;
	}
	.sub-title-lv1 p {
		font-size: 0.8rem;
		color: var(--text-color);
	}

	.sub-card {
		display: flex;
		justify-content: flex-start;
		align-items: center;
		flex-direction: column;
		color: var(--text-color);
		box-sizing: border-box;
		width: 100%;

		background-color: var(--background-color);
	
	}

	.sub-card p {
		font-size: 1em;
		margin: 4px;
		line-height: 1.5em;
	}

	.sub-propertiy-title {
		font-size: 1rem;
		color: var(--text-color);
		margin-right: 10px;
	}

	.sub-sub-card {
		box-sizing: border-box;
		margin-bottom: 14px;
		background-color: var(--background-color);
		width: 100%;
		margin: 8px auto;
		display: flex;
		justify-content: center;
		align-items: center;

		padding: 0 18px;
	}

	.sub-sub-card-title {
	
		box-sizing: border-box;
		display: flex;
		align-items: center;
		width: 100%;
		height: 36px;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-color);
		padding: 0 18px;
	}

	.sub-sub-card-content {
		background-color: var(--onSurface-color);
		box-sizing: border-box;
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		font-weight: 500;
		font-size: 0.8rem;
		color: var(--text-color);
		height: 36px;
		padding: 4px;
		border-radius: 6px;
	}

	.sub-sub-card-property-title {
		margin-right: 10px;
		margin-left: 10px;
	}

	.sub-sub-card-content .slider {
		appearance: none;
		background: var(--secondary-color);
		outline: none;
		border-radius: 12px;

		width: 100px;
		height: 8px;
	}
	.sub-sub-card-content .slider::-webkit-slider-thumb {
		appearance: none;
		width: 10px;
		height: 18px;
		border-radius: 6px;
		background: var(--handle-color);
			
		cursor: pointer;
		box-shadow: 0px 0px 2px 0px var(--secondary-color);
	}

	.sub-sub-card-content .colorPicker {
		font-size: 0.9rem;
		color: var(--text-color);
    appearance: none;
		max-width: 100px;
		border: none;
		flex-grow: 1;
		margin: 0;
		padding: 0;
		background: none;
		cursor: pointer;
		outline: none;
	
	}

	.sub-sub-card-content .colorInputGroup {
		display: flex;
		align-items: center;
		margin-right: 20px;
	}

	.sub-sub-card-content label {
		margin-left: 10px;
		margin-right: 10px;
	}

	.selector-group {
		display: flex;
		flex-direction: column;

		width: 100%;
	}

	button {
		box-sizing: border-box;
		width: 80%;
		height: 42px;
		margin: 15px 0 15px 0;
	font-weight: 500;
		background-color: var(--block-color);
		color: var(--text-color);
		border: none;
		font-family:
		'Pretendard Variable',
		Pretendard,
		-apple-system,
		BlinkMacSystemFont,
		system-ui,
		Roboto,
		'Helvetica Neue',
		'Segoe UI',
		'Apple SD Gothic Neo',
		'Noto Sans KR',
		'Malgun Gothic',
		'Apple Color Emoji',
		'Segoe UI Emoji',
		'Segoe UI Symbol',
		sans-serif;
	}

	button:hover {
		background-color: var(--secondary-color);
		cursor: pointer;
		border: none;
		color: var(--onSurface-color)
	}

	.btn {
		box-sizing: border-box;
		width: 80%;
		height: 42px;
		margin: 0;
		border-radius: 8px;
		background-color: var(--block-color);
		color: var(--text-color);
		border: none;
		font-family:
		'Pretendard Variable',
		Pretendard,
		-apple-system,
		BlinkMacSystemFont,
		system-ui,
		Roboto,
		'Helvetica Neue',
		'Segoe UI',
		'Apple SD Gothic Neo',
		'Noto Sans KR',
		'Malgun Gothic',
		'Apple Color Emoji',
		'Segoe UI Emoji',
		'Segoe UI Symbol',
		sans-serif;
		font-size: 0.8rem;
		font-weight: 500;
	}

	.button-list {
		margin: 15px 0 15px 0;
		display: flex;
		flex-direction: column;

		align-items: center;
		width: 100%;
		gap: 8px;
	}

	div :global(.button-icon) {
		font-size: 1.2rem;
	}

	.btn-icon-group {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 4px;
	}


	.switch {
		position: relative;
		display: inline-block;
		width: 36px;
		height: 20px;
	}

	/* Hide default HTML checkbox */
	.switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}
	/* The slider */
	.toggle-slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: var(--secondary-color);
		-webkit-transition: 0.4s;
		transition: 0.4s;
		width: 36px;
	}

	.toggle-slider:before {
		position: absolute;
		content: '';
		height: 12px;
		width: 12px;
		left: 4px;
		bottom: 4px;
		background-color: var(--handle-color);
	
		-webkit-transition: 0.4s;
		transition: 0.4s;
	}

	input:checked + .toggle-slider {
		background-color: var(--accent-color);
	}

	input:focus + .toggle-slider {
		box-shadow: 0 0 1px var(--secondary-color);
	}

	input:checked + .toggle-slider:before {
		-webkit-transform: translateX(17px);
		-ms-transform: translateX(17px);
		transform: translateX(17px);
	}

	/* Rounded sliders */
	.toggle-slider.round {
		border-radius: 34px;
	}

	.toggle-slider.round:before {
		border-radius: 50%;
	}

	/* Hide default HTML checkbox */

	.setting-btn {
		box-sizing: border-box;
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;

		width: 100%;
		height: 120px;
		padding: 4px;
		gap: 10px;
	
		cursor: pointer;
	}

	.setting-btn:hover {
		background-color: var(--surface-color) !important;
	}

	.setting-title {
		width: 100%;
		font-size: 0.9rem;
		text-align: center;
		color: var(--text-color);
		pointer-events: none;
	}

	div :global(.setting-icon) {
		box-sizing: border-box;
		width: 60%;
		height: auto;
		pointer-events: none;
		color: var(--text-color);
	}

	#product-setting {
		background-color: var(--background-color);
	}

	#product {
		display: block;
		
	}
	#bg {
		display: none;
	}
	#camera {
		display: none;
	}
	#shadow {
		display: none;
	}
	#light {
		display: none;
	}

	#system{
		display: none;
	}
</style>
