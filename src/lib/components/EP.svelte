<script>
	import { onMount, createEventDispatcher } from 'svelte';
	import Icon from '@iconify/svelte';

	const dispatch = createEventDispatcher();

	let loading = false;
	let error = null;
	let result = null;
	let controlImage = null;
	let isBackground = false;

	let formData = {
		base_model: 'FLUX',
		token: '',
		prompt: '',
		control_image: null,
		guidance_scale: 2.5,
		output_quality: 100,
		negative_prompt: 'unreal, fantasy, dreamlike, abstract, blurry, monitor',
		control_strength: 0.45,
		aspect_ratio: '1:1'
	};

	// Convert file to base64
	function fileToBase64(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result);
			reader.onerror = (error) => reject(error);
			reader.readAsDataURL(file);
		});
	}

	// Handle file selection
	async function handleImageSelect(event) {
		const file = event.target.files[0];
		if (file) {
			if (file.type.startsWith('image/')) {
				try {
					// Create preview
					controlImage = URL.createObjectURL(file);
					// Convert to base64
					const base64String = await fileToBase64(file);
					formData.control_image = base64String;
				} catch (err) {
					error = 'Error processing image file';
					console.error(err);
				}
			} else {
				error = 'Please select an image file';
				event.target.value = ''; // Reset input
			}
		}
	}

	function handleBGImport() {
		if (result) {
			dispatch('applyBackground', { imageUrl: result });
		}
	}

	async function handleSubmit() {
		loading = true;
		error = null;

		try {
			const response = await fetch('api/replicate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ input: formData })
			});

			const data = await response.json();

			if (response.ok) {
				result = data.output;
			} else {
				if (data.error === 'Failed to start prediction: Unauthorized') {
					error = 'API-KEY가 올바르지 않습니다.';
				} else {
					error = data.error || 'Failed to generate image';
				}
			}
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}
</script>

