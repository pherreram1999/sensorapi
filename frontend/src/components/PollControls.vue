<script setup lang="ts">
const props = defineProps<{
  intervalMs: number;
  paused: boolean;
}>();

const emit = defineEmits<{
  (e: "update:intervalMs", v: number): void;
  (e: "update:paused", v: boolean): void;
}>();

function onInterval(e: Event) {
  const s = +(e.target as HTMLInputElement).value;
  if (s >= 1 && s <= 60) emit("update:intervalMs", s * 1000);
}
</script>

<template>
  <div class="poll-controls" role="group" aria-label="Polling controls">
    <!-- Play / Pause -->
    <button
      :class="['poll-btn', paused ? 'poll-btn--play' : 'poll-btn--pause']"
      :aria-label="paused ? 'Resume live polling' : 'Pause live polling'"
      :aria-pressed="!paused"
      @click="emit('update:paused', !paused)"
    >
      <!-- Play icon -->
      <svg v-if="paused" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
           fill="currentColor" aria-hidden="true">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
      <!-- Pause icon -->
      <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
           fill="currentColor" aria-hidden="true">
        <rect x="6" y="4" width="4" height="16"/>
        <rect x="14" y="4" width="4" height="16"/>
      </svg>
      <span>{{ paused ? "Resume" : "Pause" }}</span>
    </button>

    <!-- Interval -->
    <label class="interval-label" for="poll-interval">
      <span class="interval-text">Every</span>
      <input
        id="poll-interval"
        type="number"
        class="interval-input"
        min="1"
        max="60"
        :value="Math.round(intervalMs / 1000)"
        @change="onInterval"
        aria-label="Polling interval in seconds"
      />
      <span class="interval-text">s</span>
    </label>
  </div>
</template>

<style scoped>
.poll-controls {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

/* Play/Pause button */
.poll-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 var(--sp-3);
  border-radius: var(--r-sm);
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 0.82rem;
  font-family: 'Fira Sans', sans-serif;
  font-weight: 500;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
  touch-action: manipulation;
  user-select: none;
  white-space: nowrap;
}

.poll-btn svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.poll-btn:focus-visible {
  outline: 2px solid var(--c-secondary);
  outline-offset: 2px;
}

.poll-btn--pause {
  background: #fef9c3;
  border-color: #fbbf24;
  color: #92400e;
}
.poll-btn--pause:hover { background: #fef08a; }

.poll-btn--play {
  background: var(--c-success-bg);
  border-color: #4ade80;
  color: #166534;
}
.poll-btn--play:hover { background: #bbf7d0; }

@media (max-width: 639px) {
  .poll-btn { min-height: 44px; }
}

/* Interval input */
.interval-label {
  display: flex;
  align-items: center;
  gap: 5px;
}

.interval-text {
  font-size: 0.82rem;
  color: var(--c-text-muted);
  font-weight: 500;
  white-space: nowrap;
}

.interval-input {
  width: 54px;
  height: 36px;
  padding: 0 var(--sp-2);
  border: 1px solid var(--c-border);
  border-radius: var(--r-sm);
  font-size: 0.85rem;
  font-family: 'Fira Code', monospace;
  text-align: center;
  color: var(--c-text);
  background: var(--c-surface);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  touch-action: manipulation;
  -moz-appearance: textfield;
}
.interval-input::-webkit-inner-spin-button,
.interval-input::-webkit-outer-spin-button { opacity: 1; }
.interval-input:focus {
  outline: none;
  border-color: var(--c-secondary);
  box-shadow: 0 0 0 3px rgba(59,130,246,.15);
}

@media (max-width: 639px) {
  .interval-input { height: 44px; }
}
</style>
