import { db } from '@/db/database'

export const metaRepo = {
  async get<T>(key: string): Promise<T | undefined> {
    const row = await db.meta.get(key)
    return row?.value as T | undefined
  },
  async set(key: string, value: unknown) {
    await db.meta.put({ key, value })
  },
}

export const META_KEYS = {
  onboarded: 'onboarded',
  lastBackupAt: 'lastBackupAt',
} as const
