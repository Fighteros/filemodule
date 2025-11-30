import { ApiProperty } from '@nestjs/swagger';

export class UploadFilesDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    description: 'Array of files to upload',
  })
  files: Express.Multer.File[];
}

