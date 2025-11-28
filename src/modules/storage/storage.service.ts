import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, copyFileSync, unlinkSync, statSync } from 'fs';
import { join, dirname } from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly storageRoot: string;

  constructor(private readonly configService: ConfigService) {
    // Use uploads directory or a storage directory
    this.storageRoot = join(process.cwd(), 'storage');
    this.ensureDirectoryExists(this.storageRoot);
  }

  private ensureDirectoryExists(path: string): void {
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true });
    }
  }

  getUploadUrl(key: string): string {
    // Return a URL path that the client can POST to
    // In a real implementation, this would be the endpoint path
    return `/api/v1/files/upload/${encodeURIComponent(key)}`;
  }

  getFilePath(key: string): string {
    return join(this.storageRoot, key);
  }

  async fileExists(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    return existsSync(filePath);
  }

  async moveFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      const sourcePath = this.getFilePath(sourceKey);
      const destPath = this.getFilePath(destinationKey);

      // Ensure destination directory exists
      const destDir = dirname(destPath);
      this.ensureDirectoryExists(destDir);

      // Copy file to new location
      copyFileSync(sourcePath, destPath);

      // Delete original file
      unlinkSync(sourcePath);

      this.logger.log(`Moved file from ${sourceKey} to ${destinationKey}`);
    } catch (error) {
      this.logger.error(
        `Failed to move file from ${sourceKey} to ${destinationKey}: ${error.message}`,
      );
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      if (existsSync(filePath)) {
        unlinkSync(filePath);
        this.logger.log(`Deleted file: ${key}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete file ${key}: ${error.message}`);
      throw error;
    }
  }

  async getFileSize(key: string): Promise<number> {
    const filePath = this.getFilePath(key);
    if (existsSync(filePath)) {
      const stats = statSync(filePath);
      return stats.size;
    }
    return 0;
  }

  ensureDirectoryForKey(key: string): void {
    const filePath = this.getFilePath(key);
    const dirPath = dirname(filePath);
    this.ensureDirectoryExists(dirPath);
  }
}

