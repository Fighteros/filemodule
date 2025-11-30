# API Documentation

Complete API reference for the File Module.

## Base URL

All API endpoints are prefixed with `/v1` for versioning.

```
http://localhost:9000/v1
```

## Authentication

Currently, the API does not require authentication. In production, you should add authentication middleware.

## Endpoints

### Files

#### Upload Temporary Files

Upload one or more files to temporary storage. Files will expire after 24 hours.

**Endpoint:** `POST /v1/files/temp`

**Content-Type:** `multipart/form-data`

**Request Body:**
- `files` (file[], required): Array of files to upload

**Example Request:**
```bash
curl -X POST http://localhost:9000/v1/files/temp \
  -F "files=@document.pdf" \
  -F "files=@image.jpg"
```

**Response:** `200 OK`

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "/storage/temp/abc123def456.pdf",
    "originalName": "document.pdf",
    "size": 1024000,
    "mime": "application/pdf",
    "expiresAt": "2024-12-01T02:00:00.000Z"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "url": "/storage/temp/xyz789ghi012.jpg",
    "originalName": "image.jpg",
    "size": 512000,
    "mime": "image/jpeg",
    "expiresAt": "2024-12-01T02:00:00.000Z"
  }
]
```

**Response Fields:**
- `id` (string, UUID): Unique identifier for the temporary file
- `url` (string): URL to access the file
- `originalName` (string): Original filename
- `size` (number): File size in bytes
- `mime` (string): MIME type of the file
- `expiresAt` (string, ISO 8601): Expiration timestamp

**Error Responses:**
- `400 Bad Request`: Invalid request or validation error
- `413 Payload Too Large`: File size exceeds limit
- `500 Internal Server Error`: Server error

---

#### Get Temporary File

Retrieve information about a temporary file by ID.

**Endpoint:** `GET /v1/files/temp/:id`

**Path Parameters:**
- `id` (string, UUID, required): Temporary file identifier

**Example Request:**
```bash
curl http://localhost:9000/v1/files/temp/550e8400-e29b-41d4-a716-446655440000
```

**Response:** `200 OK`

```json
{
  "url": "/storage/temp/abc123def456.pdf"
}
```

**Response Fields:**
- `url` (string): URL to access the file

**Error Responses:**
- `404 Not Found`: Temporary file not found or expired
- `400 Bad Request`: Invalid UUID format

---

#### Delete Temporary File

Delete a temporary file before it expires.

**Endpoint:** `DELETE /v1/files/temp/:id`

**Path Parameters:**
- `id` (string, UUID, required): Temporary file identifier

**Example Request:**
```bash
curl -X DELETE http://localhost:9000/v1/files/temp/550e8400-e29b-41d4-a716-446655440000
```

**Response:** `204 No Content`

**Error Responses:**
- `404 Not Found`: Temporary file not found
- `400 Bad Request`: Invalid UUID format
- `500 Internal Server Error`: Server error during deletion

---

## Service API (Programmatic)

These methods are available through the `FilesService` for use within your application.

### commitFilesToOwner

Commit temporary files to permanent storage and associate them with an owner.

**Method Signature:**
```typescript
async commitFilesToOwner(
  ownerType: string,
  ownerId: string,
  tempIds: string[]
): Promise<File[]>
```

**Parameters:**
- `ownerType` (string, required): Type of owner entity (e.g., 'user', 'post', 'product')
- `ownerId` (string, required): ID of the owner entity
- `tempIds` (string[], required): Array of temporary file IDs to commit

**Returns:**
- `Promise<File[]>`: Array of committed File entities

**Example:**
```typescript
const files = await filesService.commitFilesToOwner(
  'user',
  'user-123',
  ['temp-id-1', 'temp-id-2']
);
```

**Throws:**
- `NotFoundException`: If any temporary file ID is not found

**Transaction:**
This operation is performed within a database transaction. If any part fails, all changes are rolled back.

---

### getFileSignedUrl

Get a signed URL for a permanent file.

**Method Signature:**
```typescript
async getFileSignedUrl(fileId: string): Promise<string | null>
```

**Parameters:**
- `fileId` (string, required): File entity ID

**Returns:**
- `Promise<string | null>`: Signed URL or null if file not found

**Example:**
```typescript
const url = await filesService.getFileSignedUrl('file-id-123');
```

---

### cleanupExpiredTemps

Clean up expired temporary files. Typically called by a scheduled cron job.

**Method Signature:**
```typescript
async cleanupExpiredTemps(): Promise<number>
```

**Returns:**
- `Promise<number>`: Number of files deleted

**Example:**
```typescript
const deletedCount = await filesService.cleanupExpiredTemps();
```

---

## Data Transfer Objects (DTOs)

### FileDataDto

Internal DTO for file data processing.

```typescript
{
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}
```

### UploadFilesDto

DTO for file upload request.

```typescript
{
  files: Express.Multer.File[];
}
```

### TempFileResponseDto

Response DTO for temporary file operations.

```typescript
{
  id: string;
  url: string;
  originalName: string;
  size: number;
  mime: string;
  expiresAt: Date | null;
}
```

---

## Error Responses

All error responses follow a consistent format:

```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request",
  "requestId": "unique-request-id"
}
```

**Error Fields:**
- `statusCode` (number): HTTP status code
- `message` (string): Error message (may be internationalized)
- `error` (string): Error type
- `requestId` (string): Unique request identifier for tracing

---

## Rate Limiting

The API is protected by rate limiting:
- **Limit:** 120 requests per minute
- **Window:** 60 seconds
- **Headers:** Rate limit information is included in response headers

---

## Request/Response Headers

### Request Headers

- `Content-Type`: `multipart/form-data` (for file uploads)
- `Accept-Language`: Language preference for error messages (optional)
- `X-Request-Id`: Custom request ID for tracing (optional)

### Response Headers

- `X-Request-Id`: Request identifier for tracing
- `X-RateLimit-Limit`: Rate limit maximum
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Time when rate limit resets

---

## Swagger Documentation

Interactive API documentation is available at:

```
http://localhost:9000/api/docs
```

The Swagger UI provides:
- Interactive API testing
- Request/response schemas
- Example requests
- Authentication configuration (when implemented)

---

## File Size Limits

Default file size limits:
- **Per file:** Configurable via Multer (default: no limit)
- **Total request:** Configurable via Express body parser

To configure limits, update the `FilesInterceptor` configuration in `files.controller.ts`.

---

## Supported File Types

The module accepts all file types. File type validation can be added by:

1. Creating a custom validation pipe
2. Adding validation in the controller
3. Implementing file type checking in the service

Example validation:

```typescript
const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];

