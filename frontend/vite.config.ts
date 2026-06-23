import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: process.env.VITEST
		? {
				conditions: ['browser']
			}
		: undefined,
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		setupFiles: ['./src/vitest.setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov'],
			include: ['src/lib/**/*.{ts,svelte}'],
			exclude: ['src/lib/**/*.test.ts', 'src/lib/**/*.spec.ts']
		}
	},
	server: {
		proxy: {
			'/api': {
				target: process.env.VITE_API_URL ?? 'http://127.0.0.1:8080',
				changeOrigin: true
			},
			'/health': {
				target: process.env.VITE_API_URL ?? 'http://127.0.0.1:8080',
				changeOrigin: true
			}
		}
	}
});
