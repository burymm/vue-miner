import { computed, ref } from 'vue';
import { GAME_CONFIG } from '../config';

const { BOARD_SIZE, MINES_COUNT, RECORDS_LIMIT, RECORDS_STORAGE_KEY } = GAME_CONFIG;

type Cell = {
  row: number
  col: number
  hasMine: boolean
  isOpen: boolean
  isFlagged: boolean
  adjacentMines: number
};

type RecordEntry = {
  seconds: number
  playedAt: string
};

const directions = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
] as const;

function loadRecords(): RecordEntry[] {
  const raw = localStorage.getItem(RECORDS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((record) => {
        return typeof record.seconds === 'number' && typeof record.playedAt === 'string';
      })
      .slice(0, RECORDS_LIMIT);
  } catch {
    return [];
  }
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function createCell(row: number, col: number): Cell {
  return {
    row,
    col,
    hasMine: false,
    isOpen: false,
    isFlagged: false,
    adjacentMines: 0,
  };
}

function calculateAdjacentMines(board: Cell[][], row: number, col: number): number {
  let count = 0;
  for (const [dr, dc] of directions) {
    const nextRow = row + dr;
    const nextCol = col + dc;
    if (inBounds(nextRow, nextCol) && board[nextRow][nextCol].hasMine) {
      count += 1;
    }
  }
  return count;
}

function createBoardWithMines(excludeRow?: number, excludeCol?: number): Cell[][] {
  const board = Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: BOARD_SIZE }, (_, col) => createCell(row, col)),
  );

  // Place mines, excluding the first clicked cell and its neighbors if specified
  let placed = 0;
  while (placed < MINES_COUNT) {
    const row = Math.floor(Math.random() * BOARD_SIZE);
    const col = Math.floor(Math.random() * BOARD_SIZE);
    const cell = board[row][col];

    // Skip if cell already has a mine or is in the safe zone (first click area)
    if (cell.hasMine) {
      continue;
    }

    // If exclude coordinates provided, skip cells in that area
    if (excludeRow !== undefined && excludeCol !== undefined) {
      const isSafeZone = Math.abs(row - excludeRow) <= 1 && Math.abs(col - excludeCol) <= 1;
      if (isSafeZone) {
        continue;
      }
    }

    cell.hasMine = true;
    placed += 1;
  }

  // Calculate adjacent mines for all cells
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const cell = board[row][col];
      if (!cell.hasMine) {
        cell.adjacentMines = calculateAdjacentMines(board, row, col);
      }
    }
  }

  return board;
}

function createEmptyBoard(): Cell[][] {
  const board = Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: BOARD_SIZE }, (_, col) => createCell(row, col)),
  );

  // Calculate adjacent mines (will be 0 until mines are placed)
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      board[row][col].adjacentMines = 0;
    }
  }

  return board;
}

