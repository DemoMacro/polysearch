<script setup lang="ts">
import { useToggle } from "@vueuse/core";

const [show, toggle] = useToggle(false);
</script>

<template>
  <div>
    <div v-show="show">
      <h1>PolySearch WebExt</h1>
      <p>Content script loaded</p>
    </div>
    <button @click="toggle()">Toggle</button>
  </div>
</template>
