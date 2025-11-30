import * as Joi from 'joi';

import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  baseDir: process.env.STORAGE_BASE_DIR ?? 'storage',
}));

export const storageValidationSchema = Joi.object({
  STORAGE_BASE_DIR: Joi.string().default('storage'),
});
