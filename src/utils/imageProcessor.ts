export interface ProcessedImageResult {
  blob: Blob;
  fileName: string;
  originalSize: number;
  processedSize: number;
  width: number;
  height: number;
  mimeType: string;
}

const MAX_DIMENSION = 1200;

/**
 * Optimizes and/or rotates an image file client-side using HTML5 Canvas
 * so smartphone photos (often 5-10 MB) upload and load rapidly as crisp WebP assets.
 */
export async function processImageFile(
  file: File,
  options: { optimize: boolean; rotateQuarterTurns?: number }
): Promise<ProcessedImageResult> {
  const turns = ((options.rotateQuarterTurns ?? 0) % 4 + 4) % 4;

  // If no optimization and no rotation requested, return original file bytes cleanly
  if (!options.optimize && turns === 0) {
    const dims = await readImageDimensions(file);
    return {
      blob: file,
      fileName: file.name,
      originalSize: file.size,
      processedSize: file.size,
      width: dims.width,
      height: dims.height,
      mimeType: file.type || 'image/jpeg',
    };
  }

  const bitmap = await loadImageBitmap(file);
  const srcWidth = bitmap.width;
  const srcHeight = bitmap.height;

  let targetW = srcWidth;
  let targetH = srcHeight;

  if (options.optimize) {
    const longest = Math.max(srcWidth, srcHeight);
    if (longest > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / longest;
      targetW = Math.round(srcWidth * scale);
      targetH = Math.round(srcHeight * scale);
    }
  }

  const swapAxes = turns === 1 || turns === 3;
  const canvas = document.createElement('canvas');
  canvas.width = swapAxes ? targetH : targetW;
  canvas.height = swapAxes ? targetW : targetH;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser canvas context is unavailable for image processing.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((turns * Math.PI) / 2);
  ctx.drawImage(bitmap, -targetW / 2, -targetH / 2, targetW, targetH);
  ctx.restore();

  if ('close' in bitmap && typeof bitmap.close === 'function') {
    bitmap.close();
  }

  const targetMime = file.type === 'image/png' && !options.optimize ? 'image/png' : 'image/webp';
  const quality = options.optimize ? 0.76 : 0.92;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result);
          return;
        }
        // Fallback to JPEG if WebP encoding is unavailable
        canvas.toBlob(
          (jpgResult) => {
            if (jpgResult) resolve(jpgResult);
            else reject(new Error('Failed to encode processed image.'));
          },
          'image/jpeg',
          quality
        );
      },
      targetMime,
      quality
    );
  });

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'site_photo';
  const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';

  return {
    blob,
    fileName: `${baseName}.${ext}`,
    originalSize: file.size,
    processedSize: blob.size,
    width: canvas.width,
    height: canvas.height,
    mimeType: blob.type,
  };
}

async function loadImageBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Unable to decode image "${file.name}".`));
    };
    img.src = url;
  });
}

async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const bmp = await loadImageBitmap(file);
  const res = { width: bmp.width, height: bmp.height };
  if ('close' in bmp && typeof bmp.close === 'function') {
    bmp.close();
  }
  return res;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
