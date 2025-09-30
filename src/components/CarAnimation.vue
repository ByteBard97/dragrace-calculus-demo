<template>
  <v-card class="car-track-container">
    <v-card-text>
      <div class="stopwatch">{{ formattedTime }}</div>
      <div class="track-wrapper">
        <div class="track"></div>
        <img
          src="/drag-racer.webp"
          class="car"
          :style="carStyle"
          alt="Race car"
        />
        <div class="finish-line" :style="finishLineStyle"></div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  positionData: Array,
  currentTime: Number,
  realElapsedTime: Number,
  maxTime: Number,
  dt: Number
})

const carStyle = computed(() => {
  const timeIdx = Math.min(
    Math.floor(props.currentTime / props.dt),
    props.positionData.length - 1
  )
  const currentPos = timeIdx >= 0 ? props.positionData[timeIdx] : 0

  // The MAX position in the entire simulation determines scale
  // Finish line (at 100%) represents this max position
  const maxPos = Math.max(...props.positionData, 0.1) // Avoid divide by zero

  // Scale current position so max position = 100% (finish line)
  let carX = (currentPos / maxPos) * 100

  // Determine direction
  let transform = 'scaleX(1)'
  if (timeIdx > 0) {
    const prevPos = props.positionData[Math.max(0, timeIdx - 1)]
    const velocity = currentPos - prevPos
    if (velocity < 0) {
      transform = 'scaleX(-1)'
    }
  }

  return {
    left: `${carX}%`,
    transform
  }
})

const finishLineStyle = computed(() => {
  // Finish line is always at 100% (right edge of screen)
  return {
    left: '100%',
    right: 'auto'
  }
})

const formattedTime = computed(() => {
  return props.realElapsedTime.toFixed(2) + 's'
})
</script>

<style scoped>
.car-track-container {
  background: #252538;
  border: 1px solid #3a3a4e;
  position: relative;
}

.stopwatch {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 2em;
  font-weight: bold;
  color: #4ECDC4;
  font-family: 'Courier New', monospace;
  background: rgba(26, 26, 46, 0.8);
  padding: 5px 15px;
  border-radius: 5px;
  border: 2px solid #4ECDC4;
  z-index: 10;
}

.track-wrapper {
  position: relative;
  height: 80px;
  padding: 20px;
  overflow: visible;
}

.track {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 8px;
  background: linear-gradient(90deg, #2a2a3e 0%, #3a3a4e 100%);
  border-radius: 4px;
  transform: translateY(-50%);
}

.car {
  position: absolute;
  top: 50%;
  height: 40px;
  width: auto;
  transform: translateY(-50%);
  transition: left 0.05s linear, transform 0.1s;
  filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5));
}

.finish-line {
  position: absolute;
  top: 20px;
  bottom: 20px;
  width: 4px;
  background: repeating-linear-gradient(
    0deg,
    #fff 0px,
    #fff 8px,
    #000 8px,
    #000 16px
  );
  transition: left 0.2s;
}
</style>