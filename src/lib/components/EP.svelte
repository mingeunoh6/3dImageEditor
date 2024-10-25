<script>
	import { onMount, createEventDispatcher } from 'svelte';
	import Icon from '@iconify/svelte';
	const dispatch = createEventDispatcher();

	let loading = false;
	let error = null;
	let result = null;
	let imagePreview = null;
	let isBackground = false;

	let formData = {
		token: '',
		prompt: '',
		control_image: null,
		guidance_scale: 2.5,
		output_quality: 100,
		negative_prompt: '',
		control_strength: 0.45
	};

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
		<h5>현재 모델: FLUX 1.1 PRO</h5>
	</div>
	<div class="result-group">
		<!-- Result Display -->
		{#if result}
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
		background-color: var(--primary-color);
	}

	.result-group {
		display: flex;
		flex-direction: left;
		justify-content: center;
		align-items: center;
		width: 100%;
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
		max-width: 100%;
		max-height: 100%;
	}

	label {
		font-size: 1rem;
		color: var(--text-color);
		margin-bottom: 8px;
	}

	.sub-card {
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		width: 100%;

		padding: 10px;
		background-color: var(--primary-color);
	}
	.sub-title {
		display: flex;
		justify-content: flex-start;
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
		padding: 6px;
		border: 1px solid var(--text-color);

		background-color: var(--primary-color);
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
		padding: 6px;
		border: 1px solid var(--text-color);

		background-color: var(--primary-color);
		color: var(--text-color);
		font-size: 1rem;
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
		font-size: 1.2em;
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
		height: 40px;
		box-sizing: border-box;
		padding: 6px;
		border: none;

		background-color: var(--onSurface-color);
		color: var(--background-color);
		font-weight: 600;

		cursor: pointer;
	}

	.btn:hover {
		background-color: var(--accent-color);
		color: var(--text-color);
		cursor: pointer;
		border: none;
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
	}

	.btn-sub:hover {
		background-color: var(--accent-highlight-color);
		color: var(--background-color);
	}

	div :global(.button-icon) {
		font-size: 1.4rem;
	}

	div :global(.desc-icon) {
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
	.btn-icon-group p {
		text-align: center;
		color: var(--text-color);
	}

	.btn-icon-group .icon {
		display: flex;
		justify-content: center;
		align-items: center;
		margin: 0;
		height: 100%;

		margin-right: 10px;
	}

	.desc {
		box-sizing: border-box;
		display: flex;
		justify-content: flex-end;
		align-items: center;
		padding: 4px;
		color: var(--text-color);
		margin-top: 8px;
	}

	.desc p {
		text-align: right;
		margin-right: 8px;
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
		text-align: center;
		color: var(--highlight-color);
	}
</style>
