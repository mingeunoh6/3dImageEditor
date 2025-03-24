// api/flux/+server.js

import { json, error } from '@sveltejs/kit';

export async function POST({ request }) {
	try {
		const { input } = await request.json();
		const fluxAPIKEY = process.env.VITE_FLUX_API_KEY;

		console.log('받은 입력:', input);

		if (!fluxAPIKEY) {
			return json({ error: { msg: 'NO FLUX API KEY!' } }, { status: 500 });
		}

		// 사용할 모델 및 API 엔드포인트
		const modelUrl = 'https://api.us1.bfl.ai/v1/flux-pro-1.1-ultra';

		// FLUX API에 요청 보내기
		const startResponse = await fetch(modelUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Key': fluxAPIKEY // 올바른 헤더 형식: X-Key
			},
			// 요청 본문에 input 객체를 직접 전달
			body: JSON.stringify(input)
		});

		// 응답 로깅
		console.log('FLUX API 응답 상태:', startResponse.status, startResponse.statusText);

		if (!startResponse.ok) {
			// 오류 응답 텍스트 가져오기
			const errorText = await startResponse.text();
			console.error('FLUX API 오류 응답:', errorText);

			try {
				const errorJson = JSON.parse(errorText);
				return json(
					{
						error: {
							msg:
								errorJson.detail?.[0]?.msg ||
								errorJson.message ||
								errorJson.detail ||
								'Fail to request generating model'
						}
					},
					{ status: startResponse.status }
				);
			} catch (e) {
				// JSON으로 파싱할 수 없는 경우
				return json(
					{
						error: {
							msg: `API error: ${startResponse.statusText}`
						}
					},
					{ status: startResponse.status }
				);
			}
		}

		// 성공 응답 처리
		const jsonStartResponse = await startResponse.json();
		console.log('FLUX API 성공 응답:', jsonStartResponse);

		// 클라이언트에 응답 반환
		return json(jsonStartResponse);
	} catch (error) {
		console.error('서버 처리 오류:', error);
		return json(
			{
				error: {
					msg: error.message || 'Internal server error'
				}
			},
			{ status: 500 }
		);
	}
}

export async function GET({ url, fetch }) {
	try {
		// Check if this is an image proxy request
		const imageUrl = url.searchParams.get('url');

		if (imageUrl) {
			// Use your existing image proxy code
			const response = await fetch(imageUrl);

			if (!response.ok) {
				return new Response(`Failed to fetch image: ${response.statusText}`, {
					status: response.status
				});
			}

			const imageData = await response.arrayBuffer();
			const contentType = response.headers.get('content-type') || 'image/png';

			return new Response(imageData, {
				headers: {
					'Content-Type': contentType,
					'Cache-Control': 'public, max-age=3600'
				}
			});
		}

		// Check if this is a polling request
		const id = url.searchParams.get('id');

		if (id) {
			const fluxAPIKEY = process.env.VITE_FLUX_API_KEY;

			// Make the request to the polling URL
			const response = await fetch(`https://api.us1.bfl.ai/v1/get_result?id=${id}`, {
				method: 'GET',
				headers: {
					'X-Key': fluxAPIKEY
				}
			});

			if (!response.ok) {
				return new Response(`Polling failed: ${response.statusText}`, {
					status: response.status
				});
			}

			const data = await response.json();
			return json(data);
		}

		return new Response('Missing required parameters', { status: 400 });
	} catch (err) {
		console.error('API proxy error:', err);
		return new Response(`Proxy error: ${err.message}`, { status: 500 });
	}
}