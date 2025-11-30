/* TempFile entity to track uploaded-but-uncommitted files */
import { Base } from '@/common/entities/base.entity';
import { Column, Entity } from 'typeorm';

@Entity('temp_files')
export class TempFile extends Base {
  @Column()
  originalName: string;

  @Column()
  path: string; // client path

  @Column()
  physicalPath: string; // storage path

  @Column({ type: 'bigint' })
  size: number;

  @Column()
  mime: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  meta?: any;
}
