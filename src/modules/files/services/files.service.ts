/* Main service to create temp files, commit them, and cleanup. */
import { File } from '@/modules/files/entities/file.entity';
import { TempFile } from '@/modules/files/entities/temp-file.entity';
import { LocalStorage } from '@/modules/storage/services/local.storage';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays } from 'date-fns';
import { DataSource, LessThan, Repository } from 'typeorm';

@Injectable()
export class FilesService {
  constructor(
    private dataSource: DataSource,
    private storage: LocalStorage,
    @InjectRepository(TempFile)
    private tempRepo: Repository<TempFile>,
    @InjectRepository(File)
    private fileRepo: Repository<File>,
  ) {}

  /* Create temp file entries and store bytes in storage */
  async createTempFiles(
    files: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    }[],
  ) {
    const created: {
      id: string;
      url: string;
      originalName: string;
      size: number;
      mime: string;
    }[] = [];
    for (const f of files) {
      const key = this.storage.createSafeFilename(f.originalname);
      const path = await this.storage.saveToTemp(f.buffer, key);
      const expiresAt = addDays(new Date(), 1); /* 1 day */
      const temp = this.tempRepo.create({
        originalName: f.originalname,
        path,
        size: f.size,
        mime: f.mimetype,
        expiresAt,
      });
      const savedTemp = await this.tempRepo.save(temp);
      const url = await this.storage.getSignedUrl(path);
      created.push({
        id: savedTemp.id,
        url,
        originalName: f.originalname,
        size: f.size,
        mime: f.mimetype,
      });
    }
    return created;
  }

  /* Attach a list of temp IDs to a new owner (within a transaction) */
  async commitFilesToOwner(
    ownerType: string,
    ownerId: string,
    tempIds: string[],
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const temps = await queryRunner.manager.findByIds(TempFile, tempIds);
      /* validate all found */
      if (temps.length !== tempIds.length) {
        throw new Error('Some temp files not found');
      }

      const resultFiles: File[] = [];
      for (const t of temps) {
        const finalKey = `${ownerType}/${ownerId}/${t.id}-${t.originalName}`;
        const finalPath = await this.storage.moveTempToFinal(t.path, finalKey);

        const fileEntity = queryRunner.manager.create(File, {
          originalName: t.originalName,
          path: finalPath,
          size: t.size,
          mime: t.mime,
          ownerType,
          ownerId,
          meta: t.meta,
        });
        const saved = await queryRunner.manager.save(fileEntity);
        resultFiles.push(saved);

        await queryRunner.manager.delete(TempFile, { id: t.id });
      }

      await queryRunner.commitTransaction();
      return resultFiles;
    } catch (err) {
      /* Attempt to rollback and attempt compensation (best-effort) */
      await queryRunner.rollbackTransaction();
      /* Note: if storage move already occurred, a background cleanup can handle or we can attempt to delete moved files if we tracked them. */
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /* periodic cleanup for expired temp files */
  async cleanupExpiredTemps() {
    const expired = await this.tempRepo.find({
      where: { expiresAt: LessThan(new Date()) },
    }); /* adapt to TypeORM query builder */
    for (const t of expired) {
      try {
        await this.storage.delete(t.path);
      } catch (e) {
        /* ignore for now */
      }
      await this.tempRepo.delete({ id: t.id });
    }
  }

  /* get signed url for permanent file (optional) */
  async getFileSignedUrl(fileId: string) {
    const file = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!file) {
      return null;
    }
    return this.storage.getSignedUrl(file.path);
  }
}
