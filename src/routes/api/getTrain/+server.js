// api/flux/+server.js

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
async function getAllTrainingData() {
	try {
		// Get the spreadsheet ID from environment variable
		const spreadsheetId = process.env.VITE_GOOGLE_FLUX_LOG_SHEET_ID;

		if (!spreadsheetId) {
			console.error('Google Sheets ID not found in environment variables');
			throw new Error('Google Sheets ID not configured');
		}

		// Get sheets client
		const sheets = await getGoogleSheetsClient();

		// Get spreadsheet info to determine the correct sheet name
		const spreadsheetInfo = await sheets.spreadsheets.get({
			spreadsheetId
		});

		// Get the Finetune sheet name (index 1 as per the original script)
		const finetuneSheetName = spreadsheetInfo.data.sheets[1].properties.title;

		// Get all data from the Finetune sheet
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId,
			range: `${finetuneSheetName}!A:F` // Get all columns A through F
		});

		// Extract data from response
		const rows = response.data.values || [];

		// Skip header row and transform data to required format [id, name, triggerword, type]
		// Column C (index 2) = id
		// Column D (index 3) = name
		// Column E (index 4) = triggerWord
		// Column F (index 5) = mode/type
		const formattedData = rows.slice(1).map((row) => {
			return {
				id: row[2] || '', // Column C
				name: row[3] || '', // Column D
				triggerWord: row[4] || '', // Column E
				type: row[5] || '' // Column F
			};
		});

		console.log('Successfully retrieved training data from Google Sheets');
		return formattedData;
	} catch (err) {
		console.error('Failed to get training data from Google Sheets:', err);
		console.error('Error details:', err.errors || err.message || 'Unknown error');
		throw err;
	}
}

export async function GET() {
	try {
		// Get all training data from the Finetune sheet
		const trainingData = await getAllTrainingData();

		// Return the data as JSON
		return json({ data: trainingData });
	} catch (error) {
		console.error('Error retrieving training data:', error);
		return json(
			{
				error: {
					msg: error.message || 'Failed to retrieve training data'
				}
			},
			{ status: 500 }
		);
	}
}