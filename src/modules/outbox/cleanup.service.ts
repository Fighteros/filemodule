import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { TempFile } from '../files/domain/entities/temp-file.entity';
import { StorageService } from '../storage/storage.service';
import { subHours } from 'date-fns';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);
  private readonly STALE_HOURS = 24; // Files older than 24 hours

  constructor(
    @InjectRepository(TempFile)
    private readonly tempFileRepository: Repository<TempFile>,
    private readonly storageService: StorageService,
  ) {}

  async cleanupStaleTempFiles(): Promise<void> {
    const staleThreshold = subHours(new Date(), this.STALE_HOURS);
    
    // Find temp files that are:
    // 1. Not uploaded and older than threshold
    // 2. Or still in PENDING status and older than threshold
    const staleFiles = await this.tempFileRepository.find({
      where: [
        {
          uploaded: false,
          createdAt: LessThan(staleThreshold),
        },
        {
          status: 'PENDING' as any,
          createdAt: LessThan(staleThreshold),
        },
      ],
    });

    this.logger.log(`Found ${staleFiles.length} stale temp files to clean up`);

    for (const file of staleFiles) {
      try {
        // Delete from local storage
        await this.storageService.deleteFile(file.key);
        
        // Delete from database
        await this.tempFileRepository.remove(file);
        
        this.logger.log(`Cleaned up stale file: ${file.id}`);
      } catch (error) {
        this.logger.error(
          `Failed to cleanup file ${file.id}: ${error.message}`,
        );
      }
    }
  }
}

