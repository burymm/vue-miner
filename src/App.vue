<script setup>
import { computed, ref } from 'vue'

const BOARD_SIZE = 10
const MINES_COUNT = 15
const RECORDS_LIMIT = 10
const RECORDS_STORAGE_KEY = 'vue-miner-records'

const gameOver = ref(false)
const isWin = ref(false)
const board = ref([])
const startedAt = ref(null)
const endedAt = ref(null)
const records = ref(loadRecords())

const directions = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
]

const elapsedSeconds = computed(() => {
  if (!startedAt.value) {
    return 0
  }
  const end = endedAt.value ?? Date.now()
  return Math.floor((end - startedAt.value) / 1000)
})

const flagsPlaced = computed(() => {
  return board.value.flat().filter((cell) => cell.isFlagged).length
})

const minesLeft = computed(() => {
  return Math.max(MINES_COUNT - flagsPlaced.value, 0)
})

const statusText = computed(() => {
  if (isWin.value) {
    return 'Победа! Все мины найдены'
  }
  if (gameOver.value) {
    return 'Бум! Ты наступил на мину'
  }
  return 'ЛКМ: открыть, ПКМ: поставить флаг'
})

function loadRecords() {
  const raw = localStorage.getItem(RECORDS_STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter((record) => {
        return typeof record.seconds === 'number' && typeof record.playedAt === 'string'
      })
      .slice(0, RECORDS_LIMIT)
  } catch {
    return []
  }
}

function persistRecords() {
  localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records.value))
}

function saveRecord(seconds) {
  const nextRecords = [
    ...records.value,
    {
      seconds,
      playedAt: new Date().toISOString(),
    },
  ]
    .sort((a, b) => a.seconds - b.seconds)
    .slice(0, RECORDS_LIMIT)

  records.value = nextRecords
  persistRecords()
}

function clearRecords() {
  records.value = []
  localStorage.removeItem(RECORDS_STORAGE_KEY)
}

function formatPlayedAt(dateISO) {
  return new Date(dateISO).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function inBounds(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE
}

function createCell(row, col) {
  return {
    row,
    col,
    hasMine: false,
    isOpen: false,
    isFlagged: false,
    adjacentMines: 0,
  }
}

function resetGame() {
  const nextBoard = Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: BOARD_SIZE }, (_, col) => createCell(row, col)),
  )

  let placed = 0
  while (placed < MINES_COUNT) {
    const row = Math.floor(Math.random() * BOARD_SIZE)
    const col = Math.floor(Math.random() * BOARD_SIZE)
    const cell = nextBoard[row][col]

    if (!cell.hasMine) {
      cell.hasMine = true
      placed += 1
    }
  }

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const cell = nextBoard[row][col]
      if (cell.hasMine) {
        continue
      }

      let around = 0
      for (const [dr, dc] of directions) {
        const nextRow = row + dr
        const nextCol = col + dc
        if (inBounds(nextRow, nextCol) && nextBoard[nextRow][nextCol].hasMine) {
          around += 1
        }
      }
      cell.adjacentMines = around
    }
  }

  board.value = nextBoard
  gameOver.value = false
  isWin.value = false
  startedAt.value = Date.now()
  endedAt.value = null
}

function revealAllMines() {
  for (const row of board.value) {
    for (const cell of row) {
      if (cell.hasMine) {
        cell.isOpen = true
      }
    }
  }
}

function openZeroArea(startRow, startCol) {
  const queue = [[startRow, startCol]]

  while (queue.length > 0) {
    const [row, col] = queue.shift()
    const cell = board.value[row][col]

    if (cell.isOpen || cell.isFlagged) {
      continue
    }

    cell.isOpen = true
    if (cell.adjacentMines !== 0) {
      continue
    }

    for (const [dr, dc] of directions) {
      const nextRow = row + dr
      const nextCol = col + dc
      if (!inBounds(nextRow, nextCol)) {
        continue
      }
      const nextCell = board.value[nextRow][nextCol]
      if (!nextCell.isOpen && !nextCell.hasMine) {
        queue.push([nextRow, nextCol])
      }
    }
  }
}

