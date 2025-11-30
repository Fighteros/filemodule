import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FilesService } from './files.service';

@Injectable()
export class TempCleanupCron {
  private readonly logger = new Logger(TempCleanupCron.name);

  constructor(private readonly filesService: FilesService) {}

  /* Run daily at 2 AM to clean up expired temporary files */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleTempFileCleanup() {
    this.logger.log('Starting cleanup of expired temporary files...');
    try {
      const deletedCount = await this.filesService.cleanupExpiredTemps();
      this.logger.log(
        `Successfully completed cleanup of expired temporary files. Deleted ${deletedCount} file(s)`,
      );
    } catch (error) {
      this.logger.error(
        'Error during cleanup of expired temporary files',
        error.stack,
      );
    }
  }
}

