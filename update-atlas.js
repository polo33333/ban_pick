import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Scale factor: 1920/8192 = 0.234375, 960/4096 = 0.234375
const SCALE_FACTOR = 0.234375;
const NEW_WIDTH = 1920;
const NEW_HEIGHT = 960;

// Hàm tìm tất cả file .atlas trong thư mục
function findAtlasFiles(dir) {
    const files = fs.readdirSync(dir);
    return files.filter(file => file.endsWith('.atlas')).map(file => path.join(dir, file));
}

// Hàm scale một số
function scaleValue(value) {
    return Math.round(value * SCALE_FACTOR);
}

// Hàm cập nhật một file atlas
function updateAtlasFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const updatedLines = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];

            // Update size declaration (line 2 in most atlas files)
            if (line.startsWith('size:')) {
                line = `size:${NEW_WIDTH},${NEW_HEIGHT}`;
            }
            // Update bounds: x,y,width,height
            else if (line.includes('bounds:')) {
                line = line.replace(/bounds:(\d+),(\d+),(\d+),(\d+)/, (match, x, y, w, h) => {
                    return `bounds:${scaleValue(x)},${scaleValue(y)},${scaleValue(w)},${scaleValue(h)}`;
                });
            }
            // Update offsets: x,y,width,height
            else if (line.includes('offsets:')) {
                line = line.replace(/offsets:(\d+),(\d+),(\d+),(\d+)/, (match, x, y, w, h) => {
                    return `offsets:${scaleValue(x)},${scaleValue(y)},${scaleValue(w)},${scaleValue(h)}`;
                });
            }

            updatedLines.push(line);
        }

        // Write back to file
        fs.writeFileSync(filePath, updatedLines.join('\n'), 'utf8');
        return { success: true, filePath };
    } catch (error) {
        return { success: false, filePath, error: error.message };
    }
}

// Main function
async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         📐 Atlas File Updater Tool 📐                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const live2dDir = path.join(__dirname, 'public', 'live2d');

    if (!fs.existsSync(live2dDir)) {
        console.log('❌ Không tìm thấy thư mục public/live2d!');
        return;
    }

    const atlasFiles = findAtlasFiles(live2dDir);

    console.log(`📁 Tìm thấy ${atlasFiles.length} file .atlas trong thư mục public/live2d/\n`);

    if (atlasFiles.length === 0) {
        console.log('❌ Không tìm thấy file .atlas nào!');
        return;
    }

    console.log('⚙️  CẤU HÌNH:');
    console.log(`   - Scale factor: ${SCALE_FACTOR}`);
    console.log(`   - New texture size: ${NEW_WIDTH}x${NEW_HEIGHT}`);
    console.log(`   - Original size: 8192x4096\n`);

    console.log('🚀 Bắt đầu cập nhật...\n');
    console.log('═'.repeat(80));

    const results = [];

    for (let i = 0; i < atlasFiles.length; i++) {
        const file = atlasFiles[i];
        const fileName = path.basename(file);

        process.stdout.write(`[${i + 1}/${atlasFiles.length}] ${fileName}... `);

        const result = updateAtlasFile(file);
        results.push(result);

        if (result.success) {
            console.log('✅ Đã cập nhật');
        } else {
            console.log(`❌ Lỗi: ${result.error}`);
        }
    }

    console.log('═'.repeat(80));

    // Summary
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log('\n📊 KẾT QUẢ CẬP NHẬT:\n');
    console.log(`✅ Thành công: ${successCount} file`);
    console.log(`❌ Thất bại: ${failCount} file`);

    console.log('\n✨ Hoàn thành!\n');
}

// Run script
main().catch(error => {
    console.error('❌ Lỗi:', error);
    process.exit(1);
});
