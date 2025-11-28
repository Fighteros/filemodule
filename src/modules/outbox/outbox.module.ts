import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { OutboxService } from './outbox.service';
import { OutboxWorker } from './outbox.worker';
import { CleanupService } from './cleanup.service';
import { CleanupWorker } from './cleanup.worker';
import { Outbox } from './domain/entities/outbox.entity';
import { TempFile } from '../files/domain/entities/temp-file.entity';
import { StorageModule } from '../storage/storage.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Outbox, TempFile]),
    ScheduleModule.forRoot(),
    StorageModule,
    FilesModule,
  ],
  providers: [
    OutboxService,
    OutboxWorker,
    CleanupService,
    CleanupWorker,
  ],
  exports: [OutboxService],
})
export class OutboxModule {}

