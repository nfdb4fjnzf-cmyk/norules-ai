export function validateText(text: any): string | null {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return 'Invalid text content';
    }
    if (text.length > 10000) {
        return 'Text content too long (max 10000 chars)';
    }
    return null;
}

export function validateUrl(url: any): string | null {
    if (!url || typeof url !== 'string') {
        return 'Invalid URL';
    }
    try {
        new URL(url);
        return null;
    } catch (e) {
        return 'Invalid URL format';
    }
}

export function validateFile(file: File | null, type: 'image' | 'video'): string | null {
    if (!file) {
        return `No ${type} file provided`;
    }

    const maxSize = type === 'image' ? 5 * 1024 * 1024 : 50 * 1024 * 1024; // 5MB for image, 50MB for video
    if (file.size > maxSize) {
        return `${type} file too large`;
    }

    if (type === 'image' && !file.type.startsWith('image/')) {
        return 'Invalid image file type';
    }

    if (type === 'video' && !file.type.startsWith('video/')) {
        return 'Invalid video file type';
    }

    return null;
}
