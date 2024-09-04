<script>
	import { onMount, createEventDispatcher } from 'svelte';

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

	const dispatch = createEventDispatcher();
	function handleGLBImport(event) {
		const file = event.target.files[0];
		if (file) {
			dispatch('importGLB', { file });
		}
	}
	function handleBGImport(event) {
		isBackground = true;
		const file = event.target.files[0];
		if (file) {
			dispatch('importBG', { file });
		}
	}

	function handleAssetSelection(assetName) {
		dispatch('selectAsset', { assetName });
	}

	function handleCameraFov(e) {
		fov = e.target.value;
		dispatch('changeFov', { fov });
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
				light3intensity = value;
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
			light3status = checked;
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

	onMount(() => {
		console.log('Hello LNB component');
	});
</script>

<section>
	<div class="sectionWrapper">
		<div class="main-title">
			<h5>3D Web Studio Beta v.0.4.2</h5>
		</div>
		<div class="sub-card">
			<div class="sub-title-lv1">
				<p>by 오민근 | OTR | HSAD</p>
				<p>mg.oh@hsad.co.kr</p>
				<p>last update: 2024-09-04</p>
			</div>
		</div>

		<div class="sub-title">
			<h5>제품 GLB 업로드</h5>
		</div>
		<div class="sub-card">
			<input
				type="file"
				id="glb-import"
				accept=".glb,.gltf"
				style="display: none;"
				on:change={handleGLBImport}
			/>
			<button on:click={() => document.getElementById('glb-import').click()}>GLB 불러오기</button>
		</div>
		<div class="sub-title">
			<h5>배경 이미지 업로드</h5>
		</div>
		<div class="sub-card">
			<input
				type="file"
				id="bg-import"
				accept=".png,.jpg,.jpeg, .webp"
				style="display: none;"
				on:change={handleBGImport}
			/>
			<button on:click={() => document.getElementById('bg-import').click()}>배경 불러오기</button>

			<!-- <div>
				<label for="envMapIntensity">환경맵 강도: {envMapIntensity}</label>

				<input
					type="range"
					id="envMapIntensity"
					name="envMapIntensity"
					min="0"
					max="10"
					step="0.1"
					value="10"
					on:input={(e) => handleEnvMapIntensity(e)}
				/>
			</div> -->
		</div>
		<div class="sub-title">
			<h5>카메라 FOV 변경</h5>
		</div>
		<div class="sub-card-slider">
			<label for="fov">{fov}°</label>
			<input
				type="range"
				id="fov"
				name="fov"
				min="1"
				max="179"
				value="10"
				on:input={(e) => handleCameraFov(e)}
			/>
		</div>

		<div class="sub-title">
			<h5>3점 스튜디오 조명 설정</h5>
		</div>
		<div class="sub-sub-card">
			<div class="sub-sub-card-title">전체 설정</div>
			<div class="sub-sub-card-content">
				<div class="sub-sub-card-property-title">스튜디오 회전</div>

				<input
					class="slider"
					type="range"
					id="sub-light-rot"
					name="sub-light-rot"
					min="0"
					max="360"
					value="0"
					step=".001"
					on:input={(e) => handleSubLightRot(e)}
				/>
				<label for="sub-light-rot">{subLightRot}°</label>
			</div>
		</div>
		<div class="sub-sub-card">
			<div class="sub-sub-card-title">간접광(Ambient-light)</div>
			<div class="sub-sub-card-content">
				<div class="sub-sub-card-property-title">전원</div>

				<label class="switch">
					<input
						type="checkbox"
						id="light-0-switch"
						checked={light1status}
						on:input={(e) => handleSubLightStatus(e)}
					/>
					<span class="toggle-slider round"></span>
				</label>
			</div>
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
			<div class="sub-sub-card-content">
				<div class="sub-sub-card-property-title">색</div>
				<input
					class="colorPicker"
					type="color"
					id="light-0-color"
					name="light-0-color"
					value={`#` + `${light1color}`}
					on:input={(e) => handleColorChange(e)}
				/>
				<div class="colorInputGroup">
					#{light0color}
				</div>
			</div>
		</div>
		<div class="sub-sub-card">
			<div class="sub-sub-card-title">1. 키 라이트(Key-light)</div>
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

		<div class="sub-sub-card">
			<div class="sub-sub-card-title">2. 필 라이트(Fill-light)</div>
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
		<div class="sub-sub-card">
			<div class="sub-sub-card-title">3. 백 라이트(Back-light)</div>
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

		<div class="sub-title">
			<h5>3D 제품 모델 목록</h5>
		</div>
		<div class="sub-card">
			<ul class="product-asset-list">
				<li>
					<div class="asset-item">
						<p>식기세척기</p>
						<button on:click={() => handleAssetSelection('dishwasher_Web_10_1024_png.glb')}
							>사용하기</button
						>
					</div>
				</li>
				<li>
					<div class="asset-item">
						<p>벽걸이 에어컨</p>
						<button on:click={() => handleAssetSelection('rac_s1_Web_6_1024_png.glb')}
							>사용하기</button
						>
					</div>
				</li>
				<li>
					<div class="asset-item">
						<p>로봇클리너</p>
						<button on:click={() => handleAssetSelection('robotcleaner_Web_20_1024_png_rS1.glb')}
							>사용하기</button
						>
					</div>
				</li>
				<li>
					<div class="asset-item">
						<p>스타일러</p>
						<button on:click={() => handleAssetSelection('styler_Web_10_1024_png.glb')}
							>사용하기</button
						>
					</div>
				</li>
				<li>
					<div class="asset-item">
						<p>얼음정수기 냉장고</p>
						<button
							on:click={() => handleAssetSelection('SXS_VS_GSLV70MCT_00101_Web_10_1024_png.glb')}
							>사용하기</button
						>
					</div>
				</li>
				<li>
					<div class="asset-item">
						<p>진공청소기</p>
						<button on:click={() => handleAssetSelection('vacuumcleaner_Web_10_1024_png.glb')}
							>사용하기</button
						>
					</div>
				</li>

				<li>
					<div class="asset-item">
						<p>프라엘 더마세라 BLQ1</p>
						<button on:click={() => handleAssetSelection('BLQ1_LOW_REFLECTIVE.glb')}
							>사용하기</button
						>
					</div>
				</li>
				<li>
					<div class="asset-item">
						<p>2018-벤츠-AMG G65 블랙</p>
						<button on:click={() => handleAssetSelection('2018_mercedes-amg_g65_final_edition.glb')}
							>사용하기</button
						>
					</div>
				</li>
			</ul>
		</div>
		<div class="sub-title">
			<h5>사용법</h5>
		</div>
		<div class="sub-card-instruction">
			<p>
				1. 테스트 어셋 중에 선택하거나 GLB 불러오기 버튼을 클릭해 파일을 불러옵니다.<br />
				<span style="color: red;"
					>파일이 50MB 이상으로 너무 크면 불러오는데 오래걸려요, 기다려주세요</span
				><br /><br />
				<span style="color: red;">
					업로드 및 다운로드한 데이터는 별도로 외부로 전송되거나 저장되지 않습니다. <br /><br
					/></span
				>

				2. 불러온 GLB 파일은 중앙의 뷰포트에 표시됩니다.<br /><br />

				3. 뷰포트에서 마우스 왼쪽 드래그로 회전, 오른족 드래그로 이동이 가능합니다. 마우스 휠로
				확대/축소 하세요.<br /><br />

				4. 원하는 각도, 조명을 조정한 뒤 뷰포트 아래의 제품 이미지 다운로드 버튼을 클릭하세요.<br
				/><br />

				5. 다운로드 받은 이미지들을 AI 및 포토샵 보정을 위한 인풋으로 사용하세요.<br /><br />
			</p>
		</div>
	</div>
</section>

<style>
	section {
		box-sizing: border-box;
		width: 100%; /* 30% of the smaller viewport dimension */
		height: 100%;
		overflow: hidden;
		background-color: var(--background-color);
	}
	.sectionWrapper {
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		padding: 10px;
		overflow: auto;
	}

	.main-title {
		display: flex;
		justify-content: center;
		align-items: center;
		box-sizing: border-box;
		padding: 30px 0 30px 0;
		width: 100%;
		height: 20%;
		color: var(--text-color);
		background-color: var(--primary-color);
	}

	.sub-title {
		display: flex;
		justify-content: center;
		align-items: center;
		box-sizing: border-box;
		width: 100%;

		color: var(--text-color);
		background-color: var(--primary-color);
		padding: 18px 0 18px 0;
	}
	.sub-title h5 {
		font-size: 1rem;
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
	}

	.sub-sub-card-title {
		background-color: var(--background-color);
		box-sizing: border-box;
		display: flex;
		align-items: center;
		width: 100%;
		height: 48px;
		font-size: 1rem;
		color: var(--text-color);
		margin-right: 10px;

		padding: 8px;
	}

	.sub-sub-card-content {
		background-color: var(--secondary-color);
		box-sizing: border-box;
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;

		padding-left: 20px;
		padding-top: 10px;
		padding-bottom: 10px;
		margin-bottom: 2px;
	}

	.sub-sub-card-property-title {
		font-size: 1rem;
		color: var(--text-color);
		margin-right: 10px;
	}

	.sub-sub-card-content .slider {
		font-size: 1rem;
		color: var(--text-color);
		flex-grow: 1;
		min-width: 100px;
		max-width: 160px;
	}
	.sub-sub-card-content .colorPicker {
		font-size: 1rem;
		color: var(--text-color);

		max-width: 120px;
		border: none;
		flex-grow: 1;
		margin: 0;
		padding: 0;
		background: none;
		cursor: pointer;
	}

	.sub-sub-card-content .colorInputGroup {
		font-size: 1rem;
		display: flex;
		align-items: center;
		margin-right: 20px;
		color: var(--text-color);
	}

	.sub-sub-card-content label {
		font-size: 1rem;
		color: var(--text-color);
		margin-left: 10px;
		margin-right: 20px;
	}

	button {
		box-sizing: border-box;
		width: 80%;
		height: 42px;
		margin: 30px;

		background-color: var(--border-color);
		color: var(--text-color);
		border: none;
	}

	button:hover {
		background-color: var(--secondary-color);
		cursor: pointer;
		border: none;
	}

	.product-asset-list {
		width: 100%;
	}

	.asset-item {
		box-sizing: border-box;
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		height: 64px;
		padding: 10px;
		margin-bottom: 2px;
		background-color: var(--secondary-color);
	}

	.asset-item p {
		font-size: 0.9rem;
		color: var(--text-color);
	}

	.asset-item button {
		box-sizing: border-box;
		width: 30%;
		height: 42px;
		margin: 0;
		background-color: var(--border-color);
		color: var(--text-color);
		border: none;
	}
	.asset-item button:hover {
		background-color: var(--accent-color);
		cursor: pointer;
		border: none;
	}
	ul {
		list-style-type: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		width: 100%;
	}
	li {
		padding: 0;
		margin: 0;
	}

	.sub-card-instruction {
		display: flex;
		justify-content: flex-start;
		align-items: center;
		flex-direction: column;
		color: var(--text-color);
		box-sizing: border-box;
		width: 100%;
		padding: 16px;
		background-color: var(--background-color);
	}

	.sub-card-instruction p {
		font-size: 1.2em;
		margin-bottom: 10px;
		line-height: 1.5em;
	}

	.sub-card-slider {
		display: flex;
		justify-content: center;
		align-items: center;
		flex-direction: row-reverse;
		color: var(--text-color);
		box-sizing: border-box;
		width: 100%;

		padding-top: 20px;
		padding-bottom: 20px;
		background-color: var(--background-color);
	}
	.sub-card-slider label {
		font-size: 1.2em;
		margin-left: 20px;
		line-height: 1.5em;
	}

	.switch {
		position: relative;
		display: inline-block;
		width: 42px;
		height: 24px;
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
		background-color: #ccc;
		-webkit-transition: 0.4s;
		transition: 0.4s;
	}

	.toggle-slider:before {
		position: absolute;
		content: '';
		height: 16px;
		width: 16px;
		left: 4px;
		bottom: 4px;
		background-color: white;
		-webkit-transition: 0.4s;
		transition: 0.4s;
	}

	input:checked + .toggle-slider {
		background-color: #2196f3;
	}

	input:focus + .toggle-slider {
		box-shadow: 0 0 1px #2196f3;
	}

	input:checked + .toggle-slider:before {
		-webkit-transform: translateX(19px);
		-ms-transform: translateX(19px);
		transform: translateX(19px);
	}

	/* Rounded sliders */
	.toggle-slider.round {
		border-radius: 34px;
	}

	.toggle-slider.round:before {
		border-radius: 50%;
	}
</style>
