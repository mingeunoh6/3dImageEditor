<script>
	import { onMount, createEventDispatcher } from 'svelte';
	import Icon from '@iconify/svelte';

	const dispatch = createEventDispatcher();

	let loading = false;
	let error = null;
	let result = null;





	// Handle file selection

	function handleAssetSelection(assetName) {
		dispatch('selectAsset', { assetName });
	}



	
</script>

<section class="expandWrapper">
	<!-- <div class="main-title">
		<h5>AI 배경 생성</h5>
	</div> -->
	<div class="sub-title model-info">
		<h5>제품 모델 라이브러리</h5>
	</div>


	


		<div class="sub-card">
			<ul class="product-asset-list">
				<li>
					<div class="asset-item">
						<p>프라엘 더마세라 BLQ1</p>
						<button class="btn" on:click={() => handleAssetSelection('BLQ1_LOW_REFLECTIVE.glb')}
							>불러오기</button
						>
					</div>
				</li>
				<li>
					<div class="asset-item">
						<p>모니터</p>
						<button class="btn"  on:click={() => handleAssetSelection('LG_Monitor.glb')}>불러오기</button>
					</div>
				</li>

				<li>
					<div class="asset-item">
						<p>스탠바이미-가로</p>
						<button class="btn"  on:click={() => handleAssetSelection('lgStandbyMe_off.glb')}>불러오기</button>
					</div>
				</li>
			
				<li>
					<div class="asset-item">
						<p>스탠바이미-세로</p>
						<button class="btn"  on:click={() => handleAssetSelection('lgStandbyMe_off_portrait.glb')}
							>불러오기</button
						>
					</div>
				</li>
			
			
			</ul>
		</div>
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

	.product-asset-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 10px;
		background-color: var(--primary-color);
	}

	.asset-item{
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		
		border-bottom: 1px solid var(--border-color);

		
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

		width: 20%;
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


	

	.model-info{
		display: flex;
	flex-direction: column;
	gap: 10px;
	}



</style>
