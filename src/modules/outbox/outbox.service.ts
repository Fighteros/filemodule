import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Outbox, OutboxStatus, OutboxType } from './domain/entities/outbox.entity';
import { StorageService } from '../storage/storage.service';
import { FilesService } from '../files/files.service';

const MAX_RETRIES = 5;

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @InjectRepository(Outbox)
    private readonly outboxRepository: Repository<Outbox>,
    private readonly storageService: StorageService,
    private readonly filesService: FilesService,
    private readonly dataSource: DataSource,
  ) {}

  async processPendingOutboxItems(): Promise<void> {
    const pendingItems = await this.outboxRepository.find({
      where: { status: OutboxStatus.PENDING },
      order: { createdAt: 'ASC' },
      take: 10, // Process 10 at a time
    });

    for (const item of pendingItems) {
      try {
        await this.processOutboxItem(item);
      } catch (error) {
        this.logger.error(
          `Failed to process outbox item ${item.id}: ${error.message}`,
        );
      }
    }
  }

  private async processOutboxItem(item: Outbox): Promise<void> {
    // Mark as processing
    item.status = OutboxStatus.PROCESSING;
    await this.outboxRepository.save(item);

    try {
      if (item.type === OutboxType.MOVE_FILES) {
        await this.processMoveFiles(item);
      }

      // Mark as completed
      item.status = OutboxStatus.COMPLETED;
      item.processedAt = new Date();
      await this.outboxRepository.save(item);

      this.logger.log(`Successfully processed outbox item ${item.id}`);
    } catch (error) {
      item.retryCount += 1;
      item.errorMessage = error.message;

      if (item.retryCount >= MAX_RETRIES) {
        item.status = OutboxStatus.FAILED;
        this.logger.error(
          `Outbox item ${item.id} failed after ${MAX_RETRIES} retries`,
        );
        // Could mark files as failed or handle cleanup here
      } else {
        item.status = OutboxStatus.PENDING;
      }

      await this.outboxRepository.save(item);
      throw error;
    }
  }

  private async processMoveFiles(item: Outbox): Promise<void> {
    const { tempFileIds } = item.payload;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const tempFiles = await this.filesService.getTempFilesByIds(tempFileIds);

      // Move files from tmp/ to files/ directory
      for (const tempFile of tempFiles) {
        const filename = tempFile.key.split('/').pop();
        const finalKey = `files/${tempFile.id}/${filename}`;
        
        await this.storageService.moveFile(tempFile.key, finalKey);
        
        // Update temp file with final key
        await this.filesService.updateTempFileFinalKey(
          tempFile.id,
          finalKey,
        );
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getFailedOutboxItems(): Promise<Outbox[]> {
    return await this.outboxRepository.find({
      where: { status: OutboxStatus.FAILED },
    });
  }
}

