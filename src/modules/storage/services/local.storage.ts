import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWriteStream, promises as fs } from 'fs';
import { nanoid } from 'nanoid';
import path, { dirname, join } from 'path';
import sanitize from 'sanitize-filename';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
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
  async saveToTemp(
    fileBuffer: Buffer,
    key: string,
  ): Promise<{ path: string; physicalPath: string }> {
    const p = `/${this.baseDir}/temp/${key}`;
    const pathUrl = join(this.tempDir, key);
    await fs.mkdir(dirname(pathUrl), { recursive: true });
    // await fs.writeFile(pathUrl, fileBuffer);
    const ws = createWriteStream(pathUrl, { flags: 'w' });
    await pipeline(Readable.from(Buffer.from(fileBuffer)), ws);
    return { path: p, physicalPath: pathUrl };
  }

  /* move file on disk */
  async moveTempToFinal(
    tempPath: string,
    finalKey: string,
  ): Promise<{ path: string; physicalPath: string }> {
    const path = `/${this.baseDir}/files/${finalKey}`;
    const physicalPath = join(this.baseDir, 'files', finalKey);
    await fs.mkdir(dirname(physicalPath), { recursive: true });
    await fs.rename(tempPath, physicalPath); /* atomic on same FS */
    return { path, physicalPath };
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
