import { Global, Module } from '@nestjs/common';
import { LocalStorage } from './services/local.storage';

@Module({
  providers: [LocalStorage],
  exports: [LocalStorage],
})
@Global()
export class StorageModule {}
