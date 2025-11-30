# Configuration Guide

Complete guide to configuring the File Module.

## Environment Variables

### Application Configuration

**File:** `.env`

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

### Configuration Files

The application uses `@nestjs/config` with Joi validation. Configuration is organized in:

- `src/config/configs/app.config.ts` - Application settings
- `src/config/configs/database.config.ts` - Database configuration
- `src/config/configs/storage.config.ts` - Storage settings

## Application Configuration

### App Config (`app.config.ts`)

**Environment Variables:**

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `APP_NAME` | string | Yes | - | Application name |
| `NODE_ENV` | string | Yes | - | Environment (development, test, staging, production) |
| `PORT` | number | No | 8000 | Server port |
| `CORS_ORIGINS` | string | No | * | CORS allowed origins (comma-separated or `*`) |

**Example:**
```env
APP_NAME=filemodule
NODE_ENV=production
PORT=9000
CORS_ORIGINS=https://example.com,https://app.example.com
```

**Usage:**
```typescript
const appName = configService.get<string>('app.name');
const port = configService.get<number>('app.port');
```

## Database Configuration

### Database Config (`database.config.ts`)

**Supported Databases:**
- PostgreSQL
- MySQL
- MariaDB
- SQLite (development only)

**Environment Variables:**

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `DB_TYPE` | string | Yes | - | Database type (postgres, mysql, etc.) |
| `DB_HOST` | string | Yes | - | Database host |
| `DB_PORT` | number | Yes | - | Database port |
| `DB_USERNAME` | string | Yes | - | Database username |
| `DB_PASSWORD` | string | Yes | - | Database password |
| `DB_DATABASE` | string | Yes | - | Database name |
| `DB_SYNCHRONIZE` | boolean | No | false | Auto-sync schema (dev only) |
| `DB_LOGGING` | boolean | No | false | Enable query logging |

**Example:**
```env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=filemodule_user
DB_PASSWORD=secure_password
DB_DATABASE=filemodule_db
DB_SYNCHRONIZE=false
DB_LOGGING=false
```

**Production Recommendations:**
- Set `DB_SYNCHRONIZE=false` (use migrations)
- Set `DB_LOGGING=false` (or use query logger)
- Use connection pooling
- Configure SSL for remote databases

## Storage Configuration

### Storage Config (`storage.config.ts`)

**Environment Variables:**

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `STORAGE_BASE_DIR` | string | No | storage | Base directory for file storage |

**Example:**
```env
STORAGE_BASE_DIR=storage
```

**Storage Structure:**
```
{STORAGE_BASE_DIR}/
├── temp/          # Temporary files
└── files/         # Permanent files
    └── {ownerType}/
        └── {ownerId}/
            └── {filename}
```

**Usage:**
```typescript
const baseDir = configService.get<string>('storage.baseDir');
```

## Advanced Configuration

### Rate Limiting

Configured in `app.module.ts`:

```typescript
ThrottlerModule.forRoot([
  {
    ttl: 60,        // Time window in seconds
    limit: 120,     // Max requests per window
  },
])
```

**Customization:**
- Adjust `ttl` for time window
- Adjust `limit` for request limit
- Add per-route limits if needed

### File Upload Limits

Configure in `files.controller.ts`:

```typescript
@UseInterceptors(
  FilesInterceptor('files', {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB per file
      files: 5,                   // Max 5 files
    },
  })
)
```

**Options:**
- `fileSize`: Maximum file size in bytes
- `files`: Maximum number of files
- `fieldName`: Form field name (default: 'files')

### CORS Configuration

Configured in `main.ts`:

```typescript
app.enableCors({
  origin: allowAll ? true : origins,
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 3600,
});
```

**Environment Variable:**
```env
CORS_ORIGINS=https://example.com,https://app.example.com
# Or allow all:
CORS_ORIGINS=*
```

### Logging Configuration

Configured in `logger.config.ts`:

**Log Levels:**
- `error`: Errors only
- `warn`: Warnings and errors
- `info`: Info, warnings, and errors (default)
- `debug`: All logs

**Log Files:**
- `logs/{date}-combined.log`: All logs
- `logs/{date}-error.log`: Errors only

**Configuration:**
```typescript
// In logger.config.ts
const logLevel = process.env.LOG_LEVEL || 'info';
```

**Environment Variable:**
```env
LOG_LEVEL=debug
```

### Temp File Expiration

Configured in `files.service.ts`:

```typescript
const expiresAt = addDays(new Date(), 1); // 1 day default
```

**Customization:**
```typescript
// 7 days
const expiresAt = addDays(new Date(), 7);

// 1 hour
const expiresAt = addHours(new Date(), 1);
```

