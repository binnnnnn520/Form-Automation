import jsQR from 'jsqr';

export function normalizeImportedUrl(raw: string): string {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Unsupported URL protocol');
    }
    return url.toString();
  } catch {
    throw new Error('Imported content is not a valid URL');
  }
}

export async function decodeQrFromFile(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is not available');
  }
  context.drawImage(bitmap, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const decoded = jsQR(imageData.data, imageData.width, imageData.height);
  if (!decoded) {
    throw new Error('No QR code was found in the image');
  }
  return normalizeImportedUrl(decoded.data);
}
