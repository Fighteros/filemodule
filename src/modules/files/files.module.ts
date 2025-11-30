import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesController } from './controller/files.controller';
import { File } from './entities/file.entity';
import { TempFile } from './entities/temp-file.entity';
import { FilesService } from './services/files.service';
import { TempCleanupCron } from './services/temp-cleanup.cron';

@Module({
  imports: [
    TypeOrmModule.forFeature([File, TempFile]),
    ScheduleModule,
  ],
  controllers: [FilesController],
  providers: [FilesService, TempCleanupCron],
  exports: [FilesService],
})
export class FilesModule {}
