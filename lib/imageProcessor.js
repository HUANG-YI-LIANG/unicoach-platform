import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

/**
 * ImageProcessor: 工業級圖片處理引擎
 * 支援多尺寸自動化縮圖、WebP 轉換與安全驗證
 */
export class ImageProcessor {
  // 定義標準尺寸規範
  static sizes = {
    thumbnail: { width: 200, height: 200, fit: 'cover' }, // 列表/頭像 
    medium: { width: 800, height: 800, fit: 'inside' },    // 預覽圖 (高清)
    full: { width: 1600, height: 1600, fit: 'inside' }     // 原始檢視
  };

  /**
   * 檢查環境依賴是否就緒
   */
  static async checkDependencies() {
    try {
      // 動態導入以測試是否已安裝
      const testSharp = await import('sharp');
      const testUuid = await import('uuid');
      return { status: 'ready' };
    } catch (error) {
      return { 
        status: 'missing', 
        error: '系統遺失必要依賴：sharp 或 uuid',
        details: error.message
      };
    }
  }

  /**
   * 核心處理邏輯：轉換多尺寸 WebP
   * @param {Buffer} buffer - 原始檔案 Buffer
   * @param {string} originalName - 原始檔名
   */
  static async processUpload(buffer, originalName) {
    const baseId = uuidv4();
    const results = {};
    const image = sharp(buffer);

    // 1. 基本安全與元數據檢查
    const metadata = await image.metadata();
    const supportedFormats = ['jpeg', 'jpg', 'png', 'webp'];
    
    if (!supportedFormats.includes(metadata.format)) {
      throw new Error(`不支援的檔案格式: ${metadata.format}。請上傳 JPG, PNG 或 WebP。`);
    }

    if (metadata.width > 8000 || metadata.height > 8000) {
      throw new Error('圖片尺寸過大，請調整至 8000px 以下。');
    }

    // 2. 移除 EXIF 資訊 (保護隱私) 並自動校正方向
    const cleanImage = image.rotate();

    // 3. 多尺寸併行處理
    const processingTasks = Object.entries(this.sizes).map(async ([sizeName, config]) => {
      const fileName = `${baseId}_${sizeName}.webp`;
      
      const processedBuffer = await cleanImage
        .clone()
        .resize({
          width: config.width,
          height: config.height,
          fit: config.fit,
          withoutEnlargement: true
        })
        .webp({ quality: 85, effort: 6 })
        .toBuffer();

      results[sizeName] = {
        buffer: processedBuffer,
        filename: fileName,
        path: `/uploads/verification/${fileName}`,
        size: processedBuffer.length,
        width: config.width,
        height: config.height
      };
    });

    await Promise.all(processingTasks);

    return {
      baseId,
      originalName,
      format: 'webp',
      images: results
    };
  }
}
