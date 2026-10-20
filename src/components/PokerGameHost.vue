<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

import { mountGame, type MountedGame } from "@/game/loader";
import { bridgeVersion, gameEventKind, type GameContext, type GameTheme } from "@/game/bridge";

const props = defineProps<{ preview: boolean; theme: GameTheme }>();
const emit = defineEmits<{ return: [] }>();
const element = ref<HTMLElement>();
const hostState = { loading: "loading", ready: "ready", error: "error" } as const;
type HostState = (typeof hostState)[keyof typeof hostState];
const state = ref<HostState>(hostState.loading);
const abort = new AbortController();
const instance = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte =>
  byte.toString(16).padStart(2, "0"),
).join("");
let mounted: MountedGame | undefined;
const configuration = (): GameContext => ({
  version: bridgeVersion,
  instance,
  theme: props.theme,
  locale: "en",
  preview: props.preview,
});
onMounted(async () => {
  try {
    const host = element.value;
    if (!host) throw new Error("Game host unavailable");
    mounted = await mountGame(host, configuration(), abort.signal, (kind) => {
      switch (kind) {
        case gameEventKind.return:
          emit("return");
          break;
        case gameEventKind.ready:
          state.value = hostState.ready;
          break;
        case gameEventKind.error:
          state.value = hostState.error;
          break;
        default: {
          const unexpected: never = kind;
          throw new Error(`Unknown game event: ${unexpected}`);
        }
      }
    });
    mounted.update(configuration());
  } catch {
    if (!abort.signal.aborted) state.value = hostState.error;
  }
});
watch(
  () => [props.preview, props.theme],
  () => mounted?.update(configuration()),
);
onBeforeUnmount(() => {
  abort.abort();
  mounted?.dispose();
});
</script>

<template>
  <section class="game-shell" aria-label="Game area" :aria-busy="state === hostState.loading">
    <p v-if="state === hostState.loading" role="status">Loading the game area…</p>
    <p v-if="state === hostState.error" role="alert">
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
