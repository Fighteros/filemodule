# File Module - NestJS File Management System

A robust, production-ready file management module for NestJS applications. This module provides a two-phase file upload system with temporary file handling, automatic cleanup, and support for multiple storage backends.

## 🚀 Features

- **Two-Phase Upload System**: Upload files to temporary storage first, then commit them to permanent storage when ready
- **Automatic Cleanup**: Scheduled cleanup of expired temporary files (configurable expiration)
- **Storage Abstraction**: Pluggable storage interface supporting local filesystem (with easy extension to cloud storage)
- **TypeORM Integration**: Full database support with File and TempFile entities
- **Security**: File name sanitization, request validation, and secure file handling
- **API Documentation**: Auto-generated Swagger/OpenAPI documentation
- **Internationalization**: i18n support for error messages
- **Logging**: Comprehensive logging with Winston
- **Production Ready**: Includes throttling, compression, helmet security, and CORS configuration

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Architecture](#architecture)
- [Usage Examples](#usage-examples)
- [Migration Guide](#migration-guide)
- [Development](#development)
- [Contributing](#contributing)

## 📦 Installation

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL, MySQL, or compatible database
- TypeORM configured in your NestJS project

### Install Dependencies

```bash
npm install
```

### Required Environment Variables

Create a `.env` file in the root directory:

```env
# Application
APP_NAME=filemodule
NODE_ENV=development
PORT=9000
CORS_ORIGINS=*

# Database
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=filemodule_db

# Storage
STORAGE_BASE_DIR=storage
```

## 🏃 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run database migrations:**
   ```bash
   # Generate migrations (if using TypeORM migrations)
   npm run typeorm migration:generate -- -n CreateFilesTables
   npm run typeorm migration:run
   ```

4. **Create storage directories:**
   ```bash
   mkdir -p storage/temp
   mkdir -p storage/files
   ```

5. **Start the development server:**
   ```bash
   npm run start:dev
   ```

6. **Access API documentation:**
   - Swagger UI: `http://localhost:9000/api/docs`

## ⚙️ Configuration

### Application Configuration

The application uses `@nestjs/config` for configuration management. Key configuration files:

- `src/config/configs/app.config.ts` - Application settings
- `src/config/configs/database.config.ts` - Database connection
- `src/config/configs/storage.config.ts` - Storage settings

### Storage Configuration

Configure storage in `.env`:

```env
STORAGE_BASE_DIR=storage  # Base directory for file storage
```

The storage module uses a pluggable interface (`IStorage`) that currently implements local filesystem storage. You can extend it to support:
- AWS S3
- Azure Blob Storage
- Google Cloud Storage
- Any other storage backend

## 📚 API Reference

### Upload Temporary Files

Upload files to temporary storage. Files expire after 24 hours by default.

**Endpoint:** `POST /v1/files/temp`

**Request:**
```bash
curl -X POST http://localhost:9000/v1/files/temp \
  -F "files=@document.pdf" \
  -F "files=@image.jpg"
```

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "/storage/temp/abc123.pdf",
    "originalName": "document.pdf",
    "size": 1024000,
    "mime": "application/pdf",
    "expiresAt": "2024-12-01T02:00:00.000Z"
  }
]
```

### Get Temporary File

Retrieve information about a temporary file.

**Endpoint:** `GET /v1/files/temp/:id`

**Request:**
```bash
curl http://localhost:9000/v1/files/temp/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "url": "/storage/temp/abc123.pdf"
}
```

### Delete Temporary File

Delete a temporary file before it expires.

**Endpoint:** `DELETE /v1/files/temp/:id`

**Request:**
```bash
curl -X DELETE http://localhost:9000/v1/files/temp/550e8400-e29b-41d4-a716-446655440000
```

**Response:** `204 No Content`

### Commit Files to Owner

Commit temporary files to permanent storage (programmatic API).

**Service Method:** `FilesService.commitFilesToOwner(ownerType, ownerId, tempIds)`

```typescript
const files = await filesService.commitFilesToOwner(
  'user',
  'user-123',
  ['temp-file-id-1', 'temp-file-id-2']
);
```

## 🏗️ Architecture

### Module Structure

```
src/
├── modules/
│   ├── files/              # File management module
│   │   ├── controller/     # REST API endpoints
│   │   ├── services/       # Business logic
│   │   ├── entities/       # TypeORM entities
│   │   └── dto/            # Data transfer objects
│   └── storage/            # Storage abstraction
│       ├── interfaces/     # Storage interface
│       └── services/       # Storage implementations
├── config/                 # Configuration modules
├── core/                   # Core application features
│   ├── filters/            # Exception filters
│   ├── interceptors/       # Request/response interceptors
│   └── pipes/              # Validation pipes
└── common/                 # Shared utilities
```

### Two-Phase Upload Flow

1. **Phase 1 - Temporary Upload:**
   - Client uploads files to `/v1/files/temp`
   - Files are stored in `storage/temp/` directory
   - TempFile records created in database with expiration
   - Returns temp file IDs and URLs

2. **Phase 2 - Commit:**
   - Application calls `commitFilesToOwner()` with temp IDs
   - Files moved from temp to permanent storage
   - File records created with owner information
   - TempFile records deleted
   - Transaction ensures atomicity

### Database Schema

**TempFile Entity:**
- `id` (UUID) - Primary key
- `originalName` - Original filename
- `path` - Client-accessible path
- `physicalPath` - Filesystem path
- `size` - File size in bytes
- `mime` - MIME type
- `expiresAt` - Expiration timestamp
- `meta` - JSON metadata
- `createdAt`, `updatedAt`, `deletedAt` - Timestamps

**File Entity:**
- `id` (UUID) - Primary key
- `originalName` - Original filename
- `path` - Client-accessible path
- `physicalPath` - Filesystem path
- `size` - File size in bytes
- `mime` - MIME type
- `ownerType` - Owner entity type (e.g., 'user', 'post')
- `ownerId` - Owner entity ID
- `meta` - JSON metadata
- `createdAt`, `updatedAt`, `deletedAt` - Timestamps

## 💡 Usage Examples

### Basic File Upload Flow

```typescript
// 1. Upload files to temporary storage
const formData = new FormData();
formData.append('files', file1);
formData.append('files', file2);

const response = await fetch('http://localhost:9000/v1/files/temp', {
  method: 'POST',
  body: formData,
});

const tempFiles = await response.json();
// Returns: [{ id: '...', url: '...', ... }, ...]

// 2. Commit files to owner (in your service)
const files = await filesService.commitFilesToOwner(
  'user',
  currentUser.id,
  tempFiles.map(tf => tf.id)
);
```

### Using FilesService in Your Modules

```typescript
import { FilesService } from '@/modules/files/services/files.service';

@Injectable()
export class YourService {
  constructor(private filesService: FilesService) {}

  async createPostWithFiles(postData: any, tempFileIds: string[]) {
    // Create your entity first
    const post = await this.postRepository.save(postData);

    // Commit files to the post
    const files = await this.filesService.commitFilesToOwner(
      'post',
      post.id,
      tempFileIds
    );

    return { post, files };
  }
}
```

### Custom Storage Implementation

```typescript
import { IStorage } from '@/modules/storage/interfaces/storage.interface';

@Injectable()
export class S3Storage implements IStorage {
  async saveToTemp(buffer: Buffer, key: string) {
    // Implement S3 upload logic
  }

  async moveTempToFinal(tempPath: string, finalKey: string) {
    // Implement S3 move/copy logic
  }

  // ... implement other methods
}
```

## 🔄 Migration Guide

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed instructions on copying this module to another NestJS project.

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run start:dev      # Start with hot-reload
npm run start:debug    # Start with debugging

# Production
npm run build          # Build for production
npm run start:prod     # Start production server

# Testing
npm run test           # Run unit tests
npm run test:watch     # Run tests in watch mode
npm run test:cov       # Run tests with coverage
npm run test:e2e       # Run end-to-end tests

# Code Quality
npm run lint           # Lint code
npm run format         # Format code with Prettier
```

### Project Structure

- `src/` - Source code
  - `modules/` - Feature modules (files, storage, database)
  - `config/` - Configuration and validation
  - `core/` - Core application features (filters, interceptors, pipes)
  - `common/` - Shared utilities, DTOs, entities
- `test/` - E2E tests
- `storage/` - File storage directory
- `dist/` - Compiled output

### Adding New Features

1. **New Storage Backend:**
   - Implement `IStorage` interface
   - Register in `StorageModule`
   - Update configuration

2. **File Validation:**
   - Add validation in controller or create custom pipe
   - Update DTOs with validation decorators

3. **Custom File Processing:**
   - Extend `FilesService` or create new service
   - Add interceptors for file processing

## 🔒 Security Features

- **Helmet**: Security headers
- **CORS**: Configurable cross-origin resource sharing
- **Throttling**: Rate limiting (120 requests per minute)
- **File Sanitization**: Automatic filename sanitization
- **Validation**: Request validation with class-validator
- **Error Handling**: Global exception filter with i18n support

## 📝 License

See [LICENSE](./LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📖 Additional Documentation

- [API Documentation](./docs/API.md) - Detailed API reference
- [Architecture Guide](./docs/ARCHITECTURE.md) - System architecture
- [Configuration Guide](./docs/CONFIGURATION.md) - Configuration options
- [Development Guide](./docs/DEVELOPMENT.md) - Development setup and guidelines

## 🐛 Troubleshooting

### Common Issues

**Files not uploading:**
- Check storage directory permissions
- Verify `STORAGE_BASE_DIR` environment variable
- Ensure storage directories exist

**Database connection errors:**
- Verify database credentials in `.env`
- Check database server is running
- Ensure TypeORM entities are registered

**Temp files not cleaning up:**
- Verify cron job is running (check logs)
- Check `expiresAt` timestamps in database
- Ensure `@nestjs/schedule` is properly configured

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review migration guide for integration help

---

**Built with ❤️ using NestJS**
