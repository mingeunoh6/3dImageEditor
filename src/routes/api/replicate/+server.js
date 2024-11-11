import { json } from '@sveltejs/kit';

export async function POST({ request }) {
	try {
		const { input } = await request.json();
		const replicateAPIKEY = input.token;
console.log(input);
		if (!replicateAPIKEY) {
			throw new Error('Replicate API key is not configured');
		}

		let modelUrl = 'https://api.replicate.com/v1/predictions';
		let body;

		//control image 없으면 기본 flux 1.1 pro로 진행
		//있으면 control image로 진행
		if(input.base_model ==="FLUX"){
		if (input.control_image === null) {
			console.log('control image is null');
			modelUrl =
				'https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro-ultra/predictions';
			body = JSON.stringify({
				input: {
					raw: true,
					prompt: input.prompt,
					aspect_ratio: input.aspect_ratio,
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
		}}else if(input.base_model ==="STABLE DIFFUSION"){
			if (input.control_image === null) {
				console.log('control image is null, sd3-medium');
				modelUrl =
					'https://api.replicate.com/v1/models/stability-ai/stable-diffusion-3/predictions';
				body = JSON.stringify({
					input: {
						cfg: 3.5,
						steps: 28,
						prompt: input.prompt,
						aspect_ratio: input.aspect_ratio,
						output_format: 'png',
						output_quality: 100,
						negative_prompt: input.negative_prompt,
						prompt_strength: 0.85
					}
				});
			} else {
				console.log('control image here, sdxl');
				modelUrl = 'https://api.replicate.com/v1/predictions';
				body = JSON.stringify({
					version: '3bb13fe1c33c35987b33792b01b71ed6529d03f165d1c2416375859f09ca9fef',
					input: {
					
						image: input.control_image,
						prompt: input.prompt,
						refine: 'base_image_refiner',
						img2img: false,
						strength: 0.55,
						scheduler: 'KarrasDPM',
						lora_scale: 0.95,
						num_outputs: 1,
						lora_weights:
							'https://pbxt.replicate.delivery/mwN3AFyYZyouOB03Uhw8ubKW9rpqMgdtL9zYV9GF2WGDiwbE/trained_model.tar',
						refine_steps: 20,
						guidance_scale: 7.5,
						apply_watermark: false,
						condition_scale: input.control_strength,
						negative_prompt: input.negative_prompt,
						num_inference_steps: 40
					}
				});
			}
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
