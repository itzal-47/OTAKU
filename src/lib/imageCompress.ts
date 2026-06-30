/**
 * Comprime imagens no browser antes do upload para o Supabase Storage.
 * Reduz o peso do ficheiro mantendo qualidade visual aceitável —
 * essencial para utilizadores com internet mais lenta (maioria em Angola via 4G/3G).
 *
 * Vídeos não são comprimidos aqui (precisaria de ffmpeg.wasm, pesado demais
 * para correr no browser) — só é aplicado limite de tamanho.
 */

interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0 a 1
  mimeType?: 'image/jpeg' | 'image/webp';
}

const DEFAULTS: Required<CompressOptions> = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.8,
  mimeType: 'image/jpeg',
};

export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  // Só comprime imagens — vídeos e outros tipos passam direto
  if (!file.type.startsWith('image/')) return file;
  // GIFs perdem animação se forem reprocessados em canvas — não comprimir
  if (file.type === 'image/gif') return file;

  const opts = { ...DEFAULTS, ...options };

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;

    if (width > opts.maxWidth || height > opts.maxHeight) {
      const ratio = Math.min(opts.maxWidth / width, opts.maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob: Blob | null = await new Promise(resolve =>
      canvas.toBlob(resolve, opts.mimeType, opts.quality)
    );

    if (!blob) return file;

    // Se a versão comprimida ficar maior que a original (raro, ficheiros já pequenos), usa a original
    if (blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, opts.mimeType === 'image/webp' ? '.webp' : '.jpg');
    return new File([blob], newName, { type: opts.mimeType, lastModified: Date.now() });
  } catch {
    // Se algo falhar (formato não suportado, browser antigo, etc), usa o ficheiro original
    return file;
  }
}

/**
 * Valida o tamanho de ficheiros de vídeo (sem compressão real no browser).
 * Lança erro com mensagem amigável se exceder o limite.
 */
export function validateVideoSize(file: File, maxMb = 50): void {
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`Vídeo muito grande (máx ${maxMb}MB). O teu tem ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
  }
}

/**
 * Helper único: comprime se for imagem, valida tamanho se for vídeo.
 * Usar isto antes de qualquer upload para o Storage.
 */
export async function prepareMediaForUpload(file: File, opts?: CompressOptions): Promise<File> {
  if (file.type.startsWith('video/')) {
    validateVideoSize(file);
    return file;
  }
  return compressImage(file, opts);
}
