#!/bin/bash
# Bash script to copy Files and Storage modules to a new project
# Usage: ./copy-modules.sh /path/to/new/project

set -e

if [ -z "$1" ]; then
    echo "❌ Error: Target path is required"
    echo "Usage: ./copy-modules.sh /path/to/new/project"
    exit 1
fi

TARGET_PATH="$1"
SOURCE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Starting module copy process..."

# Validate source paths
STORAGE_MODULE="$SOURCE_ROOT/src/modules/storage"
FILES_MODULE="$SOURCE_ROOT/src/modules/files"
BASE_ENTITY="$SOURCE_ROOT/src/common/entities/base.entity.ts"
STORAGE_CONFIG="$SOURCE_ROOT/src/config/configs/storage.config.ts"

if [ ! -d "$STORAGE_MODULE" ]; then
    echo "❌ Error: Storage module not found at: $STORAGE_MODULE"
    exit 1
fi

if [ ! -d "$FILES_MODULE" ]; then
    echo "❌ Error: Files module not found at: $FILES_MODULE"
    exit 1
fi

# Create target directory if it doesn't exist
mkdir -p "$TARGET_PATH/src"

# Copy Storage Module
echo "📦 Copying Storage Module..."
cp -r "$STORAGE_MODULE" "$TARGET_PATH/src/modules/"
echo "   ✓ Storage module copied"

# Copy Files Module
echo "📦 Copying Files Module..."
cp -r "$FILES_MODULE" "$TARGET_PATH/src/modules/"
echo "   ✓ Files module copied"

# Copy Base Entity
echo "📦 Copying Base Entity..."
mkdir -p "$TARGET_PATH/src/common/entities"
cp "$BASE_ENTITY" "$TARGET_PATH/src/common/entities/"
echo "   ✓ Base entity copied"

# Copy Storage Config
echo "📦 Copying Storage Config..."
mkdir -p "$TARGET_PATH/src/config/configs"
cp "$STORAGE_CONFIG" "$TARGET_PATH/src/config/configs/"
echo "   ✓ Storage config copied"

echo ""
echo "✅ Copy completed successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Install dependencies: npm install date-fns nanoid sanitize-filename"
echo "   2. Register StorageModule and FilesModule in app.module.ts"
echo "   3. Register storage.config.ts in ConfigModule"
echo "   4. Update path aliases in tsconfig.json if needed"
echo "   5. Create database migrations for File and TempFile entities"
echo "   6. Create storage directories: mkdir -p storage/temp storage/files"
echo "   7. Add STORAGE_BASE_DIR=storage to .env file"
echo ""
echo "📖 See MIGRATION_GUIDE.md for detailed instructions"

