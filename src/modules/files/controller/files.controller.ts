import {
    Controller,
    Post,
    UploadedFiles,
    UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
    ApiBody,
    ApiConsumes,
    ApiOperation,
    ApiTags
} from '@nestjs/swagger';
import { FilesService } from '../services/files.service';
import { UploadFilesDto } from '../dto/upload-files.dto';
import { FileDataDto } from '../dto/file-data.dto';

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('temp')
  @ApiOperation({ summary: 'Create temporary files' })
  @UseInterceptors(FilesInterceptor('files'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadFilesDto })
  async createTempFiles(
    @UploadedFiles()
    files: Array<Express.Multer.File>,
  ) {
    const fileData: FileDataDto[] = files.map((file) => ({
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    }));
    return await this.filesService.createTempFiles(fileData);
  }
}