### Cleanup Schedule

Configured in `temp-cleanup.cron.ts`:

```typescript
@Cron(CronExpression.EVERY_DAY_AT_2AM)
```

**Cron Expressions:**
- `EVERY_DAY_AT_2AM`: Daily at 2 AM
- `EVERY_HOUR`: Every hour
- `EVERY_30_MINUTES`: Every 30 minutes
- Custom: `'0 2 * * *'` (cron syntax)

**Custom Schedule:**
```typescript
@Cron('0 */6 * * *') // Every 6 hours
```

## TypeScript Configuration

### Path Aliases

Configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

**Usage:**
```typescript
import { File } from '@/modules/files/entities/file.entity';
```

## Swagger Configuration

Configured in `docs.module.ts`:

```typescript
const config = new DocumentBuilder()
  .setTitle('File Module API')
  .setDescription('File management API documentation')
  .setVersion('1.0')
  .addTag('files')
  .build();
```

**Access:**
- Development: `http://localhost:9000/api/docs`
- Production: Disable or protect with authentication

## Internationalization

### i18n Configuration

Configured in `app.module.ts`:

```typescript
I18nModule.forRoot({
  fallbackLanguage: 'en',
  loaderOptions: {
    path: join(__dirname, '/i18n/'),
    watch: true,
  },
  resolvers: [AcceptLanguageResolver],
  throwOnMissingKey: false,
  logging: false,
})
```

**Translation Files:**
- `src/i18n/en/common.json`

**Adding Languages:**
1. Create `src/i18n/{lang}/common.json`
2. Add translations
3. Update `fallbackLanguage` if needed

## Production Configuration

### Recommended Settings

```env
# Application
NODE_ENV=production
PORT=9000
CORS_ORIGINS=https://yourdomain.com

# Database
DB_SYNCHRONIZE=false
DB_LOGGING=false

# Storage
STORAGE_BASE_DIR=/var/app/storage

# Logging
LOG_LEVEL=info
```

### Security Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure specific CORS origins
- [ ] Disable database synchronization
- [ ] Use strong database passwords
- [ ] Configure HTTPS
- [ ] Set up authentication
- [ ] Configure file size limits
- [ ] Set up monitoring
- [ ] Configure backups

### Storage Considerations

**Local Storage:**
- Ensure sufficient disk space
- Set up disk monitoring
- Configure backup strategy
- Use RAID for redundancy

**Cloud Storage:**
- Configure credentials securely
- Set up bucket policies
- Configure CDN
- Set up lifecycle policies

## Environment-Specific Configs

### Development

```env
NODE_ENV=development
DB_SYNCHRONIZE=true
DB_LOGGING=true
LOG_LEVEL=debug
CORS_ORIGINS=*
```

### Staging

```env
NODE_ENV=staging
DB_SYNCHRONIZE=false
DB_LOGGING=true
LOG_LEVEL=info
CORS_ORIGINS=https://staging.example.com
```

### Production

```env
NODE_ENV=production
DB_SYNCHRONIZE=false
DB_LOGGING=false
LOG_LEVEL=warn
CORS_ORIGINS=https://example.com
```

## Configuration Validation

All configuration is validated using Joi schemas. Invalid configuration will cause the application to fail at startup.

**Validation Errors:**
```
Error: Config validation error: "APP_NAME" is required
```

**Fix:**
- Check `.env` file
- Ensure all required variables are set
- Verify variable types match expected types

## Configuration Best Practices

1. **Never commit `.env` files**
2. **Use `.env.example` as template**
3. **Validate all configuration**
4. **Use environment-specific configs**
5. **Document all configuration options**
6. **Use secrets management in production**
7. **Rotate credentials regularly**
8. **Monitor configuration changes**

## Troubleshooting

### Configuration Not Loading

**Symptoms:**
- Default values used
- Validation errors

**Solutions:**
- Check `.env` file exists
- Verify file location (project root)
- Check variable names (case-sensitive)
- Restart application

### Database Connection Issues

**Symptoms:**
- Connection timeout
- Authentication errors

**Solutions:**
- Verify database credentials
- Check database server is running
- Verify network connectivity
- Check firewall rules

### Storage Issues

**Symptoms:**
- Files not saving
- Permission errors

**Solutions:**
- Check directory permissions
- Verify `STORAGE_BASE_DIR` exists
- Check disk space
- Verify write permissions

---

For more information, see:
- [API Documentation](./API.md)
- [Architecture Guide](./ARCHITECTURE.md)
- [Development Guide](./DEVELOPMENT.md)

