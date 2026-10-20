<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

import PokerGameHost from "@/components/PokerGameHost.vue";

const router = useRouter();
const preview = ref(false);
const dark = ref(true);
const fullscreen = ref<HTMLElement>();
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else {
      const target = fullscreen.value;
      if (!target) throw new Error("Fullscreen target unavailable");
      await target.requestFullscreen();
    }
    fullscreenError.value = false;
  } catch {
    fullscreenError.value = true;
  }
}
const fullscreenError = ref(false);
</script>

<template>
  <section ref="fullscreen" class="table-page">
    <div class="table-controls">
      <h1>The table</h1>
      <label><input v-model="preview" type="checkbox" /> Synthetic preview</label>
      <label><input v-model="dark" type="checkbox" /> Dark table</label>
      <button type="button" @click="toggleFullscreen">Fullscreen</button>
    </div>
    <p v-if="fullscreenError" role="status">Fullscreen is unavailable in this browser.</p>
    <PokerGameHost :preview="preview" :theme="dark ? 'dark' : 'light'" @return="router.push('/')" />
  </section>
</template>
