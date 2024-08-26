<script>
	import { onMount, createEventDispatcher } from 'svelte';

	let fov = 10;
	let envMapIntensity = 1;
	let isBackground = false;

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
	function handleEnvMapIntensity(e) {
		envMapIntensity = e.target.value;
		dispatch('changeEnvMapIntensity', { envMapIntensity });
	}

	onMount(() => {
		console.log('Hello LNB component');
	});
</script>

<section>
	<div class="sectionWrapper">
		<div class="main-title">
			<h5>3D Web Studio Prototype</h5>
		</div>
		<div class="sub-title-lv1">
			<p>ver 0.3.0</p>
		</div>
		<div class="sub-title-lv1">
			<p>by MIN GEUN</p>
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
						<button on:click={() => handleAssetSelection('BLQ1_remesh.glb')}>사용하기</button>
					</div>
				</li>
				<li>
					<div class="asset-item">
						<p><span style="color: red;">NEW - </span> 프라엘 더마세라 BLQ1 - 무광</p>
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

				2. 불러온 GLB 파일은 중앙의 뷰포트에 표시됩니다.<br /><br />

				3. 뷰포트에서 마우스 왼쪽 드래그로 회전, 오른족 드래그로 이동이 가능합니다. 마우스 휠로
				확대/축소 하세요.<br /><br />

				4. 원하는 각도로 조정한 뒤 뷰포트 아래의 마스크 다운로드 버튼을 클릭하세요.<br /><br />

				5. 다운로드 받은 이미지들을 ComfyUI의 인풋으로 사용하세요.<br /><br />
				<span style="color: red;">
					!! 새로운 제품을 업로드하려면 새로고침 후 다시 이용해주세요. !!<br /><br />
					업로드 및 다운로드한 파일은 별도로 외부로 전송되거나 저장되지 않습니다. <br /><br /></span
				>
			</p>
		</div>
		<!-- <div class="sub-title">
		<h5>UPLOAD HDRI</h5>
	</div>
	<div class="sub-card">
		<button id="hdr-import-btn">Import HDR</button>
	</div> -->
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

	.sub-title-lv1 {
		display: flex;
		justify-content: center;
		align-items: center;
		box-sizing: border-box;
		width: 100%;
		height: 42px;

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
		padding: 10px;
		background-color: var(--background-color);
	}

	.sub-card p {
		font-size: 1em;
		margin: 4px;
		line-height: 1.5em;
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
		background-color: var(--secondary-color);
	}

	.asset-item {
		box-sizing: border-box;
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		height: 64px;
		padding: 10px;
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
</style>
