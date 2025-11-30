# Architecture Documentation

This document describes the architecture and design decisions of the File Module.

## Overview

The File Module is built on NestJS and follows a modular, layered architecture. It implements a two-phase file upload system that separates temporary storage from permanent storage, providing flexibility and data integrity.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  (Web App, Mobile App, API Consumers)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP/REST
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    API Layer                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  FilesController                                      │   │
│  │  - POST /v1/files/temp                                │   │
│  │  - GET /v1/files/temp/:id                             │   │
│  │  - DELETE /v1/files/temp/:id                          │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Service Calls
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  Business Logic Layer                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  FilesService                                         │   │
│  │  - createTempFiles()                                  │   │
│  │  - commitFilesToOwner()                              │   │
│  │  - cleanupExpiredTemps()                             │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  TempCleanupCron                                      │   │
│  │  - Scheduled cleanup job                             │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         │                           │
┌────────▼────────┐        ┌─────────▼─────────┐
│  Storage Layer  │        │  Database Layer   │
│  ┌────────────┐ │        │  ┌──────────────┐ │
│  │ LocalStorage│ │        │  │ TypeORM      │ │
│  │ (IStorage)  │ │        │  │ - File       │ │
│  └────────────┘ │        │  │ - TempFile   │ │
└─────────────────┘        │  └──────────────┘ │
                            └──────────────────┘
```

## Module Structure

### Files Module

The core file management module.

**Location:** `src/modules/files/`

**Components:**
- **Controller** (`controller/files.controller.ts`): REST API endpoints
- **Service** (`services/files.service.ts`): Business logic
- **Entities** (`entities/`): TypeORM entities (File, TempFile)
- **DTOs** (`dto/`): Data transfer objects
- **Cron Job** (`services/temp-cleanup.cron.ts`): Scheduled cleanup

**Responsibilities:**
- Handle file upload requests
- Manage temporary file lifecycle
- Commit files to permanent storage
- Clean up expired temporary files
- Provide file metadata and URLs

### Storage Module

Pluggable storage abstraction layer.

**Location:** `src/modules/storage/`

**Components:**
- **Interface** (`interfaces/storage.interface.ts`): Storage contract
- **Implementation** (`services/local.storage.ts`): Local filesystem storage

**Responsibilities:**
- Abstract storage operations
- Provide storage-agnostic API
- Handle file I/O operations
- Generate safe filenames
- Provide signed URLs

**Design Pattern:** Strategy Pattern

## Two-Phase Upload System

### Phase 1: Temporary Upload

```
Client                    Controller              Service              Storage              Database
  │                          │                      │                    │                      │
  │── POST /files/temp ──────>│                      │                    │                      │
  │                          │                      │                    │                      │
  │                          │── createTempFiles() ─>│                    │                      │
  │                          │                      │                    │                      │
  │                          │                      │── saveToTemp() ────>│                      │
  │                          │                      │                    │                      │
  │                          │                      │                    │── Write File ────────>│
  │                          │                      │                    │                      │
  │                          │                      │── save(TempFile) ────────────────────────>│
  │                          │                      │                    │                      │
  │<── 200 OK ────────────────│<── Return DTOs ──────│                    │                      │
  │                          │                      │                    │                      │
```

**Benefits:**
- Files can be validated before committing
- Supports multi-step workflows
- Prevents orphaned files
- Allows file preview before final upload

### Phase 2: Commit to Owner

```
Service              Database              Storage
  │                      │                    │
  │── Begin Transaction ─>│                    │
  │                      │                    │
  │── Find TempFiles ────>│                    │
  │                      │                    │
  │                      │<── Return TempFiles │
  │                      │                    │
  │── moveTempToFinal() ──────────────────────>│
  │                      │                    │
  │                      │                    │── Move File ──────>│
  │                      │                    │                    │
  │── save(File) ────────>│                    │                    │
  │                      │                    │                    │
  │── delete(TempFile) ──>│                    │                    │
  │                      │                    │                    │
  │── Commit ────────────>│                    │                    │
  │                      │                    │                    │
