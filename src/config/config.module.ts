import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import appConfig, { appValidationSchema } from './configs/app.config';
import databaseConfig, {
  databaseValidationSchema,
} from './configs/database.config';
import storageConfig, {
  storageValidationSchema,
} from './configs/storage.config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      load: [appConfig, databaseConfig, storageConfig],
      validationSchema: appValidationSchema
        .concat(databaseValidationSchema)
        .concat(storageValidationSchema),
    }),
  ],
})
export class ConfigModule {}
