import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { FileDataDto } from '../dto/file-data.dto';
import { UploadFilesDto } from '../dto/upload-files.dto';
import { FilesService } from '../services/files.service';

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

  @Delete('temp/:id')
  @ApiOperation({ summary: 'Delete temporary file' })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the temporary file',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTempFile(@Param('id', ParseUUIDPipe) id: string) {
    await this.filesService.deleteTempFile(id);
  }
}
