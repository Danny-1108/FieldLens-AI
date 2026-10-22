import { LocationData } from '../types';

/**
 * Compresses an image file or data URL to an optimized maximum dimension
 * and creates a lightweight thumbnail for local storage.
 */
export async function processFieldImage(
  fileOrDataUrl: File | string,
  maxDimension = 1000,
  quality = 0.8
): Promise<{
  fullBase64: string;
  mimeType: string;
  thumbnailBase64: string;
  width: number;
  height: number;
}> {
  let dataUrl: string;

  if (typeof fileOrDataUrl === 'string') {
    dataUrl = fileOrDataUrl;
  } else {
    dataUrl = await readFileAsDataUrl(fileOrDataUrl);
  }

  const img = await loadImage(dataUrl);

  // Calculate full resized dimensions
  let { width, height } = img;
  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  // Draw full compressed image
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D rendering context from canvas');

  // Fill white background in case of transparent PNGs
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const fullBase64 = canvas.toDataURL('image/jpeg', quality);

  // Create lightweight thumbnail (max 240px)
  const thumbMax = 240;
  let thumbW = width;
  let thumbH = height;
  if (thumbW > thumbH) {
    thumbH = Math.round((thumbH * thumbMax) / thumbW);
    thumbW = thumbMax;
  } else {
    thumbW = Math.round((thumbW * thumbMax) / thumbH);
    thumbH = thumbMax;
  }

  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = thumbW;
  thumbCanvas.height = thumbH;
  const thumbCtx = thumbCanvas.getContext('2d');
  if (!thumbCtx) throw new Error('Could not get thumbnail rendering context');

  thumbCtx.fillStyle = '#FFFFFF';
  thumbCtx.fillRect(0, 0, thumbW, thumbH);
  thumbCtx.drawImage(img, 0, 0, thumbW, thumbH);

  const thumbnailBase64 = thumbCanvas.toDataURL('image/jpeg', 0.7);

  return {
    fullBase64,
    mimeType: 'image/jpeg',
    thumbnailBase64,
    width,
    height,
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load image. Check file format or permissions.'));
    img.src = src;
  });
}

/**
 * Attempts to capture current GPS coordinates for student field logs
 */
export async function getFieldCoordinates(): Promise<LocationData | null> {
  if (!('geolocation' in navigator)) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          altitude: pos.coords.altitude ? Number(pos.coords.altitude.toFixed(1)) : null,
          accuracy: Math.round(pos.coords.accuracy),
          timestamp: pos.timestamp,
        });
      },
      (_err) => {
        // Location declined or unavailable - non-fatal
        resolve(null);
      },
      { timeout: 8000, enableHighAccuracy: true, maximumAge: 60000 }
    );
  });
}
