<script setup lang="ts">
import { ref, watch } from 'vue';
import { useMinesweeper } from './composables/useMinesweeper';
import { NUMBER_COLORS } from './config';

const {
  gameOver,
  isWin,
  board,
  elapsedSeconds,
  minesLeft,
  flagsCount,
  records,
  statusText,
  handleCellClick,
  handleCellRightClick,
  resetGame,
  clearRecords,
  formatPlayedAt,
  getCellAriaLabel,
  getNumberColor,
} = useMinesweeper();

// Keyboard navigation
const focusedCell = ref<{ row: number; col: number } | null>(null);

function handleKeydown(event: KeyboardEvent): void {
  if (!board.value.length) return;

  const maxIndex = board.value.length - 1;

  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault();
      focusedCell.value = focusedCell.value
        ? { row: Math.max(0, focusedCell.value.row - 1), col: focusedCell.value.col }
        : { row: 0, col: 0 };
      break;
    case 'ArrowDown':
      event.preventDefault();
      focusedCell.value = focusedCell.value
        ? { row: Math.min(maxIndex, focusedCell.value.row + 1), col: focusedCell.value.col }
        : { row: 0, col: 0 };
      break;
    case 'ArrowLeft':
      event.preventDefault();
      focusedCell.value = focusedCell.value
        ? { row: focusedCell.value.row, col: Math.max(0, focusedCell.value.col - 1) }
        : { row: 0, col: 0 };
      break;
    case 'ArrowRight':
      event.preventDefault();
      focusedCell.value = focusedCell.value
        ? { row: focusedCell.value.row, col: Math.min(maxIndex, focusedCell.value.col + 1) }
        : { row: 0, col: 0 };
      break;
    case 'Enter':
    case ' ':
      event.preventDefault();
      if (focusedCell.value) {
        handleCellClick(focusedCell.value.row, focusedCell.value.col);
      }
      break;
    case 'f':
    case 'F':
    case 'ц':
    case 'Ц':
      event.preventDefault();
      if (focusedCell.value) {
        const fakeEvent = new MouseEvent('contextmenu');
        handleCellRightClick(fakeEvent, focusedCell.value.row, focusedCell.value.col);
      }
      break;
    case 'n':
    case 'N':
    case 'т':
    case 'Т':
      event.preventDefault();
      resetGame();
      break;
  }
}

// Initialize focused cell when board is ready
watch(
  board,
  (newBoard) => {
    if (newBoard.length && !focusedCell.value) {
      focusedCell.value = { row: 0, col: 0 };
    }
  },
  { immediate: true }
);

function isFocused(row: number, col: number): boolean {
  return focusedCell.value?.row === row && focusedCell.value?.col === col;
}

function getNumberColorClass(num: number): string {
  return `num-${num}`;
}
</script>

<template>
  <main class="app" @keydown="handleKeydown" tabindex="0">
    <header class="header">
      <h1>Vue Miner</h1>
      <button class="reset" type="button" @click="resetGame">Новая игра</button>
    </header>

    <section class="stats">
      <span>Мины: {{ minesLeft }}</span>
      <span>Флаги: {{ flagsCount }}</span>
      <span>Время: {{ elapsedSeconds }}с</span>
    </section>

    <p class="status">{{ statusText }}</p>

    <section class="board" role="grid" aria-label="Игровое поле сапера">
      <div v-for="(row, rowIndex) in board" :key="rowIndex" class="row" role="row">
        <button
          v-for="(cell, colIndex) in row"
          :key="`${cell.row}-${cell.col}`"
          class="cell"
          :class="{
            open: cell.isOpen,
            mine: cell.isOpen && cell.hasMine,
            flagged: cell.isFlagged,
            focused: isFocused(cell.row, cell.col),
            ['num-' + cell.adjacentMines]: cell.isOpen && cell.adjacentMines > 0 && !cell.hasMine,
          }"
          :style="
            cell.isOpen && cell.adjacentMines > 0 && !cell.hasMine
              ? { color: getNumberColor(cell.adjacentMines) }
              : {}
          "
          type="button"
          role="gridcell"
          :aria-label="getCellAriaLabel(cell)"
          @click="handleCellClick(cell.row, cell.col)"
          @contextmenu="handleCellRightClick($event, cell.row, cell.col)"
          @mouseenter="focusedCell = { row: cell.row, col: cell.col }"
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

    <!-- Modal for game over / win -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="gameOver || isWin" class="modal-overlay" @click="resetGame">
          <div class="modal-content" @click.stop>
            <div class="modal-icon">
              {{ isWin ? '🎉' : '💥' }}
            </div>
            <h2 class="modal-title">
              {{ isWin ? 'Победа!' : 'Игра окончена' }}
            </h2>
            <p class="modal-message">
              {{ isWin ? `Вы нашли все мины за ${elapsedSeconds}с!` : 'Вы наступили на мину!' }}
            </p>
            <button class="modal-button" type="button" @click="resetGame">
              Сыграть ещё раз
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
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
  outline: none;
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
  transition: background-color 0.15s ease;
}

.reset:hover {
  background: #1d4ed8;
}

.reset:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
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
  transition: background-color 0.15s ease;
}

.records-clear:hover {
  background: #cbd5e1;
}

.records-clear:focus-visible {
  outline: 2px solid #94a3b8;
  outline-offset: 2px;
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
  background: linear-gradient(145deg, #e2e8f0, #cbd5e1);
  border-radius: 4px;
  cursor: pointer;
  font-weight: 700;
  font-size: 14px;
  transition: all 0.1s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cell:hover:not(.open) {
  background: linear-gradient(145deg, #cbd5e1, #94a3b8);
}

.cell:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
}

.cell.focused {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
}

.cell.open {
  background: #f8fafc;
  cursor: default;
}

.cell.mine {
  background: #fecaca;
}

.cell.flagged {
  background: #fef3c7;
}

/* Number colors */
.num-1 { color: #3b82f6; }
.num-2 { color: #22c55e; }
.num-3 { color: #ef4444; }
.num-4 { color: #8b5cf6; }
.num-5 { color: #f59e0b; }
.num-6 { color: #06b6d4; }
.num-7 { color: #1e293b; }
.num-8 { color: #64748b; }

/* Modal styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  cursor: pointer;
}

.modal-content {
  background: white;
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  cursor: default;
  max-width: 90%;
  width: 320px;
}

.modal-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.modal-title {
  margin: 0 0 8px;
  font-size: 24px;
  color: #0f172a;
}

.modal-message {
  margin: 0 0 24px;
  font-size: 16px;
  color: #475569;
}

.modal-button {
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  background: #2563eb;
  color: #fff;
  transition: background-color 0.15s ease;
}

.modal-button:hover {
  background: #1d4ed8;
}

.modal-button:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.2s ease;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.9);
}
</style>
