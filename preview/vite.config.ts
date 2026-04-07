import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const previewRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    root: previewRoot,
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 4174,
    },
    preview: {
        host: '0.0.0.0',
        port: 4174,
    },
});