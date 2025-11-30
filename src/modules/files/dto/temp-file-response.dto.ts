import { ApiProperty } from '@nestjs/swagger';

export class TempFileResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the temporary file',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'The signed URL to access the temporary file',
    example: 'https://example.com/files/temp/123e4567-e89b-12d3-a456-426614174000-file.pdf',
  })
  url: string;

  @ApiProperty({
    description: 'The original name of the uploaded file',
    example: 'document.pdf',
  })
  originalName: string;

  @ApiProperty({
    description: 'The size of the file in bytes',
    example: 1024,
  })
  size: number;

  @ApiProperty({
    description: 'The MIME type of the file',
    example: 'application/pdf',
  })
  mime: string;
}

