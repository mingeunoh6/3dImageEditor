// api/3dgen/+server.js

import { json } from '@sveltejs/kit';
import { Buffer } from 'buffer';

export async function POST({ request }) {
	try {
		// Get form data from client request
		const formData = await request.formData();
		const rodinAPIKEY = process.env.VITE_RODIN_API;

		if (!rodinAPIKEY) {
			console.error('Rodin API key not found in environment variables');
			return json({ error: { msg: 'NO RODIN API KEY!' } }, { status: 500 });
		}

		// Extract the data from formData
		const imageFile = formData.get('images');
		const prompt = formData.get('prompt') || '';
		const condition_mode = formData.get('condition_mode') || 'concat';
		const seed = formData.get('seed') || Math.floor(Math.random() * 1000000).toString();
		const geometry_file_format = formData.get('geometry_file_format') || 'glb';
		const material = formData.get('material') || 'PBR';
		const quality = formData.get('quality') || 'medium';
		const tier = formData.get('tier') || 'Regular';

		if (!imageFile) {
			console.error('No image provided in request');
			return json({ error: { msg: 'No image provided' } }, { status: 400 });
		}

		console.log('Image file received:', imageFile.name || 'unnamed file', 'Size:', imageFile.size);

		// API endpoint for Rodin
		const modelUrl = 'https://hyperhuman.deemos.com/api/v2/rodin';

		// Create a new FormData object for the API request
		const apiFormData = new FormData();

		// Add the image file with the correct field name
		apiFormData.append('images', imageFile);

		// Add the other parameters
		apiFormData.append('prompt', prompt);
		apiFormData.append('condition_mode', condition_mode);
		apiFormData.append('seed', seed);
		apiFormData.append('geometry_file_format', geometry_file_format);
		apiFormData.append('material', material);
		apiFormData.append('quality', quality);
		apiFormData.append('tier', tier);

		console.log('Sending request to Rodin API with parameters:', {
			prompt,
			condition_mode,
			seed,
			geometry_file_format,
			material,
			quality,
			tier
		});

		// Use node-fetch with specific options for multipart/form-data
		const startResponse = await fetch(modelUrl, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${rodinAPIKEY}`
				// Do NOT set Content-Type header - the browser will set it with the correct boundary
			},
			body: apiFormData
		});

		console.log('Rodin API response status:', startResponse.status, startResponse.statusText);

		// Clone the response before reading it to avoid the "Body already read" error
		const responseForError = startResponse.clone();

		// Handle error responses
		if (!startResponse.ok) {
			let errorMessage;

			try {
				const errorData = await responseForError.json();
				console.error('Rodin API error (JSON):', errorData);
				errorMessage = errorData.message || JSON.stringify(errorData);
			} catch (e) {
				try {
					const errorText = await responseForError.text();
					console.error('Rodin API error (text):', errorText);
					errorMessage = errorText;
				} catch (e2) {
					console.error('Could not read error response:', e2);
					errorMessage = startResponse.statusText;
				}
			}

			return json(
				{
					error: {
						msg: `Failed generating 3D model: ${errorMessage}`,
						status: startResponse.status
					}
				},
				{ status: 500 }
			);
		}

		// Parse and return the successful response
		let jsonStartResponse;
		try {
			jsonStartResponse = await startResponse.json();
			console.log('Rodin API success response:', jsonStartResponse);
		} catch (error) {
			console.error('Error parsing API response:', error);
			return json(
				{
					error: {
						msg: 'Error processing API response',
						details: error.message
					}
				},
				{ status: 500 }
			);
		}

		return json(jsonStartResponse);
	} catch (err) {
		console.error('Server processing error:', err);
		return json(
			{
				error: {
					msg: err.message || 'Internal server error'
				}
			},
			{ status: 500 }
		);
	}
}

export async function GET({ url, fetch }) {
	try {
		const rodinAPIKEY = process.env.VITE_RODIN_API;

		if (!rodinAPIKEY) {
			return json({ error: { msg: 'NO RODIN API KEY!' } }, { status: 500 });
		}

		// Check if this is an result proxy request
		const uuid = url.searchParams.get('uuid');

		if (uuid) {
			// Make the request to the download endpoint according to documentation
			const response = await fetch(`https://hyperhuman.deemos.com/api/v2/download`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${rodinAPIKEY}`
				},
				body: JSON.stringify({
					task_uuid: uuid
				})
			});

			if (!response.ok) {
				console.error(`Getting result failed: ${response.status} ${response.statusText}`);
				let errorText;
				try {
					const errorData = await response.json();
					errorText = JSON.stringify(errorData);
				} catch (e) {
					errorText = await response.text();
				}
				return new Response(`Getting result failed: ${errorText}`, {
					status: response.status
				});
			}

			const data = await response.json();
			console.log('Download response data:', data);
			return json(data);
		}

		// Check if this is a polling request
		const subscriptionKey = url.searchParams.get('subscriptionKey');

		if (subscriptionKey) {
			// Make the request to the polling URL with POST and proper JSON body
			const response = await fetch(`https://hyperhuman.deemos.com/api/v2/status`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${rodinAPIKEY}`
				},
				body: JSON.stringify({
					subscription_key: subscriptionKey
				})
			});

			if (!response.ok) {
				console.error(`Polling failed: ${response.status} ${response.statusText}`);
				let errorText;
				try {
					const errorData = await response.json();
					errorText = JSON.stringify(errorData);
				} catch (e) {
					errorText = await response.text();
				}
				return new Response(`Polling failed: ${errorText}`, {
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
