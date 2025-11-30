# Migration Guide: Copying Files and Storage Modules

This guide explains the easiest way to copy the `files` and `storage` modules from this project into a new NestJS project.

## 📋 Prerequisites

Your new project should have:
- NestJS framework installed
- TypeORM configured
- ConfigModule from `@nestjs/config` set up
- Database connection configured

## 📦 Required Dependencies

Install these packages in your new project:

```bash
npm install date-fns nanoid sanitize-filename
```

## 📁 Files to Copy

### 1. Storage Module (Copy these files/folders)

```
src/modules/storage/
├── storage.module.ts
├── interfaces/
│   └── storage.interface.ts
└── services/
    └── local.storage.ts
```

### 2. Files Module (Copy these files/folders)

```
src/modules/files/
├── files.module.ts
├── controller/
│   └── files.controller.ts
├── services/
│   └── files.service.ts
├── entities/
│   ├── file.entity.ts
│   └── temp-file.entity.ts
└── dto/
    ├── file-data.dto.ts
    ├── upload-files.dto.ts
    └── temp-file-response.dto.ts
```

### 3. Common Dependencies (Copy if not exists)

```
src/common/entities/
└── base.entity.ts
```

### 4. Configuration (Copy and integrate)

```
src/config/configs/
└── storage.config.ts
```

## 🔧 Step-by-Step Migration

### Step 1: Copy Storage Module

1. Copy the entire `src/modules/storage/` folder to your new project
2. Copy `src/config/configs/storage.config.ts` to your config folder
3. Register the storage config in your `ConfigModule`:

```typescript
// In your config.module.ts
import storageConfig, { storageValidationSchema } from './configs/storage.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [storageConfig], // Add this
      validationSchema: Joi.object().concat(storageValidationSchema), // Add this
    }),
  ],
})
export class ConfigModule {}
```

### Step 2: Copy Base Entity (if needed)

1. Copy `src/common/entities/base.entity.ts` to your new project
2. Ensure your project has the same path alias setup or update imports

### Step 3: Copy Files Module

1. Copy the entire `src/modules/files/` folder to your new project
2. Update path aliases in the copied files if your project uses different aliases

### Step 4: Update Imports

If your new project uses different path aliases, update imports in:

- `files.service.ts` - Update `@/modules/files/...` and `@/modules/storage/...` paths
- `files.controller.ts` - Update relative paths if needed
- `file.entity.ts` and `temp-file.entity.ts` - Update `@/common/entities/...` path
- `local.storage.ts` - Update relative paths if needed

### Step 5: Register Modules

Add both modules to your `app.module.ts`:

```typescript
import { StorageModule } from './modules/storage/storage.module';
import { FilesModule } from './modules/files/files.module';

@Module({
  imports: [
    // ... your other modules
    StorageModule,  // Add this (it's @Global, so available everywhere)
    FilesModule,    // Add this
  ],
})
export class AppModule {}
```

### Step 6: Configure Static File Serving (Optional)

If you want to serve files directly, add to your `app.module.ts`:

```typescript
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'storage'),
      serveRoot: '/storage',
    }),
    // ... other modules
  ],
})
export class AppModule {}
```

### Step 7: Environment Variables

Add to your `.env` file:

```env
STORAGE_BASE_DIR=storage
```

### Step 8: Database Migrations

Create TypeORM migrations for the entities:

```bash
# Generate migration
npm run typeorm migration:generate -- -n CreateFilesTables

# Or create manually with:
# - files table (from File entity)
# - temp_files table (from TempFile entity)
```

### Step 9: Create Storage Directories

Create the storage directory structure:

```bash
mkdir -p storage/temp
mkdir -p storage/files
```

## 🔍 Quick Copy Script (Alternative Method)

If you prefer a script-based approach, you can use this PowerShell script (Windows) or adapt it for bash:

```powershell
# Copy Storage Module
Copy-Item -Path "src/modules/storage" -Destination "NEW_PROJECT_PATH/src/modules/storage" -Recurse

# Copy Files Module
Copy-Item -Path "src/modules/files" -Destination "NEW_PROJECT_PATH/src/modules/files" -Recurse

# Copy Base Entity
Copy-Item -Path "src/common/entities/base.entity.ts" -Destination "NEW_PROJECT_PATH/src/common/entities/base.entity.ts"

# Copy Storage Config
Copy-Item -Path "src/config/configs/storage.config.ts" -Destination "NEW_PROJECT_PATH/src/config/configs/storage.config.ts"
```

## ⚠️ Important Notes

1. **Path Aliases**: This project uses `@/` as a path alias. Update `tsconfig.json` in your new project:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["src/*"]
       }
     }
   }
   ```

2. **Owner Fields**: The `File` entity has `ownerType` and `ownerId` columns. You may want to add relations or adjust these based on your needs.

3. **Storage Implementation**: Currently uses `LocalStorage`. You can implement `IStorage` interface for cloud storage (S3, Azure, etc.) and swap it in `StorageModule`.

4. **File Cleanup**: Consider setting up a scheduled task to call `cleanupExpiredTemps()` periodically.

## ✅ Verification Checklist

After copying, verify:

- [ ] All files copied successfully
- [ ] Dependencies installed (`date-fns`, `nanoid`, `sanitize-filename`)
- [ ] Modules registered in `app.module.ts`
- [ ] Storage config registered in `ConfigModule`
- [ ] Path aliases configured in `tsconfig.json`
- [ ] Database migrations created and run
- [ ] Storage directories created
- [ ] Environment variables set
- [ ] Imports updated (if path aliases differ)
- [ ] Application compiles without errors
- [ ] File upload endpoint works (`POST /files/temp`)

## 🚀 Testing

Test the integration:

```bash
# Upload a file
curl -X POST http://localhost:3000/files/temp \
  -F "files=@test-file.pdf"

# Get temp file
curl http://localhost:3000/files/temp/{temp-file-id}

# Delete temp file
curl -X DELETE http://localhost:3000/files/temp/{temp-file-id}
```

## 📝 Customization Options

- **Change storage location**: Update `STORAGE_BASE_DIR` in `.env`
- **Change temp file expiration**: Modify `addDays(new Date(), 1)` in `files.service.ts`
- **Add file validation**: Add validation in `files.controller.ts` or create a custom pipe
- **Implement cloud storage**: Create a new class implementing `IStorage` interface

