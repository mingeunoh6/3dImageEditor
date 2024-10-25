import { json } from '@sveltejs/kit';

export async function POST({ request }) {
	try {
		const { input } = await request.json();
		const replicateAPIKEY = input.token;

		if (!replicateAPIKEY) {
			throw new Error('Replicate API key is not configured');
		}

		let modelUrl = 'https://api.replicate.com/v1/predictions';
		let body;

		//control image 없으면 기본 flux 1.1 pro로 진행
		//있으면 control image로 진행
		if (input.control_image === null) {
			console.log('control image is null');
			modelUrl = 'https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions';
			body = JSON.stringify({
				input: {
					prompt: input.prompt,
					aspect_ratio: '1:1',
					output_format: 'png',
					output_quality: 100,
					safety_tolerance: 2,
					prompt_upsampling: true
				}
			});
		} else {
			console.log('control image here');
			modelUrl = 'https://api.replicate.com/v1/predictions';
			body = JSON.stringify({
				version: '9a8db105db745f8b11ad3afe5c8bd892428b2a43ade0b67edc4e0ccd52ff2fda',
				input: input
			});
		}

		// Initial request to start the prediction
		const startResponse = await fetch(modelUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Token ${replicateAPIKEY}`
			},
			body: body
		});

		if (!startResponse.ok) {
			throw new Error(`Failed to start prediction: ${startResponse.statusText}`);
		}

		// if (!startResponse.ok) {
		// 	return json({ error: 'Failed to start prediction' }, { status: 500 });
		// }

		const jsonStartResponse = await startResponse.json();

		// Poll for results
		let outputImage = null;

		while (!outputImage) {
			console.log('Checking prediction status...');

			const finalResponse = await fetch(jsonStartResponse.urls.get, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Token ${replicateAPIKEY}` // Changed from Bearer to Token
				}
			});

			if (!finalResponse.ok) {
				throw new Error(`Failed to get prediction status: ${finalResponse.statusText}`);
			}

			const jsonFinalResponse = await finalResponse.json();

			if (jsonFinalResponse.status === 'succeeded') {
				outputImage = jsonFinalResponse.output;

				break;
			} else if (jsonFinalResponse.status === 'failed') {
				throw new Error('Prediction failed: ' + (jsonFinalResponse.error || 'Unknown error'));
			}

			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		return json({ output: outputImage });
	} catch (error) {
		console.error('Error in Replicate API handler:', error);
		return json({ error: error.message }, { status: 500 });
	}
}
