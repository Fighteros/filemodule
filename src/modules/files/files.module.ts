import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { TempFile } from './domain/entities/temp-file.entity';
import { Outbox } from '../outbox/domain/entities/outbox.entity';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TempFile, Outbox]),
    StorageModule,
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}

