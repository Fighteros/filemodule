# Development Guide

Guide for developers working on the File Module.

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL, MySQL, or compatible database
- Git
- IDE with TypeScript support (VS Code recommended)

### Initial Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd filemodule
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up database:**
   ```bash
   # Create database
   createdb filemodule_db

   # Or using MySQL
   mysql -u root -p
   CREATE DATABASE filemodule_db;
   ```

5. **Run migrations (if using):**
   ```bash
   npm run typeorm migration:run
   ```

6. **Create storage directories:**
   ```bash
   mkdir -p storage/temp
   mkdir -p storage/files
   ```

7. **Start development server:**
   ```bash
   npm run start:dev
   ```

## Development Scripts

### Available Commands

```bash
# Development
npm run start:dev      # Start with hot-reload
npm run start:debug    # Start with debugging enabled

# Building
npm run build          # Build for production
npm run clean          # Clean build directory

# Testing
npm run test           # Run unit tests
npm run test:watch     # Run tests in watch mode
npm run test:cov       # Run tests with coverage
npm run test:e2e       # Run end-to-end tests
npm run test:debug     # Run tests with debugging

# Code Quality
npm run lint           # Lint code
npm run format         # Format code with Prettier
```

## Project Structure

```
filemodule/
├── src/
│   ├── app.module.ts           # Root module
│   ├── main.ts                 # Application entry point
│   │
│   ├── modules/                # Feature modules
│   │   ├── files/              # File management module
│   │   │   ├── controller/     # REST controllers
│   │   │   ├── services/       # Business logic
│   │   │   ├── entities/       # TypeORM entities
│   │   │   ├── dto/            # Data transfer objects
│   │   │   └── files.module.ts
│   │   │
│   │   ├── storage/            # Storage abstraction
│   │   │   ├── interfaces/     # Storage interface
│   │   │   ├── services/       # Storage implementations
│   │   │   └── storage.module.ts
│   │   │
│   │   └── database/           # Database configuration
│   │
│   ├── config/                 # Configuration
│   │   ├── config.module.ts
│   │   └── configs/            # Config files
│   │
│   ├── core/                   # Core features
│   │   ├── filters/            # Exception filters
│   │   ├── interceptors/       # Request/response interceptors
│   │   └── pipes/              # Validation pipes
│   │
│   ├── common/                 # Shared utilities
│   │   ├── dto/                # Common DTOs
│   │   ├── entities/          # Base entities
│   │   └── logger/             # Logging configuration
│   │
│   └── docs/                   # Swagger configuration
│
├── test/                       # E2E tests
├── storage/                    # File storage
├── logs/                       # Log files
├── dist/                       # Compiled output
└── docs/                       # Documentation
```

## Code Style

### TypeScript Guidelines

- Use TypeScript strict mode
- Prefer interfaces over types for object shapes
- Use `async/await` over promises
- Use dependency injection
- Follow NestJS conventions

### Naming Conventions

- **Files:** kebab-case (e.g., `files.service.ts`)
- **Classes:** PascalCase (e.g., `FilesService`)
- **Variables/Functions:** camelCase (e.g., `createTempFiles`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`)
- **Interfaces:** PascalCase with `I` prefix (e.g., `IStorage`)

### File Organization

- One class per file
- Related files in same directory
- Use index files for exports when appropriate
- Group by feature, not by type

### Example Structure

```typescript
// files.service.ts
import { Injectable } from '@nestjs/common';
import { FilesRepository } from './files.repository';

@Injectable()
export class FilesService {
  constructor(private repository: FilesRepository) {}

  async createTempFiles(files: FileDataDto[]) {
    // Implementation
  }
}
```

## Adding New Features

### Adding a New Endpoint

1. **Update Controller:**
   ```typescript
   @Get('custom')
   @ApiOperation({ summary: 'Custom endpoint' })
   async customMethod() {
     return this.filesService.customMethod();
   }
   ```

2. **Add Service Method:**
   ```typescript
   async customMethod() {
     // Implementation
   }
   ```

3. **Add DTOs (if needed):**
   ```typescript
   export class CustomDto {
     @IsString()
     field: string;
   }
   ```

4. **Update Swagger:**
   - Add `@ApiTags` if new tag needed
   - Add `@ApiOperation` for description
   - Add `@ApiResponse` for responses

### Adding Storage Provider

1. **Implement Interface:**
   ```typescript
   @Injectable()
   export class S3Storage implements IStorage {
     async saveToTemp(buffer: Buffer, key: string) {
       // S3 implementation
     }
     // ... other methods
   }
   ```

2. **Register in Module:**
   ```typescript
   @Module({
     providers: [
       {
         provide: IStorage,
         useClass: S3Storage, // Or use factory
       },
     ],
   })
   ```

3. **Add Configuration:**
   ```typescript
   // storage.config.ts
   export default registerAs('storage', () => ({
     provider: process.env.STORAGE_PROVIDER || 'local',
     s3: {
       bucket: process.env.S3_BUCKET,
       // ...
     },
   }));
   ```

### Adding Validation

1. **Create Custom Pipe:**
   ```typescript
   @Injectable()
   export class FileTypeValidationPipe implements PipeTransform {
     transform(value: Express.Multer.File) {
       const allowedTypes = ['image/jpeg', 'image/png'];
       if (!allowedTypes.includes(value.mimetype)) {
         throw new BadRequestException('File type not allowed');
       }
       return value;
     }
   }
   ```

2. **Use in Controller:**
   ```typescript
   @Post('upload')
   @UsePipes(new FileTypeValidationPipe())
   async upload(@UploadedFile() file: Express.Multer.File) {
     // ...
   }
   ```

## Testing

### Unit Tests

**Location:** `src/**/*.spec.ts`

**Example:**
```typescript
describe('FilesService', () => {
  let service: FilesService;
  let repository: Repository<TempFile>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FilesService,
        {
          provide: getRepositoryToken(TempFile),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
  });

  it('should create temp files', async () => {
    const files = [{ buffer: Buffer.from('test'), ... }];
    const result = await service.createTempFiles(files);
    expect(result).toHaveLength(1);
  });
});
```

### E2E Tests

**Location:** `test/app.e2e-spec.ts`

**Example:**
```typescript
describe('Files (e2e)', () => {
  it('/files/temp (POST)', () => {
    return request(app.getHttpServer())
      .post('/v1/files/temp')
      .attach('files', './test/fixtures/test-file.pdf')
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveLength(1);
        expect(res.body[0]).toHaveProperty('id');
      });
  });
});
```

### Running Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## Debugging

### VS Code Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug NestJS",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "console": "integratedTerminal",
      "restart": true,
      "protocol": "inspector"
    }
  ]
}
```

