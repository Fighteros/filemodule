import { Base } from "@/common/entities/base.entity";
import { Column, Entity } from "typeorm";

export enum TempFileStatus {
  PENDING = "PENDING",
  ASSIGNED = "ASSIGNED",
  MOVED = "MOVED",
}

@Entity("temp_files")
export class TempFile extends Base {
  @Column({ name: "key", type: "varchar", length: 500 })
  key: string;

  @Column({ name: "presigned_url", type: "text", nullable: true })
  url: string | null;

  @Column({ name: "file_size", type: "bigint" })
  size: number;

  @Column({ name: "uploaded", type: "boolean", default: false })
  uploaded: boolean;

  @Column({
    name: "status",
    type: "enum",
    enum: TempFileStatus,
    default: TempFileStatus.PENDING,
  })
  status: TempFileStatus;

  @Column({ name: "final_key", type: "varchar", length: 500, nullable: true })
  finalKey: string | null;
}
