/* Main service to create temp files, commit them, and cleanup. */
import { FileDataDto } from '@/modules/files/dto/file-data.dto';
import { File } from '@/modules/files/entities/file.entity';
import { TempFile } from '@/modules/files/entities/temp-file.entity';
import { LocalStorage } from '@/modules/storage/services/local.storage';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays } from 'date-fns';
import { DataSource, In, LessThan, Repository } from 'typeorm';

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
  async createTempFiles(files: FileDataDto[]) {
    const created: {
      id: string;
      url: string;
      originalName: string;
      size: number;
      mime: string;
    }[] = [];
    for (const f of files) {
      const key = this.storage.createSafeFilename(f.originalname);
      const { path, physicalPath } = await this.storage.saveToTemp(
        f.buffer,
        key,
      );
      const expiresAt = addDays(new Date(), 1); /* 1 day */
      const temp = this.tempRepo.create({
        originalName: f.originalname,
        path,
        physicalPath,
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
      const temps = await queryRunner.manager.find(TempFile, {
        where: { id: In(tempIds) },
      });
      /* validate all found */
      if (temps.length !== tempIds.length) {
        throw new NotFoundException('errors.notFound');
      }

      const resultFiles: File[] = [];
      for (const t of temps) {
        const finalKey = `${ownerType}/${ownerId}/${this.storage.createSafeFilename(t.originalName)}`;
        const finalPath = await this.storage.moveTempToFinal(
          t.physicalPath,
          finalKey,
        );

        const fileEntity = queryRunner.manager.create(File, {
          originalName: t.originalName,
          path: finalPath.path,
          physicalPath: finalPath.physicalPath,
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
        await this.storage.delete(t.physicalPath);
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

  async getTempFile(id: string) {
    const temp = await this.tempRepo.findOne({ where: { id } });
    if (!temp) {
      throw new NotFoundException('errors.notFound');
    }
    return { url: await this.storage.getSignedUrl(temp.path) };
  }

  async deleteTempFile(id: string) {
    const temp = await this.tempRepo.findOne({ where: { id } });
    if (!temp) {
      throw new NotFoundException('errors.notFound');
    }
    await this.storage.delete(temp.physicalPath);
    await this.tempRepo.delete({ id });
  }
}
