import fs from 'fs';
import path from 'path';
import readline from 'readline';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => {
    return new Promise(resolve => rl.question(query, resolve));
};

const downloadFile = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download ${url}: ${response.statusText}`);
    }
    return Buffer.from(await response.arrayBuffer());
};

const main = async () => {
    try {
        const sourceChar = await askQuestion('Enter Source Character Name (e.g., jiyan): ');
        if (!sourceChar) {
            console.error('Source character name is required.');
            process.exit(1);
        }

        const targetChar = await askQuestion('Enter Target Character Name (e.g., Nam): ');
        if (!targetChar) {
            console.error('Target character name is required.');
            process.exit(1);
        }

        const baseUrl = `https://wutheringwaves.kurogames.com/spine-file/role_${sourceChar}`;
        const jsonUrl = `${baseUrl}/c_${sourceChar}_1.json`;
        const pngUrl = `${baseUrl}/c_${sourceChar}_1.png`;
        const atlasUrl = `${baseUrl}/c_${sourceChar}_1.atlas`;

        const outputDir = path.resolve(__dirname, '../public/live2d_2');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        console.log(`\nDownloading assets for ${sourceChar}...`);

        // 1. Download JSON
        console.log(`Downloading JSON from ${jsonUrl}...`);
        const jsonBuffer = await downloadFile(jsonUrl);
        const targetJsonPath = path.join(outputDir, `${targetChar}.json`);
        fs.writeFileSync(targetJsonPath, jsonBuffer);
        console.log(`Saved JSON to ${targetJsonPath}`);

        // 2. Download PNG and convert to WebP
        console.log(`Downloading PNG from ${pngUrl}...`);
        const pngBuffer = await downloadFile(pngUrl);
        const targetWebpPath = path.join(outputDir, `${targetChar}.webp`);
        console.log('Converting PNG to WebP...');
        await sharp(pngBuffer)
            .webp()
            .toFile(targetWebpPath);
        console.log(`Saved WebP to ${targetWebpPath}`);

        // 3. Download Atlas and update reference
        console.log(`Downloading Atlas from ${atlasUrl}...`);
        const atlasBuffer = await downloadFile(atlasUrl);
        let atlasContent = atlasBuffer.toString('utf-8');

        // Update the atlas content to point to the new .webp file
        // The first line typically contains the image file name
        const lines = atlasContent.split('\n');
        if (lines.length > 0) {
            console.log(`Original atlas image reference: ${lines[0]}`);
            lines[0] = `${targetChar}.webp`;
            atlasContent = lines.join('\n');
        }

        const targetAtlasPath = path.join(outputDir, `${targetChar}.atlas`);
        fs.writeFileSync(targetAtlasPath, atlasContent);
        console.log(`Saved Atlas to ${targetAtlasPath}`);

        console.log('\nAll assets downloaded and processed successfully!');
    } catch (error) {
        console.error('\nError:', error.message);
    } finally {
        rl.close();
    }
};

main();