<section class="expandWrapper">
	<!-- <div class="main-title">
		<h5>AI 배경 생성</h5>
	</div> -->
	<div class="sub-title">
		<h5>AI로 배경 이미지를 생성해보세요.</h5>
			<div class="model-info">
		<h5>현재 모델</h5>
		{#if formData.base_model === 'FLUX' && controlImage}
			<h5>FLUX.1 DEV ControlNet</h5>
		{:else if formData.base_model === 'FLUX' && !controlImage}
			<h5>FLUX 1.1 PRO-ULTRA</h5>
		{:else if formData.base_model === 'STABLE DIFFUSION' && controlImage}
			<h5>SDXL-Controlnet-Lora</h5>
		{:else if formData.base_model === 'STABLE DIFFUSION' && !controlImage}
			<h5>STABLE DIFFUSION 3 Medium</h5>
		{/if}
		</div>
	</div>

	<div class="result-group">
		<!-- Result Display -->
		 {#if loading}
			<div class="loading-container">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="50" height="50">
  <!-- Outer circle gradient -->
  <defs>
    <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff5c5c"/>
      <stop offset="100%" stop-color="#ff7474"/>
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle 
    cx="25" 
    cy="25" 
    r="20" 
    stroke="#DDDDDD" 
    stroke-width="4" 
    fill="none"
  />
  
  <!-- Animated spinner arc -->
  <circle 
    cx="25" 
    cy="25" 
    r="20"
    stroke="url(#spinner-gradient)"
    stroke-width="4"
    fill="none"
    stroke-linecap="round"
    stroke-dasharray="94.2477796076938"
    stroke-dashoffset="47.123889803847"
  >
    <animateTransform
      attributeName="transform"
      type="rotate"
      dur="1s"
      values="0 25 25;360 25 25"
      repeatCount="indefinite"
      additive="sum"
    />
    <animate
      attributeName="stroke-dashoffset"
      values="94.2477796076938;0"
      dur="1s"
      repeatCount="indefinite"
    />
  </circle>
</svg>
			</div>
		
		{:else if result}
			<div class="result">
				<img src={result} alt="Generated image" />
				<button id="applyBG" class="btn btn-sub" on:click={handleBGImport}
					><div class="btn-icon-group">
						<Icon icon="mingcute:ai-fill" class="button-icon" />배경 적용하기
					</div></button
				>
			</div>
		{/if}
	</div>
	<div class="sub-card">
		<div class="selector-group">
			<label for="basemodel">베이스 모델 선택</label>
			<select id="basemodel" class="model-input" bind:value={formData.base_model} required>
				<option value="FLUX">FLUX</option>
				<option value="STABLE DIFFUSION">STABLE DIFFUSION</option>
			</select>
		</div>
	</div>
	<form on:submit|preventDefault={handleSubmit}>
		<!-- <div class="sub-title">
			<h5>프롬프트</h5>
		</div> -->
		<div class="sub-card">
			<label for="prompt">프롬프트</label>
			<textarea
				id="pos-prompt"
				class="prompt-input"
				bind:value={formData.prompt}
				placeholder="프롬프트를 입력하세요."
				required
			/>
		</div>
		<!-- Image Upload -->
		<div class="sub-card">
			<label for="control_image">구조 참조 이미지</label>
			<div class="upload-container">
				<input
					type="file"
					id="control_image"
					accept="image/*"
					on:change={handleImageSelect}
					class="file-input"
				/>
				<label for="control_image" class="btn"><div class="btn-icon-group">불러오기</div></label>
			</div>

			<!-- Image Preview -->
			{#if controlImage}
				<div class="range-container">
					<label for="control_strength">참조 강도</label>
					<input
						class="slider"
						type="range"
						id="control_strength"
						bind:value={formData.control_strength}
						min="0"
						max="1"
						step="0.05"
					/>
					<div class="range-result">
						{formData.control_strength}
					</div>
				</div>
				<div class="image-preview">
					<img src={controlImage} alt="Selected control image" />
				</div>
				<div class="range-result">
					<div
						class="delete-control-image-btn"
						on:click={() => {
							console.log('delete');
							controlImage = null;
							formData.control_image = null;
						}}
					>
						<Icon icon="material-symbols:delete-outline" class="button-icon" />
					</div>
				</div>
			{/if}
		</div>

		{#if !controlImage}
			<div class="sub-card">
				<div class="selector-group">
					<label for="basemodel">이미지 비율 선택</label>
					<select id="basemodel" class="model-input" bind:value={formData.aspect_ratio} required>
						<option value="1:1">1:1</option>
						<option value="16:9">16:9</option>
						<option value="2:3">2:3</option>
						<option value="3:2">3:2</option>
						<option value="4:5">4:5</option>
						<option value="5:4">5:4</option>
						<option value="9:16">9:16</option>
						<option value="3:4">3:4</option>
						<option value="4:3">4:3</option>
					</select>
				</div>
			</div>
		{/if}

		<div class="sub-card">
			<label for="prompt">API-KEY</label>
			<input
				type="text"
				id="api-key"
				class="api-key"
				bind:value={formData.token}
				placeholder="Replicate api key."
				required
			/>

			<a href="https://replicate.com/account/api-tokens" target="_blank">
				<div class="desc">
					<p>Replicate 에서 내 API 확인하기</p>
					<Icon icon="majesticons:open" class="desc-icon" />
				</div>
			</a>
		</div>
		<div class="sub-card">
			<button class="btn btn-primary" type="submit" disabled={loading}>
				<div class="btn-icon-group">
					<Icon icon="mingcute:ai-fill" class="button-icon" />
					{loading ? '배경 생성중...' : '배경 생성하기'}
				</div>
			</button>
			{#if error}
				<div class="sub-card error">
					{error}
				</div>
			{/if}
		</div>
	</form>
</section>

<style>
	.expandWrapper {
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
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		padding: 10px;
		overflow: auto;
		background-color: var(--background-color);
	}

	.result-group {
			box-sizing: border-box;
		display: flex;
		flex-direction: left;
		justify-content: center;
		align-items: center;
		width: 100%;
		
		padding: 10px;
	}

	.result {
		display: flex;
		flex-direction: column;
		justify-content: left;
		align-items: center;
		width: 100%;
		height: 100%;

	}

	.result img {
		box-sizing: border-box;
		max-width: 100%;
		max-height: 100%;
		border-radius: 8px;
		border: 1px solid var(--border-color);
	}

	.loading-container {
  width: 100%;
  position: relative;
  padding-top: 100%; /* Creates a square container */
}

.loading-container svg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 20%;
  height: 20%;
}

	label {
		font-size: 0.85rem;
		color: var(--text-color);
		margin-bottom: 8px;
		font-weight: 600;
	}

	.sub-card {
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		width: 100%;

		padding: 10px;

	}
	.sub-title {
		display: flex;
		justify-content: flex-start;
		flex-direction: column;
		box-sizing: border-box;
		width: 100%;

		color: var(--text-color);
	
		padding: 10px;
		gap: 8px;
	}

	.sub-title h5 {
		font-size: 1rem;
	}

		.model-info {
		display: flex;
		justify-content: flex-start;
		flex-direction: row;
		box-sizing: border-box;
		width: 100%;

	
		
		gap: 8px;
	}
	
	.model-info h5{
		font-weight: 500;
font-size: 0.8rem;
		color: var(--text-color);
	}


	.prompt-input {
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
		width: 100%;
		height: 130px;
		box-sizing: border-box;
		padding: 8px;
		border: 1.5px solid var(--border-color);
border-radius: 8px;
		background-color: var(--background-color);
		color: var(--text-color);
		font-size: 1rem;
		resize: none;
	}

	.api-key {
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
		width: 100%;

		box-sizing: border-box;
		padding: 8px;
		border: 1px solid var(--border-color);
border-radius: 6px;
		background-color: var(--background-color);
		color: var(--text-color);
		font-size: 0.8rem;
		resize: none;
	}

	.prompt-input:active,
	.prompt-input:focus {
		outline: none;
	}

	.api-key:active,
	.api-key:focus {
		outline: none;
	}

	.btn {
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
		font-size: 0.85rem;
		font-weight: 500;
		width: 100%;
	height: 42px;
		box-sizing: border-box;
		padding: 6px;
		border-radius: 8px;
		border: none;
		background-color: var(--border-color);
		color: var(--text-color);
	

		cursor: pointer;
	}

	.btn:hover {
		background-color: var(--secondary-color);
		cursor: pointer;
		border: none;
		color: var(--onSurface-color)
	}

	.btn:disabled {
		background-color: var(--border-color);
		color: var(--text-color);
		cursor: not-allowed;
	}

	.btn-sub {
		background-color: var(--accent-color);
		color: var(--text-color);
		margin-top: 10px;
		margin-bottom: 10px;
		font-weight: 600;
	}

	.btn-sub:hover {
		background-color: var(--accent-highlight-color);
		color: var(--text-color);
	}



	.btn-icon-group {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 4px;
	}


	.desc {
		box-sizing: border-box;
		display: flex;
		justify-content: flex-end;
		align-items: center;
		padding: 4px;
		color: var(--text-color);
		margin-top: 6px;
	}

	.desc p {
		text-align: right;
		margin-right: 6px;
		font-size: 0.8rem;
	}

	a {
		text-decoration: none;
		color: var(--text-color);
	}

	a:hover {
		text-decoration: underline;
	}

	.error {
				font-size: 0.8rem;
		text-align: center;
		color: var(--highlight-color);
	}

	/* File upload styling */
	.upload-container {
		position: relative;
		display: flex;
	}

	.file-input {
		position: absolute;
		width: 0.1px;
		height: 0.1px;
		opacity: 0;
		overflow: hidden;
		z-index: -1;
	}

	/* Image preview styling */
	.image-preview {
		width: 100%;

		overflow: hidden;
	}

	.image-preview img {
		width: 100%;
		height: auto;
		display: block;
		border: 1px solid var(--border-color);
		border-radius: 8px;
		box-sizing: border-box;
	}

	input[type='range'] {
		width: 200px;
	}

	.range-container {
		width: 100%;
		height: 42px;
		display: flex;
		align-items: center;
		justify-items: space-between;
		flex-direction: row;
		gap: 20px;
	}

	.range-container label {
		margin: 0;
		
	}

	.range-result {
		font-size: 0.9rem;
	}

	.selector-group {
		display: flex;
		flex-direction: column;

		width: 100%;
	}

	.model-input {
		appearance: none;
	  -webkit-appearance: none;
		font-size: 0.9rem;
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

		width: 100%;
		height: 42px;
		box-sizing: border-box;
		padding-left: 10px;
		border: none;
		border-radius: 8px;
		outline: 0;
		background-color: var(--block-color);
		color: var(--text-color);
		font-weight: 600;
		cursor: pointer;
	}




	.delete-control-image-btn {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 42px;
		border: 1px solid var(--border-color);
		border-radius: 8px;
		box-sizing: border-box;
		background-color: var(--highlight-color);
		color: var(--background-color);
		cursor: pointer;
		margin-top: 4px;
	}

	.delete-control-image-btn:hover {
		color: var(--text-color);
	}


	.slider {
		appearance: none;
		background: var(--secondary-color);
		outline: none;
		border-radius: 12px;
		font-size: 0.9rem;
		color: var(--text-color);
		flex-grow: 1;
		min-width: 80px;
		max-width: 120px;
		height: 8px;
	}
	.slider::-webkit-slider-thumb {
		appearance: none;
		width: 10px;
	height: 18px;
	border-radius: 6px;
		background: var(--handle-color);
		cursor: pointer;
				box-shadow: 0px 0px 2px 0px var(--secondary-color);

	}
</style>
