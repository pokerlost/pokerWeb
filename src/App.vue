<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>
<template>
  <a class="skip-link" href="#content">Skip to content</a>
  <header class="site-header">
    <RouterLink class="brand" to="/" aria-label="Pokerlost home"
      >pokerlost<span aria-hidden="true">.</span></RouterLink
    >
    <nav aria-label="Main navigation">
      <RouterLink to="/game">Table</RouterLink><RouterLink to="/about">Platform status</RouterLink>
    </nav>
  </header>
  <main id="content" tabindex="-1"><RouterView /></main>
  <footer>Shared table foundation · Preview only</footer>
</template>
<style>
:root {
  color-scheme: light;
  --accent: #176e64;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  color: #17312d;
  background: #f7f8f4;
  font-synthesis: none;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
}
a {
  color: var(--accent);
}
button,
input {
  font: inherit;
}
a:focus-visible,
button:focus-visible,
input:focus-visible {
  outline: 3px solid #b37821;
  outline-offset: 5px;
}
.site-header {
  max-width: 76rem;
  padding: 2rem;
  margin: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  border-bottom: 1px solid #d8e2dd;
}
.brand {
  text-decoration: none;
  font-size: 1.7rem;
  font-weight: 750;
  letter-spacing: -0.06em;
  color: #17312d;
}
.brand span {
  color: #c78c37;
}
nav {
  display: flex;
  gap: 1.7rem;
}
nav a {
  text-decoration: none;
}
nav a.router-link-active {
  text-decoration: underline;
  text-underline-offset: 0.4rem;
}
main {
  max-width: 76rem;
  margin: auto;
  padding: 0 2rem;
  min-height: 70vh;
}
.intro {
  padding: clamp(3rem, 9vw, 8rem) 0 4rem;
  max-width: 52rem;
}
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.8rem;
  color: var(--accent);
  font-weight: 700;
}
h1 {
  font-size: clamp(2.6rem, 6vw, 5rem);
  line-height: 1.02;
  letter-spacing: -0.055em;
  font-weight: 550;
  margin: 1.3rem 0;
}
p {
  line-height: 1.7;
  max-width: 66ch;
}
.lead {
  font-size: 1.35rem;
  color: #46625a;
}
.button,
button {
  display: inline-block;
  padding: 0.85rem 1.3rem;
  border-radius: 0.45rem;
  border: 1px solid var(--accent);
  color: white;
  background: var(--accent);
  text-decoration: none;
  cursor: pointer;
}
.button {
  margin-top: 1.3rem;
}
.details {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2.4rem;
  padding: 2.5rem 0 4rem;
  border-top: 1px solid #d8e2dd;
}
.details h2 {
  font-size: 1.2rem;
  font-weight: 600;
}
.details p,
footer {
  color: #526960;
}
footer {
  max-width: 76rem;
  margin: auto;
  padding: 2rem;
  font-size: 0.85rem;
  border-top: 1px solid #d8e2dd;
}
.table-page {
  background: #f7f8f4;
}
.table-controls {
  display: flex;
  gap: 1.2rem;
  align-items: center;
  flex-wrap: wrap;
  padding: 1.5rem 0;
}
.table-controls h1 {
  font-size: 2rem;
  margin-right: auto;
}
.table-controls button {
  padding: 0.55rem 0.9rem;
}
.skip-link {
  position: fixed;
  top: -5rem;
  left: 1rem;
  background: white;
  padding: 1rem;
  z-index: 5;
}
.skip-link:focus {
  top: 1rem;
}
@media (max-width: 650px) {
  .site-header {
    padding: 1.3rem;
    gap: 1rem;
  }
  nav {
    gap: 1rem;
    font-size: 0.9rem;
  }
  main {
    padding: 0 1rem;
  }
  .details {
    grid-template-columns: 1fr;
    gap: 0.8rem;
  }
  h1 {
    font-size: 3rem;
  }
  .table-controls {
    gap: 0.8rem;
  }
}
</style>
