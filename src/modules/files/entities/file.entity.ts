/* Persistent File record that links to business entities */
import { Base } from '@/common/entities/base.entity';
import { Column, Entity } from 'typeorm';

@Entity('files')
export class File extends Base {
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

  @Column()
  ownerType: string; // e.g. 'order'

  @Column({ type: 'uuid' })
  ownerId: string;

  @Column({ type: 'jsonb', nullable: true })
  meta?: any;
}
