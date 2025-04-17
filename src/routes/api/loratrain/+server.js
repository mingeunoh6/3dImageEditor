// api/loratrain/+server.js

import { json, error } from '@sveltejs/kit';
import { google } from 'googleapis';

// Initialize Google Sheets API
async function getGoogleSheetsClient() {
    console.log('Google Sheets key file:', process.env.VITE_GOOGLE_APPLICATION_CREDENTIALS_JSON);
    try {
        // Read the key file

        const keyFile = JSON.parse(process.env.VITE_GOOGLE_APPLICATION_CREDENTIALS_JSON);

        // Create a JWT client with proper scopes
        const auth = new google.auth.GoogleAuth({
            credentials: keyFile,
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/drive.file'
            ]
        });

        // Get the client
        const authClient = await auth.getClient();

        // Create and return the sheets client
        return google.sheets({
            version: 'v4',
            auth: authClient
        });
    } catch (err) {
        console.error('Failed to initialize Google Sheets client:', err);
        throw err;
    }
}

// Function to log Flux generation data to Google Sheets
async function logToGoogleSheets(id, name, triggerWord, mode) {
	try {
		// Get the spreadsheet ID from environment variable
		const spreadsheetId = process.env.VITE_GOOGLE_FLUX_LOG_SHEET_ID;

		if (!spreadsheetId) {
			console.error('Google Sheets ID not found in environment variables');
			return;
		}

		// Get sheets client
		const sheets = await getGoogleSheetsClient();

		// Get spreadsheet info to determine the correct sheet name
		const spreadsheetInfo = await sheets.spreadsheets.get({
			spreadsheetId
		});

		// Get the first sheet name
		const finetuneSheetName = spreadsheetInfo.data.sheets[1].properties.title;
		const logSheetName = spreadsheetInfo.data.sheets[0].properties.title;

		// Format current date and time
		const now = new Date();
		const requestDate = `${now.getFullYear().toString().slice(2)}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
		const requestTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

		// Prepare the row data
		const log_values = [
			[
				requestDate,
				requestTime,
				`Flux LoRA training: type: ${mode}, name: ${name}`,
				0,
				id,
				'LoRA training'
			]
		];
		const values = [[requestDate, requestTime, id, name, triggerWord, mode]];

		console.log('data', values, log_values);
		// Append the row to the spreadsheet using the actual sheet name
		await sheets.spreadsheets.values.append({
			spreadsheetId,
			range: `${finetuneSheetName}!A1:F1`, // Use the actual sheet name
			valueInputOption: 'USER_ENTERED', // Changed from RAW to handle date formatting better
			insertDataOption: 'INSERT_ROWS',
			resource: {
				values
			}
		});
		await sheets.spreadsheets.values.append({
			spreadsheetId,
			range: `${logSheetName}!A1:F1`, // Use the actual sheet name
			valueInputOption: 'USER_ENTERED', // Changed from RAW to handle date formatting better
			insertDataOption: 'INSERT_ROWS',
			resource: {
				values: log_values
			}
		});

		console.log('Successfully logged to Google Sheets:', {
			id,
			name,
			triggerWord,
			mode,
			requestDate,
			requestTime
		});
	} catch (err) {
		console.error('Failed to log to Google Sheets:', err);
		console.error('Error details:', err.errors || err.message || 'Unknown error');
		// Don't throw the error, just log it to avoid disrupting the main API flow
	}
}

export async function POST({ request }) {
	try {
		const { data } = await request.json();
		const trainDatas = data;
		const fluxAPIKEY = process.env.VITE_FLUX_API_KEY;

		console.log('받은 입력:', trainDatas);

		if (!fluxAPIKEY) {
			return json({ error: { msg: 'NO FLUX API KEY!' } }, { status: 500 });
		}

		// 사용할 모델 및 API 엔드포인트
		const trainUrl = 'https://api.us1.bfl.ai/v1/finetune';

		// FLUX API에 요청 보내기
		const startResponse = await fetch(trainUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Key': fluxAPIKEY // 올바른 헤더 형식: X-Key
			},
			// 요청 본문에 input 객체를 직접 전달
			body: JSON.stringify(trainDatas)
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
		console.log('FLUX TRAINNING 응답:', jsonStartResponse);

		// Log to Google Sheets
		if (jsonStartResponse.finetune_id) {
			// Extract the prompt text from input
			const fintuneID = jsonStartResponse.finetune_id;

			// Asynchronously log to Google Sheets without waiting for completion
			logToGoogleSheets(
				fintuneID,
				trainDatas.finetune_comment,
				trainDatas.trigger_word,
				trainDatas.mode
			).catch((err) => console.error('Google Sheets logging error:', err));
		}

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
		// Check if this is a polling request
		const id = url.searchParams.get('result');

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
				return new Response(`Finetune detail load failed: ${response.statusText}`, {
					status: response.status
				});
			}

			const data = await response.json();
			console.log('Finetune detail:', data.status);
			return json(data);
		}

	// Check if this is a result request
		const finetune_id = url.searchParams.get('finetune_id');
		if (finetune_id) {
			const fluxAPIKEY = process.env.VITE_FLUX_API_KEY;
			const response = await fetch(`https://api.us1.bfl.ai/v1/finetune_details?finetune_id=${finetune_id}`, {
				method: 'GET',
				headers: {
					'X-Key': fluxAPIKEY
				}
			});

			if (!response.ok) {
				return new Response(`Finetune result process load failed: ${response.statusText}`, {
					status: response.status
				});
			}

			const data = await response.json();
			console.log('Finetune result:', data);
			return json(data);
		}

		return new Response('Missing required parameters', { status: 400 });
	} catch (err) {
		console.error('API proxy error:', err);
		return new Response(`Proxy error: ${err.message}`, { status: 500 });
	}
}