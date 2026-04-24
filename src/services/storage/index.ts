import { config } from '../../config/index.js';
import { SqliteStorage } from './sqlite.storage.js';
import type { IStorage } from '../../types/storage.types.js';

let instance: IStorage | null = null;

export function getStorage(): IStorage {
  if (!instance) {
    if (config.STORAGE_BACKEND === 'sqlite') {
      instance = new SqliteStorage(config.SQLITE_PATH);
    } else {
      throw new Error('postgres storage not yet implemented — use STORAGE_BACKEND=sqlite');
    }
  }
  return instance;
}