```

**Transaction Guarantees:**
- Atomicity: All files committed or none
- Consistency: Database and storage stay in sync
- Isolation: Concurrent commits don't interfere

## Data Flow

### File Upload Flow

1. **Client Request**
   - Client sends multipart/form-data with files
   - Request validated by ValidationPipe
   - RequestIdInterceptor adds unique request ID

2. **Controller Processing**
   - FilesInterceptor extracts files from request
   - Files converted to FileDataDto array
   - Service method called

3. **Service Processing**
   - Filenames sanitized
   - Files saved to temporary storage
   - TempFile entities created
   - Expiration set (default: 24 hours)

4. **Response**
   - TempFile data returned with URLs
   - ResponseInterceptor formats response
   - LoggingInterceptor logs request

### File Commit Flow

1. **Service Call**
   - `commitFilesToOwner()` called with temp IDs
   - Transaction started

2. **Validation**
   - All temp files verified to exist
   - NotFoundException if any missing

3. **File Movement**
   - Files moved from temp to permanent storage
   - Path: `{ownerType}/{ownerId}/{filename}`

4. **Database Update**
   - File entities created
   - TempFile entities deleted
   - Transaction committed

5. **Error Handling**
   - Transaction rolled back on error
   - Storage operations may need cleanup

## Storage Abstraction

### IStorage Interface

```typescript
interface IStorage {
  saveToTemp(buffer: Buffer, key: string): Promise<{path, physicalPath}>;
  moveTempToFinal(tempPath: string, finalKey: string): Promise<{path, physicalPath}>;
  delete(path: string): Promise<void>;
  getSignedUrl(path: string): Promise<string>;
  createSafeFilename(originalName: string): string;
}
```

### LocalStorage Implementation

**Features:**
- Filesystem-based storage
- Atomic file operations
- Safe filename generation
- Directory structure management

**Storage Structure:**
```
storage/
├── temp/
│   └── {sanitized-filename}
└── files/
    └── {ownerType}/
        └── {ownerId}/
            └── {sanitized-filename}
```

### Extending Storage

To add cloud storage support:

1. Implement `IStorage` interface
2. Register in `StorageModule`
3. Update configuration

**Example: S3Storage**
```typescript
@Injectable()
export class S3Storage implements IStorage {
  async saveToTemp(buffer: Buffer, key: string) {
    // Upload to S3 temp bucket
  }
  
  async moveTempToFinal(tempPath: string, finalKey: string) {
    // Copy from temp to final bucket
    // Delete from temp bucket
  }
  
  // ... implement other methods
}
```

## Database Design

### Entity Relationships

```
┌─────────────┐
│   TempFile  │
│─────────────│
│ id (UUID)   │
│ originalName│
│ path        │
│ physicalPath│
│ size        │
│ mime        │
│ expiresAt   │
│ meta (JSON) │
└─────────────┘

┌─────────────┐
│    File     │
│─────────────│
│ id (UUID)   │
│ originalName│
│ path        │
│ physicalPath│
│ size        │
│ mime        │
│ ownerType   │
│ ownerId     │
│ meta (JSON) │
└─────────────┘
```

**Note:** Both entities extend `Base` entity with:
- `id` (UUID primary key)
- `createdAt`, `updatedAt`, `deletedAt` (timestamps)

### Indexing Strategy

**Recommended Indexes:**
- `TempFile.expiresAt` - For cleanup queries
- `File.ownerType + File.ownerId` - For owner queries
- `File.path` - For file lookups

**Migration Example:**
```typescript
@Index(['expiresAt'])
@Entity('temp_files')
export class TempFile extends Base { ... }

