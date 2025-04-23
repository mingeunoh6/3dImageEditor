// api/storage/+server.js
import { put } from '@vercel/blob';
import { json } from '@sveltejs/kit';
import sharp from 'sharp'; // 서버 측 이미지 처리를 위한 라이브러리

export async function POST({ request }) {
    try {
        // 요청에서 파일 데이터와 메타데이터 추출
        const formData = await request.formData();
        const file = formData.get('file');
        const category = formData.get('category') || 'fluxInput';
        const filename = formData.get('filename') || `${Date.now()}.${file.type.split('/')[1]}`;

        // 파일 타입 확인
        if (!file.type.startsWith('image/')) {
            return json({ error: 'Only images are allowed' }, { status: 400 });
        }

        // Vercel Blob에 원본 이미지 업로드
        const blob = await put(`${category}/original_${filename}`, file, {
            access: 'public',
            addRandomSuffix: true
        });

        return json({
            success: true,
            url: blob.url,
            size: blob.size,
            originalFilename: filename
        });
    } catch (error) {
        console.error('Blob storage error:', error);
        return json({
            error: error.message || 'Failed to upload to storage'
        }, { status: 500 });
    }
}

// 이미지 URL에서 compressed base64 가져오기
export async function GET({ url }) {
    try {
        const blobUrl = url.searchParams.get('url');
        const maxSize = parseInt(url.searchParams.get('maxSize') || '3000000'); // 기본 3MB

        if (!blobUrl) {
            return json({ error: 'No blob URL provided' }, { status: 400 });
        }

        // Blob에서 이미지 가져오기
        const response = await fetch(blobUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch image from blob storage: ${response.statusText}`);
        }

        // ArrayBuffer로 이미지 데이터 가져오기
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 이미지 크기 확인
        const fileSize = buffer.length;
        console.log(`Original image size: ${fileSize} bytes`);

        // 압축이 필요한지 확인 (3MB 이상이면 압축)
        let compressedBuffer = buffer;
        let base64 = '';

        if (fileSize > maxSize) {
            console.log('Image requires compression');

            // Sharp를 사용하여 이미지 압축
            const image = sharp(buffer);
            const metadata = await image.metadata();

            // 첫 번째 압축 시도 (품질 낮추기)
            let quality = 80;
            compressedBuffer = await image.jpeg({ quality }).toBuffer();

            // 목표 크기에 도달할 때까지 점진적으로 품질 낮추기
            while (compressedBuffer.length > maxSize && quality > 20) {
                quality -= 10;
                compressedBuffer = await image.jpeg({ quality }).toBuffer();
                console.log(
                    `Compressed with quality ${quality}, new size: ${compressedBuffer.length} bytes`
                );
            }

            // 품질 조정만으로 충분하지 않으면 크기도 조정
            if (compressedBuffer.length > maxSize) {
                console.log('Quality reduction not sufficient, scaling down image dimensions');

                // 원본 이미지 크기에 기반하여 적절한 스케일 계산
                const scaleFactor = Math.sqrt(maxSize / compressedBuffer.length);
                const newWidth = Math.floor(metadata.width * scaleFactor);
                const newHeight = Math.floor(metadata.height * scaleFactor);

                console.log(`Resizing to ${newWidth}x${newHeight}`);

                compressedBuffer = await image.resize(newWidth, newHeight).jpeg({ quality }).toBuffer();

                console.log(`Final compressed size: ${compressedBuffer.length} bytes`);
            }

            base64 = compressedBuffer.toString('base64');
        } else {
            console.log('Image is small enough, using as is');
            base64 = buffer.toString('base64');
        }

        // MIME 타입 결정
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        return json({
            base64,
            contentType,
            dataUrl: `data:${contentType};base64,${base64}`,
            originalSize: fileSize,
            compressedSize: compressedBuffer.length
        });
    } catch (error) {
        console.error('Error processing image:', error);
        return json({ error: error.message }, { status: 500 });
    }
}