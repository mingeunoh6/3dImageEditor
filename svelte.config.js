import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// EC2 배포를 위한 Node.js adapter 사용
		adapter: adapter({
			// 빌드 출력 디렉토리
			out: 'build',
			// 프리렌더링 설정
			precompress: false,
			// 환경 변수 설정
			envPrefix: ''
		})
	}
};

export default config;
