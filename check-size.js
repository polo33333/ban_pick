import sharp from 'sharp';

const metadata = await sharp('public/live2d/Augusta.webp').metadata();
console.log(`Width: ${metadata.width}, Height: ${metadata.height}`);
