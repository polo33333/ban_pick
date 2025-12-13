import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tạo interface để nhận input từ user
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Hàm hỏi câu hỏi và trả về promise
function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// Hàm tìm tất cả file .webp trong thư mục
function findWebPFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // Bỏ qua node_modules và các thư mục ẩn
            if (!file.startsWith('.') && file !== 'node_modules') {
                findWebPFiles(filePath, fileList);
            }
        } else if (file.endsWith('.webp') && !file.endsWith('.original.webp')) {
            // Bỏ qua file backup để tránh xử lý lại
            fileList.push(filePath);
        }
    });

    return fileList;
}

// Hàm format kích thước file
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Hàm sleep để retry
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Hàm tối ưu hóa một file
async function optimizeWebP(filePath, options) {
    const { maxWidth, maxHeight, quality, keepOriginal } = options;

    try {
        const originalSize = fs.statSync(filePath).size;

        // Đọc file vào buffer trước để tránh file locking
        const inputBuffer = fs.readFileSync(filePath);
        const metadata = await sharp(inputBuffer).metadata();

        // Tạo tên file backup và output
        const backupPath = filePath.replace('.webp', '.original.webp');
        const dir = path.dirname(filePath);
        const filename = path.basename(filePath, '.webp');
        const outputPath = path.join(dir, `${filename}.optimized.webp`);

        // Backup file gốc nếu cần (copy trước khi xử lý)
        if (keepOriginal && !fs.existsSync(backupPath)) {
            fs.writeFileSync(backupPath, inputBuffer);
        }

        // Xử lý resize từ buffer
        let sharpInstance = sharp(inputBuffer);

        // Chỉ resize nếu ảnh lớn hơn kích thước tối đa
        if (metadata.width > maxWidth || metadata.height > maxHeight) {
            sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
                fit: 'inside',
                withoutEnlargement: true
            });
        }

        // Áp dụng quality và lưu vào file output mới
        await sharpInstance
            .webp({ quality: quality })
            .toFile(outputPath);

        // Đợi một chút để đảm bảo file được ghi xong
        await sleep(200);

        // Xóa file gốc và rename file mới - với retry logic
        let retries = 5;
        let success = false;

        while (retries > 0 && !success) {
            try {
                // Xóa file gốc
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }

                // Đợi để đảm bảo file đã được xóa hoàn toàn
                await sleep(300);

                // Rename file output thành file gốc
                fs.renameSync(outputPath, filePath);
                success = true;
            } catch (err) {
                retries--;
                if (retries > 0) {
                    process.stdout.write(` ⚠️  Retry ${6 - retries}/5...`);
                    await sleep(1000); // Đợi 1 giây trước khi retry
                } else {
                    throw err;
                }
            }
        }

        const newSize = fs.statSync(filePath).size;
        const savedBytes = originalSize - newSize;
        const savedPercent = ((savedBytes / originalSize) * 100).toFixed(2);

        return {
            success: true,
            filePath,
            originalSize,
            newSize,
            savedBytes,
            savedPercent,
            originalDimensions: `${metadata.width}x${metadata.height}`
        };
    } catch (error) {
        // Cleanup file output nếu có lỗi
        const dir = path.dirname(filePath);
        const filename = path.basename(filePath, '.webp');
        const outputPath = path.join(dir, `${filename}.optimized.webp`);

        if (fs.existsSync(outputPath)) {
            try {
                fs.unlinkSync(outputPath);
            } catch (cleanupErr) {
                // Ignore cleanup errors
            }
        }

        return {
            success: false,
            filePath,
            error: error.message
        };
    }
}

// Main function
async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         🖼️  WebP Image Optimizer Tool 🖼️                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Tìm tất cả file .webp trong thư mục live2d
    const live2dDir = path.join(__dirname, 'public', 'live2d');

    if (!fs.existsSync(live2dDir)) {
        console.log('❌ Không tìm thấy thư mục public/live2d!');
        rl.close();
        return;
    }

    const webpFiles = findWebPFiles(live2dDir);

    console.log(`📁 Tìm thấy ${webpFiles.length} file .webp trong thư mục public/live2d/\n`);

    if (webpFiles.length === 0) {
        console.log('❌ Không tìm thấy file .webp nào!');
        rl.close();
        return;
    }

    // Hiển thị tổng dung lượng hiện tại
    const totalSize = webpFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
    console.log(`📊 Tổng dung lượng hiện tại: ${formatBytes(totalSize)}\n`);

    // Lấy options từ user
    console.log('⚙️  CẤU HÌNH TỐI ƯU HÓA:\n');

    const maxWidthInput = await question('1️⃣  Chiều rộng tối đa (px) [mặc định: 1920]: ');
    const maxWidth = parseInt(maxWidthInput) || 1920;

    const maxHeightInput = await question('2️⃣  Chiều cao tối đa (px) [mặc định: 1080]: ');
    const maxHeight = parseInt(maxHeightInput) || 1080;

    const qualityInput = await question('3️⃣  Chất lượng nén (0-100) [mặc định: 80]: ');
    const quality = parseInt(qualityInput) || 80;

    const keepOriginalInput = await question('4️⃣  Giữ file gốc? (y/n) [mặc định: y]: ');
    const keepOriginal = keepOriginalInput.toLowerCase() !== 'n';

    const confirmInput = await question(`\n✅ Bạn có chắc chắn muốn tối ưu hóa ${webpFiles.length} file với cấu hình trên? (y/n): `);

    if (confirmInput.toLowerCase() !== 'y') {
        console.log('\n❌ Đã hủy tối ưu hóa.');
        rl.close();
        return;
    }

    console.log('\n🚀 Bắt đầu tối ưu hóa...\n');
    console.log('═'.repeat(80));

    const options = { maxWidth, maxHeight, quality, keepOriginal };
    const results = [];

    // Xử lý từng file
    for (let i = 0; i < webpFiles.length; i++) {
        const file = webpFiles[i];
        const relativePath = path.relative(live2dDir, file);

        process.stdout.write(`[${i + 1}/${webpFiles.length}] ${relativePath}... `);

        const result = await optimizeWebP(file, options);
        results.push(result);

        if (result.success) {
            console.log(`✅ ${formatBytes(result.originalSize)} → ${formatBytes(result.newSize)} (tiết kiệm ${result.savedPercent}%)`);
        } else {
            console.log(`❌ Lỗi: ${result.error}`);
        }
    }

    console.log('═'.repeat(80));

    // Tổng kết
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const totalSaved = results.reduce((sum, r) => sum + (r.savedBytes || 0), 0);
    const newTotalSize = webpFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);

    console.log('\n📊 KẾT QUẢ TỐI ƯU HÓA:\n');
    console.log(`✅ Thành công: ${successCount} file`);
    console.log(`❌ Thất bại: ${failCount} file`);
    console.log(`💾 Tiết kiệm: ${formatBytes(totalSaved)} (${((totalSaved / totalSize) * 100).toFixed(2)}%)`);
    console.log(`📦 Dung lượng mới: ${formatBytes(newTotalSize)}`);

    if (keepOriginal) {
        console.log(`\n💡 File gốc đã được lưu với tên *.original.webp`);
    }

    console.log('\n✨ Hoàn thành!\n');

    rl.close();
}

// Chạy script
main().catch(error => {
    console.error('❌ Lỗi:', error);
    rl.close();
    process.exit(1);
});
