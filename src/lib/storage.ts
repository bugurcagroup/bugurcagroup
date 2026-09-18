import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import heic2any from 'heic2any';
import { firebaseStorage } from './firebase';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_OPTIMIZED_IMAGE_BYTES = 300 * 1024;
const MAX_IMAGE_DIMENSION = 1200;
const WEBP_QUALITY = 0.8;

type UploadStatus = 'optimizing' | 'uploading';

interface UploadOptions {
  onStatus?: (status: UploadStatus) => void;
}

const validateUpload = (file: File) => {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Dosya boyutu 15 MB sınırını aşamaz.');
  if (!file.type.startsWith('image/') && file.type !== 'application/pdf') throw new Error('Yalnızca görsel veya PDF dosyası yüklenebilir.');
};

const loadImage = (file: File): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const image = new Image();
  const objectUrl = URL.createObjectURL(file);
  image.onload = () => {
    URL.revokeObjectURL(objectUrl);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('Görsel okunamadı.'));
  };
  image.src = objectUrl;
});

const canvasToFile = (canvas: HTMLCanvasElement, fileName: string, quality: number): Promise<File> => new Promise((resolve, reject) => {
  canvas.toBlob(blob => {
    if (!blob) {
      reject(new Error('Görsel optimize edilemedi.'));
      return;
    }
    resolve(new File([blob], fileName, { type: 'image/webp', lastModified: Date.now() }));
  }, 'image/webp', quality);
});

export const optimizeImage = async (file: File): Promise<File> => {
  if (!file.type.startsWith('image/')) return file;

  if (file.type === 'image/heic' || file.type === 'image/heif' || /\.(heic|heif)$/i.test(file.name)) {
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
    file = new File([jpegBlob], `${file.name.replace(/\.(heic|heif)$/i, '')}.jpg`, { type: 'image/jpeg' });
  }

  const image = await loadImage(file);
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Görsel işleme alanı oluşturulamadı.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const baseName = file.name.replace(/\.[^/.]+$/, '') || 'image';
  let quality = WEBP_QUALITY;
  let optimized = await canvasToFile(canvas, `${baseName}.webp`, quality);
  while (optimized.size > MAX_OPTIMIZED_IMAGE_BYTES && quality > 0.45) {
    quality = Math.max(0.45, quality - 0.1);
    optimized = await canvasToFile(canvas, `${baseName}.webp`, quality);
  }
  return optimized;
};

const optimizedPath = (path: string, file: File) => file.type === 'image/webp'
  ? path.replace(/\.[^/.]+$/, '.webp')
  : path;

export const uploadFile = async (path: string, file: File, options: UploadOptions = {}): Promise<string> => {
  if (file.type.startsWith('image/')) {
    options.onStatus?.('optimizing');
    file = await optimizeImage(file);
    path = optimizedPath(path, file);
  }
  validateUpload(file);
  options.onStatus?.('uploading');
  const storageReference = ref(firebaseStorage, path);
  const snapshot = await uploadBytes(storageReference, file, { contentType: file.type });
  return getDownloadURL(snapshot.ref);
};

export const deleteFile = async (path: string): Promise<void> => {
  await deleteObject(ref(firebaseStorage, path));
};
