import { mkdir, readdir, copyFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');

async function copyCssFiles(fromDir, toDir) {
    const entries = await readdir(fromDir, { withFileTypes: true });

    for (const entry of entries) {
        const sourcePath = path.join(fromDir, entry.name);
        const targetPath = path.join(toDir, entry.name);

        if (entry.isDirectory()) {
            await mkdir(targetPath, { recursive: true });
            await copyCssFiles(sourcePath, targetPath);
            continue;
        }

        if (entry.isFile() && entry.name.endsWith('.css')) {
            await mkdir(path.dirname(targetPath), { recursive: true });
            await copyFile(sourcePath, targetPath);
        }
    }
}

await mkdir(distDir, { recursive: true });
await copyCssFiles(srcDir, distDir);