@Index(['ownerType', 'ownerId'])
@Entity('files')
export class File extends Base { ... }
```

## Security Architecture

### Security Layers

1. **Input Validation**
   - class-validator decorators
   - Custom ValidationPipe
   - File type/size validation

2. **Filename Sanitization**
   - `sanitize-filename` library
   - Prevents path traversal
   - Removes dangerous characters

3. **Request Security**
   - Helmet middleware
   - CORS configuration
   - Rate limiting (Throttler)

4. **Error Handling**
   - Global exception filter
   - No sensitive data in errors
   - Request ID for tracing

### File Security

- **Storage Isolation:** Temp and permanent files separated
- **Access Control:** URLs can be signed/expiring
- **Filename Obfuscation:** Original names not in paths
- **Path Validation:** No directory traversal possible

## Error Handling

### Error Flow

```
Exception Thrown
      │
      ▼
GlobalExceptionFilter
      │
      ├──> Log Error (Winston)
      │
      ├──> Format Response
      │
      └──> Return to Client
```

### Error Types

- **Validation Errors:** 400 Bad Request
- **Not Found:** 404 Not Found
- **Server Errors:** 500 Internal Server Error
- **Rate Limit:** 429 Too Many Requests

### Error Response Format

```typescript
{
  statusCode: number;
  message: string | string[];
  error: string;
  requestId: string;
}
```

## Logging Architecture

### Logging Strategy

- **Winston Logger:** Structured logging
- **Daily Rotate:** Log files rotated daily
- **Log Levels:** error, warn, info, debug
- **Request Logging:** All requests logged with request ID

### Log Structure

```
logs/
├── 2025-11-30-combined.log  # All logs
└── 2025-11-30-error.log     # Errors only
```

### Logging Points

- Request/response (LoggingInterceptor)
- Errors (GlobalExceptionFilter)
- File operations (FilesService)
- Cleanup operations (TempCleanupCron)

## Performance Considerations

### Optimization Strategies

1. **Database**
   - Indexes on frequently queried fields
   - Connection pooling
   - Query optimization

2. **Storage**
   - Stream-based file operations
   - Atomic file moves
   - Efficient directory structure

3. **Caching**
   - File URLs can be cached
   - Metadata caching possible

4. **Cleanup**
   - Batch cleanup operations
   - Scheduled during low-traffic hours

### Scalability

**Horizontal Scaling:**
- Stateless API design
- Shared storage (S3, etc.)
- Database connection pooling

**Vertical Scaling:**
- Increase file size limits
- Optimize database queries
- Add caching layer

## Testing Architecture

### Test Structure

```
test/
└── app.e2e-spec.ts  # End-to-end tests

src/
└── **/*.spec.ts     # Unit tests
```

### Testing Strategy

- **Unit Tests:** Service methods, utilities
- **Integration Tests:** Module interactions
- **E2E Tests:** Full API workflows

### Test Data

- Use test database
- Clean up after tests
- Mock storage operations if needed

## Deployment Architecture

### Production Considerations

1. **Storage**
   - Use cloud storage (S3, Azure, GCS)
   - Configure CDN for file serving
   - Set up backup strategy

2. **Database**
   - Connection pooling
   - Read replicas for queries
   - Backup and recovery

3. **Monitoring**
   - Application metrics
   - Error tracking
   - Performance monitoring

4. **Security**
   - HTTPS only
   - Authentication/authorization
   - File scanning (antivirus)

## Future Enhancements

### Potential Improvements

1. **Storage Providers**
   - AWS S3 integration
   - Azure Blob Storage
   - Google Cloud Storage

2. **Features**
   - Image processing/resizing
   - File versioning
   - File sharing/permissions
   - Virus scanning

3. **Performance**
   - CDN integration
   - Caching layer
   - Async processing queue

4. **Monitoring**
   - Metrics dashboard
   - Alerting
   - Usage analytics

---

For more information, see:
- [API Documentation](./API.md)
- [Configuration Guide](./CONFIGURATION.md)
- [Development Guide](./DEVELOPMENT.md)

