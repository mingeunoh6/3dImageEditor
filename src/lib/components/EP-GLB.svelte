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
						<p>시네빔</p>
						<button class="btn" on:click={() => handleAssetSelection('CINEBEAM.glb')}
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
						<p>울트라 와이드 모니터</p>
						<button class="btn"  on:click={() => handleAssetSelection('monitor_ultrawide.glb')}>불러오기</button>
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
		background-color: var(--background-color);
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
		align-items: center;
		box-sizing: border-box;
		width: 100%;

		color: var(--text-color);

		padding: 18px 0 18px 0;
	}
	.sub-title h5 {
		font-size: 1rem;
	}

	.product-asset-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	
	
	}

	.asset-item{
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		padding-bottom: 10px;
		padding-top: 10px;
		border-bottom: 1px solid var(--border-color);

		
	}

	.asset-item p {
		font-size: 0.9rem;
		color: var(--text-color);
	}


	.btn {
		font-size: 0.8rem;
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

		width: 30%;
		height: 32px;
		box-sizing: border-box;
		padding: 6px;
		border: none;
border-radius: 6px;
		background-color: var(--block-color);
		color: var(--text-color);
		font-weight: 500;

		cursor: pointer;
	}

	.btn:hover {
		background-color: var(--secondary-color);
		color: var(--border-color);
		cursor: pointer;
		border: none;
	}

	.btn:disabled {
		background-color: var(--border-color);
		color: var(--text-color);
		cursor: not-allowed;
	}

	

	.model-info{
		display: flex;
	flex-direction: column;
	gap: 10px;
	}



</style>
