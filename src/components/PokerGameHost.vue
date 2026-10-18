<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { mountGame, type MountedGame } from '../game/loader'
import { bridgeVersion, type GameContext } from '../game/bridge'
const props = defineProps<{ preview: boolean; theme: 'light' | 'dark' }>()
const emit = defineEmits<{ return: [] }>()
const element = ref<HTMLElement>()
const state = ref<'loading' | 'ready' | 'error'>('loading')
const abort = new AbortController()
const instance = crypto.randomUUID()
let mounted: MountedGame | undefined
const configuration = (): GameContext => ({
  version: bridgeVersion,
  instance,
  theme: props.theme,
  locale: 'en',
  preview: props.preview,
})
onMounted(async () => {
  try {
    mounted = await mountGame(element.value!, configuration(), abort.signal, (kind) => {
      if (kind === 'return') emit('return')
      else state.value = kind
    })
    mounted.update(configuration())
  } catch {
    if (!abort.signal.aborted) state.value = 'error'
  }
})
watch(
  () => [props.preview, props.theme],
  () => mounted?.update(configuration()),
)
onBeforeUnmount(() => {
  abort.abort()
  mounted?.dispose()
})
</script>
<template>
  <section class="game-shell" aria-label="Game area" :aria-busy="state === 'loading'">
    <p v-if="state === 'loading'" role="status">Loading the game area…</p>
    <p v-if="state === 'error'" role="alert">
      The game area could not load. Reload the page to retry.
    </p>
    <div ref="element" class="game-host" tabindex="0" aria-label="Poker table" />
  </section>
</template>
<style scoped>
.game-shell {
  position: relative;
  width: 100%;
  min-height: 38rem;
}
.game-host {
  position: relative;
  width: 100%;
  height: min(76vh, 52rem);
  min-height: 34rem;
}
.game-host:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 3px;
}
</style>
