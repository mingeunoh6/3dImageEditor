import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import fs from 'fs';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		https: {
			key: fs.readFileSync('key.pem'),
			cert: fs.readFileSync('cert.pem')
		},
		proxy: {}
	}
});