function checkWinCondition() {
  for (const row of board.value) {
    for (const cell of row) {
      if (!cell.hasMine && !cell.isOpen) {
        return false
      }
    }
  }

  isWin.value = true
  endedAt.value = Date.now()
  saveRecord(elapsedSeconds.value)
  return true
}

function handleCellClick(row, col) {
  if (gameOver.value || isWin.value) {
    return
  }

  const cell = board.value[row][col]
  if (cell.isFlagged || cell.isOpen) {
    return
  }

  if (cell.hasMine) {
    cell.isOpen = true
    gameOver.value = true
    endedAt.value = Date.now()
    revealAllMines()
    return
  }

  if (cell.adjacentMines === 0) {
    openZeroArea(row, col)
  } else {
    cell.isOpen = true
  }

  checkWinCondition()
}

function handleCellRightClick(event, row, col) {
  event.preventDefault()

  if (gameOver.value || isWin.value) {
    return
  }

  const cell = board.value[row][col]
  if (cell.isOpen) {
    return
  }

  cell.isFlagged = !cell.isFlagged
  checkWinCondition()
}

resetGame()
</script>

<template>
  <main class="app">
    <header class="header">
      <h1>Vue Miner</h1>
      <button class="reset" type="button" @click="resetGame">Новая игра</button>
    </header>

    <section class="stats">
      <span>Мины: {{ minesLeft }}</span>
      <span>Флаги: {{ flagsPlaced }}</span>
      <span>Время: {{ elapsedSeconds }}с</span>
    </section>

    <p class="status">{{ statusText }}</p>

    <section class="board" role="grid" aria-label="Игровое поле сапера">
      <div v-for="(row, rowIndex) in board" :key="rowIndex" class="row" role="row">
        <button
          v-for="cell in row"
          :key="`${cell.row}-${cell.col}`"
          class="cell"
          :class="{
            open: cell.isOpen,
            mine: cell.isOpen && cell.hasMine,
            flagged: cell.isFlagged,
          }"
          type="button"
          role="gridcell"
          @click="handleCellClick(cell.row, cell.col)"
          @contextmenu="handleCellRightClick($event, cell.row, cell.col)"
        >
          <template v-if="cell.isOpen && cell.hasMine">💣</template>
          <template v-else-if="cell.isFlagged">🚩</template>
          <template v-else-if="cell.isOpen && cell.adjacentMines > 0">
            {{ cell.adjacentMines }}
          </template>
        </button>
      </div>
    </section>

    <section class="records">
      <div class="records-header">
        <h2>Рекорды</h2>
        <button class="records-clear" type="button" @click="clearRecords">Очистить</button>
      </div>

      <p v-if="records.length === 0" class="records-empty">Пока нет успешных игр</p>

      <ol v-else class="records-list">
        <li v-for="(record, index) in records" :key="`${record.playedAt}-${index}`">
          <span>#{{ index + 1 }} — {{ record.seconds }}с</span>
          <span>{{ formatPlayedAt(record.playedAt) }}</span>
        </li>
      </ol>
    </section>
  </main>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
}

.header {
  width: 100%;
  max-width: 480px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h1 {
  margin: 0;
  font-size: 28px;
}

.reset {
  border: none;
  border-radius: 8px;
  padding: 10px 14px;
  font-weight: 600;
  cursor: pointer;
  background: #2563eb;
  color: #fff;
}

.stats {
  width: 100%;
  max-width: 480px;
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.status {
  margin: 0;
  min-height: 24px;
  font-weight: 600;
}

.records {
  width: 100%;
  max-width: 480px;
  margin-top: 12px;
  padding: 12px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
}

.records-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

h2 {
  margin: 0;
  font-size: 18px;
}

.records-clear {
  border: none;
  background: #e2e8f0;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
}

.records-empty {
  margin: 0;
  font-size: 14px;
  color: #475569;
}

.records-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.records-list li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
}

.board {
  display: flex;
  flex-direction: column;
  gap: 4px;
  user-select: none;
}

.row {
  display: flex;
  gap: 4px;
}

.cell {
  width: 34px;
  height: 34px;
  border: 1px solid #94a3b8;
  background: #e2e8f0;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 700;
}

.cell.open {
  background: #f8fafc;
}

.cell.mine {
  background: #fecaca;
}

.cell.flagged {
  background: #fef3c7;
}
</style>
