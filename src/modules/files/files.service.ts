import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TempFile, TempFileStatus } from './domain/entities/temp-file.entity';
import { StorageService } from '../storage/storage.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectRepository(TempFile)
    private readonly tempFileRepository: Repository<TempFile>,
    private readonly storageService: StorageService,
  ) {}

  async requestUploadUrls(
    files: Array<{ filename: string; size: number; contentType?: string }>,
  ): Promise<Array<{ tempFileId: string; url: string; key: string }>> {
    const results: Array<{ tempFileId: string; url: string; key: string }> = [];

    for (const file of files) {
      const tempId = uuidv4();
      const key = `tmp/${tempId}/${file.filename}`;

      // Ensure directory exists
      this.storageService.ensureDirectoryForKey(key);

      const uploadUrl = this.storageService.getUploadUrl(key);

      const tempFile = this.tempFileRepository.create({
        key,
        url: uploadUrl,
        size: file.size,
        uploaded: false,
        status: TempFileStatus.PENDING,
      });

      const saved = await this.tempFileRepository.save(tempFile);

      results.push({
        tempFileId: saved.id,
        url: uploadUrl,
        key: saved.key,
      });
    }

    return results;
  }

  async confirmUpload(tempFileId: string): Promise<TempFile> {
    const tempFile = await this.tempFileRepository.findOne({
      where: { id: tempFileId },
    });

    if (!tempFile) {
      throw new NotFoundException(`TempFile with id ${tempFileId} not found`);
    }

    // Verify file exists in local storage
    const exists = await this.storageService.fileExists(tempFile.key);
    if (!exists) {
      throw new NotFoundException(
        `File not found for key: ${tempFile.key}`,
      );
    }

    tempFile.uploaded = true;
    return await this.tempFileRepository.save(tempFile);
  }

  async getTempFilesByIds(ids: string[]): Promise<TempFile[]> {
    if (ids.length === 0) return [];
    return await this.tempFileRepository
      .createQueryBuilder('tempFile')
      .where('tempFile.id IN (:...ids)', { ids })
      .getMany();
  }

  async assignTempFiles(tempFileIds: string[]): Promise<void> {
    await this.tempFileRepository
      .createQueryBuilder()
      .update(TempFile)
      .set({
        status: TempFileStatus.ASSIGNED,
      })
      .where('id IN (:...ids)', { ids: tempFileIds })
      .execute();
  }

  async updateTempFileFinalKey(
    tempFileId: string,
    finalKey: string,
  ): Promise<void> {
    await this.tempFileRepository.update(
      { id: tempFileId },
      {
        finalKey,
        status: TempFileStatus.MOVED,
      },
    );
  }

  async processFiles(tempFileIds: string[]): Promise<void> {
    // Verify all temp files exist and are uploaded
    const tempFiles = await this.getTempFilesByIds(tempFileIds);
    
    if (tempFiles.length !== tempFileIds.length) {
      throw new NotFoundException('Some temp files not found');
    }

    const notUploaded = tempFiles.filter((tf) => !tf.uploaded);
    if (notUploaded.length > 0) {
      throw new NotFoundException(
        `Some files are not uploaded: ${notUploaded.map((tf) => tf.id).join(', ')}`,
      );
    }

    // Mark files as assigned
    await this.assignTempFiles(tempFileIds);
  }
}

