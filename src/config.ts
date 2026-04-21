export const GAME_CONFIG = {
  BOARD_SIZE: 10,
  MINES_COUNT: 15,
  RECORDS_LIMIT: 10,
  RECORDS_STORAGE_KEY: 'vue-miner-records',
} as const

export const NUMBER_COLORS: Record<number, string> = {
  1: '#3b82f6',
  2: '#22c55e',
  3: '#ef4444',
  4: '#8b5cf6',
  5: '#f59e0b',
  6: '#06b6d4',
  7: '#1e293b',
  8: '#64748b',
} as const
