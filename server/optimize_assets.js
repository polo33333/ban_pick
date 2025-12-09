import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const folderPath = path.join(__dirname, '../public/live2d');

async function optimizeImages() {
    try {
        const files = await fs.readdir(folderPath);
        const webpFiles = files.filter(file => file.endsWith('.webp'));

        console.log(`Found ${webpFiles.length} .webp files to process.`);

        for (const file of webpFiles) {
            const filePath = path.join(folderPath, file);
            const tempFilePath = path.join(folderPath, `temp_${file}`);

            const stats = await fs.stat(filePath);
            const originalSize = (stats.size / 1024 / 1024).toFixed(2);

            // console.log(`Processing ${file} (${originalSize} MB)...`);

            try {
                // Compress with quality 80
                await sharp(filePath)
                    .webp({ quality: 80 })
                    .toFile(tempFilePath);

                const newStats = await fs.stat(tempFilePath);
                const newSize = (newStats.size / 1024 / 1024).toFixed(2);

                // Replace original file
                await fs.unlink(filePath);
                await fs.rename(tempFilePath, filePath);

                console.log(`Saved ${file}: ${originalSize} MB -> ${newSize} MB`);
            } catch (err) {
                console.error(`Error processing ${file}:`, err);
                // Clean up temp file if exists
                try { await fs.unlink(tempFilePath); } catch (e) { }
            }
        }

        console.log('Optimization complete.');

    } catch (error) {
        console.error("Error reading directory:", error);
    }
}

optimizeImages();
