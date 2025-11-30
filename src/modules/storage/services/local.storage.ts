import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { nanoid } from 'nanoid';
import path, { dirname, join } from 'path';
import sanitize from 'sanitize-filename';
import { IStorage } from '../interfaces/storage.interface';

@Injectable()
export class LocalStorage implements IStorage {
  private baseDir: string;
  private tempDir: string;
  constructor(private configService: ConfigService) {
    this.baseDir = this.configService.get<string>('storage.baseDir')!;
    this.tempDir = join(this.baseDir, 'temp');
  }

  /* save temp data buffer to baseDir/temp/<key> */
  async saveToTemp(fileBuffer: Buffer, key: string): Promise<string> {
    const p = `/${this.baseDir}/temp/${key}`;
    await fs.mkdir(dirname(p), { recursive: true });
    await fs.writeFile(p, fileBuffer);
    return p;
  }

  /* move file on disk */
  async moveTempToFinal(tempPath: string, finalKey: string): Promise<string> {
    const finalPath = `/${this.baseDir}/files/${finalKey}`;
    await fs.mkdir(dirname(finalPath), { recursive: true });
    await fs.rename(tempPath, finalPath); /* atomic on same FS */
    return finalPath;
  }

  async delete(path: string): Promise<void> {
    try {
      await fs.unlink(path);
    } catch (e) {
      /* ignore not found */
    }
  }

  async getSignedUrl(path: string): Promise<string> {
    /* for local dev return direct path or a route that serves the file */
    return `/${this.baseDir}/${path.split(this.baseDir + '/').pop()}`;
  }

  createSafeFilename(originalName: string): string {
    const sanitized = sanitize(originalName);
    const ext = path.extname(sanitized) || '';
    const id = nanoid();

    return `${id}${ext}`;
  }
}
