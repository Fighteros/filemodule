import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FilesService } from './files.service';
import { Outbox, OutboxStatus, OutboxType } from '../outbox/domain/entities/outbox.entity';

class RequestUploadUrlsDto {
  files: Array<{
    filename: string;
    size: number;
    contentType?: string;
  }>;
}

class ConfirmUploadDto {
  tempFileId: string;
}

class ProcessFilesDto {
  tempFileIds: string[];
}

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    @InjectRepository(Outbox)
    private readonly outboxRepository: Repository<Outbox>,
  ) {}

  @Post('upload-urls')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request upload URLs for file uploads' })
  @ApiResponse({ status: 200, description: 'Upload URLs generated' })
  async requestUploadUrls(@Body() dto: RequestUploadUrlsDto) {
    return await this.filesService.requestUploadUrls(dto.files);
  }

  @Post('confirm-upload')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm that a file has been uploaded' })
  @ApiResponse({ status: 200, description: 'Upload confirmed' })
  async confirmUpload(@Body() dto: ConfirmUploadDto) {
    return await this.filesService.confirmUpload(dto.tempFileId);
  }

  @Post('process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process uploaded files (move from tmp to final location)' })
  @ApiResponse({ status: 200, description: 'Files queued for processing' })
  async processFiles(@Body() dto: ProcessFilesDto) {
    // Verify files and mark as assigned
    await this.filesService.processFiles(dto.tempFileIds);

    // Create outbox entry for background processing
    const outbox = this.outboxRepository.create({
      type: OutboxType.MOVE_FILES,
      payload: {
        tempFileIds: dto.tempFileIds,
      },
      status: OutboxStatus.PENDING,
    });

    const saved = await this.outboxRepository.save(outbox);
    return { outboxId: saved.id, tempFileIds: dto.tempFileIds };
  }
}
