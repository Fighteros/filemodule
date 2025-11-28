import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxService } from './outbox.service';

@Injectable()
export class OutboxWorker implements OnModuleInit {
  private readonly logger = new Logger(OutboxWorker.name);

  constructor(private readonly outboxService: OutboxService) {}

  onModuleInit() {
    this.logger.log('Outbox worker initialized');
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async processOutbox() {
    this.logger.debug('Processing outbox items...');
    try {
      await this.outboxService.processPendingOutboxItems();
    } catch (error) {
      this.logger.error(`Error processing outbox: ${error.message}`);
    }
  }
}

