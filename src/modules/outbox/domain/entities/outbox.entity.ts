import { Column, Entity } from 'typeorm';
import { Base } from '@/common/entities/base.entity';

export enum OutboxType {
  MOVE_FILES = 'MOVE_FILES',
}

export enum OutboxStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('outbox')
export class Outbox extends Base {
  @Column({
    name: 'type',
    type: 'enum',
    enum: OutboxType,
  })
  type: OutboxType;

  @Column({ name: 'payload', type: 'jsonb' })
  payload: Record<string, any>;

  @Column({
    name: 'status',
    type: 'enum',
    enum: OutboxStatus,
    default: OutboxStatus.PENDING,
  })
  status: OutboxStatus;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt: Date | null;
}

