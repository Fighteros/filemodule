/* Storage interface */
export interface IStorage {
  /* Save a file to the temp storage */
  saveToTemp(fileBuffer: Buffer, key: string): Promise<{ path: string; physicalPath: string }>;

  /* Move a file from the temp storage to the final storage */
  moveTempToFinal(tempPath: string, finalKey: string): Promise<{ path: string; physicalPath: string }>;

  /* delete a path */
  delete(path: string): Promise<void>;
  /* get a signed URL (optional) */
  getSignedUrl(path: string, expiresSeconds?: number): Promise<string>;
}