if (!allowedMimeTypes.includes(file.mimetype)) {
  throw new BadRequestException('File type not allowed');
}
```

---

## File Naming

Files are automatically renamed for security:
- Original filenames are sanitized
- Unique IDs are generated using `nanoid`
- Original filenames are stored in the database
- File extensions are preserved

Example:
- Original: `My Document (2024).pdf`
- Stored as: `abc123def456.pdf`
- Original name preserved in database

---

## Storage Paths

### Temporary Files
```
storage/temp/{sanitized-filename}
```

### Permanent Files
```
storage/files/{ownerType}/{ownerId}/{sanitized-filename}
```

Example:
```
storage/files/user/user-123/abc123def456.pdf
```

---

## Best Practices

1. **Always commit temp files**: Don't leave temporary files uncommitted
2. **Handle errors gracefully**: Check for file existence before operations
3. **Use transactions**: When committing multiple files, use the provided transaction
4. **Monitor cleanup**: Ensure the cleanup cron job is running
5. **Validate file types**: Add validation for your use case
6. **Set appropriate limits**: Configure file size limits based on your needs

---

## Examples

### Complete Upload Flow

```typescript
// 1. Upload files
const formData = new FormData();
formData.append('files', file1);
formData.append('files', file2);

const response = await fetch('/v1/files/temp', {
  method: 'POST',
  body: formData,
});

const tempFiles = await response.json();

// 2. Create your entity
const post = await postService.create({ title: 'My Post' });

// 3. Commit files
const files = await filesService.commitFilesToOwner(
  'post',
  post.id,
  tempFiles.map(tf => tf.id)
);
```

### Error Handling

```typescript
try {
  const tempFile = await filesService.getTempFile(id);
} catch (error) {
  if (error instanceof NotFoundException) {
    // Handle not found
  } else {
    // Handle other errors
  }
}
```

---

For more information, see:
- [Architecture Guide](./ARCHITECTURE.md)
- [Configuration Guide](./CONFIGURATION.md)
- [Development Guide](./DEVELOPMENT.md)

