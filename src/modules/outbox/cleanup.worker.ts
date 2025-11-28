import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CleanupService } from './cleanup.service';

@Injectable()
export class CleanupWorker implements OnModuleInit {
  private readonly logger = new Logger(CleanupWorker.name);

  constructor(private readonly cleanupService: CleanupService) {}

  onModuleInit() {
    this.logger.log('Cleanup worker initialized');
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupStaleFiles() {
    this.logger.debug('Running cleanup for stale temp files...');
    try {
      await this.cleanupService.cleanupStaleTempFiles();
    } catch (error) {
      this.logger.error(`Error cleaning up stale files: ${error.message}`);
    }
  }

}