### Debugging Tips

1. **Use Logger:**
   ```typescript
   this.logger.debug('Debug message', { data });
   ```

2. **Breakpoints:**
   - Set breakpoints in VS Code
   - Use `debugger;` statement

3. **Request Tracing:**
   - Use `X-Request-Id` header
   - Check logs for request ID

## Database Migrations

### Generate Migration

```bash
npm run typeorm migration:generate -- -n MigrationName
```

### Run Migrations

```bash
npm run typeorm migration:run
```

### Revert Migration

```bash
npm run typeorm migration:revert
```

### Manual Migration Example

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFilesTables1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "files" (
        "id" uuid PRIMARY KEY,
        "originalName" varchar NOT NULL,
        -- ... other columns
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "files"`);
  }
}
```

## Git Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Development branch
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches

### Commit Messages

Follow conventional commits:

```
feat: add S3 storage support
fix: resolve file deletion issue
docs: update API documentation
refactor: improve error handling
test: add unit tests for FilesService
```

### Pull Request Process

1. Create feature branch
2. Make changes
3. Write tests
4. Update documentation
5. Create pull request
6. Address review comments
7. Merge after approval

## Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console.logs or debug code
- [ ] Error handling implemented
- [ ] Security considerations addressed
- [ ] Performance implications considered
- [ ] Backward compatibility maintained

## Common Tasks

### Adding a New Dependency

```bash
npm install package-name
npm install -D @types/package-name  # If types needed
```

### Updating Dependencies

```bash
npm update
npm audit fix
```

### Checking for Issues

```bash
npm run lint
npm run test
npm run build
```

## Troubleshooting

### Common Issues

**Module not found:**
- Check path aliases in `tsconfig.json`
- Verify imports use correct paths
- Restart TypeScript server

**Database connection errors:**
- Verify `.env` configuration
- Check database is running
- Verify credentials

**File upload not working:**
- Check storage directory exists
- Verify permissions
- Check file size limits

**Tests failing:**
- Clear test cache: `npm test -- --clearCache`
- Check test database configuration
- Verify mocks are set up correctly

## Performance Optimization

### Database Queries

- Use indexes on frequently queried fields
- Avoid N+1 queries
- Use query builder for complex queries
- Consider caching for read-heavy operations

### File Operations

- Use streams for large files
- Implement file size limits
- Consider async processing for large uploads
- Use CDN for file serving

### Memory Management

- Release file buffers after processing
- Implement cleanup for temp files
- Monitor memory usage
- Use connection pooling

## Security Best Practices

1. **Input Validation:**
   - Validate all inputs
   - Sanitize filenames
   - Check file types

2. **Error Handling:**
   - Don't expose sensitive information
   - Log errors securely
   - Return generic error messages

3. **File Security:**
   - Validate file types
   - Scan for viruses (if needed)
   - Limit file sizes
   - Use signed URLs

4. **Authentication:**
   - Add authentication middleware
   - Implement authorization
   - Use rate limiting

## Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

For more information, see:
- [API Documentation](./API.md)
- [Architecture Guide](./ARCHITECTURE.md)
- [Configuration Guide](./CONFIGURATION.md)