export function useMinesweeper() {
  const gameOver = ref(false);
  const isWin = ref(false);
  const isFirstClick = ref(true);
  const board = ref<Cell[][]>(createEmptyBoard());
  const startedAt = ref<number | null>(null);
  const endedAt = ref<number | null>(null);
  const records = ref<RecordEntry[]>(loadRecords());

  // Optimized: track flags count as ref instead of computing
  const flagsCount = ref(0);

  const elapsedSeconds = computed(() => {
    if (!startedAt.value) {
      return 0;
    }
    const end = endedAt.value ?? Date.now();
    return Math.floor((end - startedAt.value) / 1000);
  });

  const minesLeft = computed(() => {
    return Math.max(MINES_COUNT - flagsCount.value, 0);
  });

  const statusText = computed(() => {
    if (isWin.value) {
      return 'Победа! Все мины найдены';
    }
    if (gameOver.value) {
      return 'Бум! Ты наступил на мину';
    }
    return 'ЛКМ: открыть, ПКМ: поставить флаг';
  });

  function persistRecords(): void {
    localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records.value));
  }

  function saveRecord(seconds: number): void {
    const nextRecords = [
      ...records.value,
      {
        seconds,
        playedAt: new Date().toISOString(),
      },
    ]
      .sort((a, b) => a.seconds - b.seconds)
      .slice(0, RECORDS_LIMIT);

    records.value = nextRecords;
    persistRecords();
  }

  function clearRecords(): void {
    records.value = [];
    localStorage.removeItem(RECORDS_STORAGE_KEY);
  }

  function formatPlayedAt(dateISO: string): string {
    return new Date(dateISO).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function revealAllMines(): void {
    for (const row of board.value) {
      for (const cell of row) {
        if (cell.hasMine) {
          cell.isOpen = true;
        }
      }
    }
  }

  function openZeroArea(startRow: number, startCol: number): void {
    const queue: Array<[number, number]> = [[startRow, startCol]];

    while (queue.length > 0) {
      const [row, col] = queue.shift()!;
      const cell = board.value[row][col];

      if (cell.isOpen || cell.isFlagged) {
        continue;
      }

      cell.isOpen = true;

      // Only expand if no adjacent mines
      if (cell.adjacentMines !== 0) {
        continue;
      }

      for (const [dr, dc] of directions) {
        const nextRow = row + dr;
        const nextCol = col + dc;
        if (!inBounds(nextRow, nextCol)) {
          continue;
        }
        const nextCell = board.value[nextRow][nextCol];
        if (!nextCell.isOpen && !nextCell.hasMine) {
          queue.push([nextRow, nextCol]);
        }
      }
    }
  }

  function checkWinCondition(): void {
    for (const row of board.value) {
      for (const cell of row) {
        if (!cell.hasMine && !cell.isOpen) {
          return;
        }
      }
    }

    isWin.value = true;
    endedAt.value = Date.now();
    saveRecord(elapsedSeconds.value);
  }

  function placeMinesOnFirstClick(row: number, col: number): void {
    board.value = createBoardWithMines(row, col);
    isFirstClick.value = false;
    startedAt.value = Date.now();
  }

  function handleCellClick(row: number, col: number): void {
    if (gameOver.value || isWin.value) {
      return;
    }

    const cell = board.value[row][col];
    if (cell.isFlagged || cell.isOpen) {
      return;
    }

    // Handle first click - place mines safely
    if (isFirstClick.value) {
      placeMinesOnFirstClick(row, col);
    }

    if (cell.hasMine) {
      cell.isOpen = true;
      gameOver.value = true;
      endedAt.value = Date.now();
      revealAllMines();
      return;
    }

    if (cell.adjacentMines === 0) {
      openZeroArea(row, col);
    } else {
      cell.isOpen = true;
    }

    checkWinCondition();
  }

  function handleCellRightClick(event: MouseEvent, row: number, col: number): void {
    event.preventDefault();

    if (gameOver.value || isWin.value) {
      return;
    }

    const cell = board.value[row][col];
    if (cell.isOpen) {
      return;
    }

    // Update flags count incrementally
    if (cell.isFlagged) {
      flagsCount.value -= 1;
    } else {
      flagsCount.value += 1;
    }

    cell.isFlagged = !cell.isFlagged;
    checkWinCondition();
  }

  function resetGame(): void {
    board.value = createEmptyBoard();
    gameOver.value = false;
    isWin.value = false;
    isFirstClick.value = true;
    flagsCount.value = 0;
    startedAt.value = null;
    endedAt.value = null;
  }

  function getCellAriaLabel(cell: Cell): string {
    if (cell.isOpen) {
      if (cell.hasMine) {
        return 'Мина';
      }
      if (cell.adjacentMines > 0) {
        return `${cell.adjacentMines} мин${cell.adjacentMines === 1 ? 'а' : cell.adjacentMines < 5 ? 'ы' : ''} вокруг`;
      }
      return 'Пусто';
    }
    if (cell.isFlagged) {
      return 'Флаг';
    }
    return 'Закрыто';
  }

  function getNumberColor(num: number): string | undefined {
    if (num >= 1 && num <= 8) {
      return {
        1: '#3b82f6',
        2: '#22c55e',
        3: '#ef4444',
        4: '#8b5cf6',
        5: '#f59e0b',
        6: '#06b6d4',
        7: '#1e293b',
        8: '#64748b',
      }[num];
    }
    return undefined;
  }

  return {
    // State
    gameOver,
    isWin,
    board,
    elapsedSeconds,
    minesLeft,
    flagsCount,
    records,
    statusText,

    // Actions
    handleCellClick,
    handleCellRightClick,
    resetGame,
    clearRecords,
    formatPlayedAt,
    getCellAriaLabel,
    getNumberColor,
  };
}
