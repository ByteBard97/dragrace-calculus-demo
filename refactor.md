# Drag Race Demo - Vue 3 + Vuetify 3 Refactor Plan

## Current State
- Single HTML file: `drag-race-demo.html` (~1345 lines)
- Pure vanilla JavaScript with canvas rendering
- Manual drag/drop implementation
- No framework, no component structure

## Target Architecture

### Tech Stack
- **Vue 3** - Modern reactive framework
- **Vuetify 3** - Material Design UI components
- **Chart.js 4.x** - Canvas-based charting library
- **chartjs-plugin-dragdata** - Makes Chart.js points draggable
- **vue-chartjs 5.x** - Vue 3 wrapper for Chart.js

### Why This Stack?
1. **Chart.js + dragdata plugin** = Exactly what we need (draggable points on line charts)
2. **Vue 3** = Clean component architecture, reactive data flow
3. **Vuetify 3** = Professional Material Design UI out of the box
4. **Canvas rendering** = High performance (current implementation already uses canvas)

---

## Project Structure

```
docs/
├── drag-race-vue/
│   ├── index.html                 # Main HTML entry point
│   ├── package.json               # Dependencies
│   ├── vite.config.js             # Build config
│   ├── src/
│   │   ├── main.js                # Vue app initialization
│   │   ├── App.vue                # Root component (<200 lines)
│   │   ├── components/
│   │   │   ├── DraggableChart.vue # Reusable chart component (<250 lines)
│   │   │   ├── CarAnimation.vue   # Car track visualization (<150 lines)
│   │   │   └── ControlPanel.vue   # Play/pause/reset controls (<150 lines)
│   │   ├── composables/
│   │   │   ├── usePhysics.js      # Physics calculations (<200 lines)
│   │   │   └── useSimulation.js   # Simulation state management (<150 lines)
│   │   └── utils/
│   │       └── chartConfig.js     # Chart.js configurations (<100 lines)
```

**RULE: No file exceeds 300 lines**

---

## Dependencies (package.json)

```json
{
  "name": "drag-race-vue",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vuetify": "^3.5.0",
    "@mdi/font": "^7.4.0",
    "chart.js": "^4.4.0",
    "chartjs-plugin-dragdata": "^2.2.5",
    "vue-chartjs": "^5.3.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.0.0",
    "vite-plugin-vuetify": "^2.0.0"
  }
}
```

---

## Component Architecture

### 1. App.vue (Root Component)
**Purpose:** Layout structure, coordinate 3 charts + car animation

```vue
<template>
  <v-app>
    <v-container fluid>
      <v-row>
        <v-col cols="12">
          <h1>🏎 Interactive Drag Race Physics</h1>
        </v-col>
      </v-row>

      <!-- Relationship Diagram (static HTML) -->
      <v-row>
        <v-col cols="12">
          <v-card>
            <!-- Integration/Differentiation explanation -->
          </v-card>
        </v-col>
      </v-row>

      <!-- Car Animation -->
      <v-row>
        <v-col cols="12">
          <CarAnimation :position-data="state.position" :current-time="state.currentTime" />
        </v-col>
      </v-row>

      <!-- Three Charts Side by Side -->
      <v-row>
        <v-col cols="12" md="4">
          <DraggableChart
            type="acceleration"
            :data="state.accel"
            :points="state.accelPoints"
            :time="state.time"
            @update:points="updateAcceleration"
          />
        </v-col>
        <v-col cols="12" md="4">
          <DraggableChart
            type="velocity"
            :data="state.velocity"
            :points="state.velocityPoints"
            :time="state.time"
            @update:points="updateVelocity"
          />
        </v-col>
        <v-col cols="12" md="4">
          <DraggableChart
            type="position"
            :data="state.position"
            :points="state.positionPoints"
            :time="state.time"
            @update:points="updatePosition"
          />
        </v-col>
      </v-row>

      <!-- Control Panel -->
      <v-row>
        <v-col cols="12">
          <ControlPanel
            :is-playing="state.isPlaying"
            @play="play"
            @pause="pause"
            @step="step"
            @reset="reset"
          />
        </v-col>
      </v-row>

      <!-- Info Boxes -->
      <v-row>
        <v-col cols="12" md="6" lg="4" v-for="info in infoBoxes" :key="info.title">
          <v-card>
            <v-card-title>{{ info.title }}</v-card-title>
            <v-card-text v-html="info.content"></v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-app>
</template>

<script setup>
import { useSimulation } from './composables/useSimulation'
import DraggableChart from './components/DraggableChart.vue'
import CarAnimation from './components/CarAnimation.vue'
import ControlPanel from './components/ControlPanel.vue'

const { state, updateAcceleration, updateVelocity, updatePosition, play, pause, step, reset } = useSimulation()

const infoBoxes = [
  { title: 'Programming View', content: '...' },
  { title: 'Mathematical Relationships', content: '...' },
  // etc.
]
</script>
```

---

### 2. DraggableChart.vue (Reusable Chart Component)

**Purpose:** Render a Chart.js line chart with draggable points

**Props:**
- `type`: 'acceleration' | 'velocity' | 'position'
- `data`: Array of values for the curve
- `points`: Array of control points `{t, value}`
- `time`: Array of time values

**Emits:**
- `update:points`: When user drags a point

**Key Features:**
- Uses `vue-chartjs` Line component
- Configures `chartjs-plugin-dragdata` for draggable points
- Different colors per type (acceleration=red, velocity=cyan, position=blue)
- Dynamic y-axis scaling
- Fixed points at start/end
- Right-click to remove points (acceleration only)
- Click to add points (acceleration only)

```vue
<template>
  <v-card>
    <v-card-title :style="{ color: chartConfig.color }">
      {{ chartConfig.title }}
    </v-card-title>
    <v-card-text>
      <Line :data="chartData" :options="chartOptions" :plugins="plugins" />
      <div class="text-caption text-center mt-2" style="font-style: italic;">
        {{ hintText }}
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart, registerables } from 'chart.js'
import chartJSDragDataPlugin from 'chartjs-plugin-dragdata'
import { getChartConfig } from '../utils/chartConfig'

Chart.register(...registerables, chartJSDragDataPlugin)

const props = defineProps({
  type: String,
  data: Array,
  points: Array,
  time: Array
})

const emit = defineEmits(['update:points'])

const chartConfig = computed(() => getChartConfig(props.type))

const chartData = computed(() => ({
  labels: props.time,
  datasets: [
    {
      label: chartConfig.value.title,
      data: props.data,
      borderColor: chartConfig.value.color,
      borderWidth: 3,
      fill: false,
      tension: props.type === 'acceleration' ? 0 : 0.4,
      pointRadius: 0
    },
    {
      label: 'Control Points',
      data: props.points.map(p => ({ x: p.t, y: p.value })),
      borderColor: chartConfig.value.color,
      backgroundColor: chartConfig.value.color,
      pointRadius: 6,
      showLine: false,
      dragData: true
    }
  ]
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      type: 'linear',
      min: 0,
      max: 5,
      title: { display: true, text: 'Time (s)' }
    },
    y: {
      title: { display: true, text: chartConfig.value.unit }
    }
  },
  plugins: {
    dragData: {
      round: 2,
      showTooltip: true,
      onDragStart: (e, datasetIndex, index) => {
        // Prevent dragging fixed points
        if (index === 0) return false
        if (props.type === 'position' && index === props.points.length - 1) return false
        return true
      },
      onDrag: (e, datasetIndex, index, value) => {
        const newPoints = [...props.points]
        newPoints[index] = { t: value.x, value: value.y }
        emit('update:points', newPoints)
      }
    }
  }
}))

const plugins = [chartJSDragDataPlugin]

const hintText = computed(() => {
  if (props.type === 'acceleration') return 'Click to add • Drag points • Right-click to remove'
  return 'Drag corresponding points to adjust'
})
</script>

<style scoped>
.v-card {
  height: 100%;
}
</style>
```

---

### 3. CarAnimation.vue (Car Track Component)

**Purpose:** Visual car animation on track

**Props:**
- `positionData`: Array of position values
- `currentTime`: Current simulation time

**Template:**
```vue
<template>
  <v-card class="track-container">
    <div class="track"></div>
    <div class="car" :style="carStyle">🏎️</div>
    <div class="finish-line" :style="finishLineStyle"></div>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  positionData: Array,
  currentTime: Number
})

const carStyle = computed(() => {
  // Calculate car position based on currentTime and positionData
  // Return { left: '...px', transform: 'scaleX(...)' }
})

const finishLineStyle = computed(() => {
  // Calculate finish line position
  // Return { left: '...px' }
})
</script>

<style scoped>
/* Track, car, and finish line styles */
</style>
```

---

### 4. ControlPanel.vue (Control Buttons)

**Purpose:** Play/Pause/Step/Reset controls

**Props:**
- `isPlaying`: Boolean

**Emits:**
- `play`, `pause`, `step`, `reset`

```vue
<template>
  <v-card>
    <v-card-title>Simulation Controls</v-card-title>
    <v-card-text>
      <v-row>
        <v-col cols="3">
          <v-btn block color="primary" @click="$emit('play')" :disabled="isPlaying">
            <v-icon start>mdi-play</v-icon> Play
          </v-btn>
        </v-col>
        <v-col cols="3">
          <v-btn block color="warning" @click="$emit('pause')" :disabled="!isPlaying">
            <v-icon start>mdi-pause</v-icon> Pause
          </v-btn>
        </v-col>
        <v-col cols="3">
          <v-btn block color="info" @click="$emit('step')">
            <v-icon start>mdi-skip-forward</v-icon> Step
          </v-btn>
        </v-col>
        <v-col cols="3">
          <v-btn block color="error" @click="$emit('reset')">
            <v-icon start>mdi-refresh</v-icon> Reset
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
defineProps({ isPlaying: Boolean })
defineEmits(['play', 'pause', 'step', 'reset'])
</script>
```

---

## Composables (Vue 3 Composition API)

### 5. useSimulation.js (Main Simulation Logic)

**Purpose:** Manage simulation state and coordinate physics calculations

```javascript
import { reactive, watch } from 'vue'
import { usePhysics } from './usePhysics'

export function useSimulation() {
  const physics = usePhysics()

  const state = reactive({
    time: [],
    accel: [],
    velocity: [],
    position: [],
    currentTime: 0,
    maxTime: 5,
    dt: 0.01,
    isPlaying: false,
    accelPoints: [
      { t: 0, value: 0 },
      { t: 2.5, value: 10 },
      { t: 5, value: 0 }
    ],
    velocityPoints: [],
    positionPoints: []
  })

  let animationId = null

  function computeFromAcceleration() {
    const result = physics.computeFromAcceleration(state.accelPoints, state.maxTime, state.dt)
    Object.assign(state, result)
  }

  function updateAcceleration(newPoints) {
    state.accelPoints = newPoints
    computeFromAcceleration()
  }

  function updateVelocity(newPoints) {
    state.velocityPoints = newPoints
    const result = physics.computeFromVelocity(state.velocityPoints, state.accelPoints, state.maxTime, state.dt)
    Object.assign(state, result)
  }

  function updatePosition(newPoints) {
    state.positionPoints = newPoints
    const result = physics.computeFromPosition(state.positionPoints, state.velocityPoints, state.accelPoints, state.maxTime, state.dt)
    Object.assign(state, result)
  }

  function play() {
    if (state.currentTime >= state.maxTime) state.currentTime = 0
    state.isPlaying = true
    animate()
  }

  function pause() {
    state.isPlaying = false
    if (animationId) cancelAnimationFrame(animationId)
  }

  function step() {
    pause()
    state.currentTime = Math.min(state.currentTime + 0.1, state.maxTime)
  }

  function reset() {
    pause()
    state.currentTime = 0
    state.accelPoints = [
      { t: 0, value: 0 },
      { t: 1.5, value: 15 },
      { t: 3, value: -20 },
      { t: 5, value: 0 }
    ]
    computeFromAcceleration()
  }

  function animate() {
    if (!state.isPlaying) return

    state.currentTime += state.dt * 2
    if (state.currentTime >= state.maxTime) {
      state.currentTime = state.maxTime
      pause()
      return
    }

    animationId = requestAnimationFrame(animate)
  }

  // Initialize
  computeFromAcceleration()

  return {
    state,
    updateAcceleration,
    updateVelocity,
    updatePosition,
    play,
    pause,
    step,
    reset
  }
}
```

---

### 6. usePhysics.js (Physics Engine)

**Purpose:** All calculus/physics calculations (same logic as original)

```javascript
export function usePhysics() {
  function interpolateLinear(points, t) {
    // ... (copy from original)
  }

  function computeQuadraticSegment(t0, v0, a0, t1, v1, a1, t) {
    // ... (copy from original)
  }

  function computeCubicSegment(t0, x0, v0, t1, x1, v1, t) {
    // ... (copy from original)
  }

  function computeFromAcceleration(accelPoints, maxTime, dt) {
    // ... (copy from original, return result object)
    return {
      time: [...],
      accel: [...],
      velocity: [...],
      position: [...],
      velocityPoints: [...],
      positionPoints: [...]
    }
  }

  function computeFromVelocity(velocityPoints, accelPoints, maxTime, dt) {
    // Adjust accel points, then call computeFromAcceleration
  }

  function computeFromPosition(positionPoints, velocityPoints, accelPoints, maxTime, dt) {
    // Adjust velocity points, then call computeFromVelocity
  }

  return {
    computeFromAcceleration,
    computeFromVelocity,
    computeFromPosition
  }
}
```

---

### 7. chartConfig.js (Chart.js Configuration Utility)

**Purpose:** Centralize chart colors and settings

```javascript
export function getChartConfig(type) {
  const configs = {
    acceleration: {
      title: 'Acceleration (m/s²)',
      color: '#FF6B6B',
      unit: 'm/s²'
    },
    velocity: {
      title: 'Velocity (m/s)',
      color: '#4ECDC4',
      unit: 'm/s'
    },
    position: {
      title: 'Position (m)',
      color: '#45B7D1',
      unit: 'm'
    }
  }
  return configs[type]
}
```

---

## Setup Files

### main.js
```javascript
import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

import App from './App.vue'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'dark'
  }
})

createApp(App)
  .use(vuetify)
  .mount('#app')
```

### index.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Drag Race Physics Demo</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

### vite.config.js
```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true })
  ]
})
```

---

## Implementation Checklist

- [ ] Create project structure (`drag-race-vue/` directory)
- [ ] Initialize package.json and install dependencies
- [ ] Set up Vite config with Vue and Vuetify plugins
- [ ] Create main.js with Vuetify initialization
- [ ] Create usePhysics.js composable (port physics code)
- [ ] Create useSimulation.js composable (state management)
- [ ] Create chartConfig.js utility
- [ ] Create DraggableChart.vue component with Chart.js integration
- [ ] Create CarAnimation.vue component
- [ ] Create ControlPanel.vue component
- [ ] Create App.vue (assemble all components)
- [ ] Test draggable points on all three charts
- [ ] Test play/pause/step/reset controls
- [ ] Test car animation sync with position data
- [ ] Verify all files are under 300 lines
- [ ] Test responsive layout (mobile/tablet/desktop)

---

## Benefits of This Refactor

1. **Modern Framework**: Vue 3 Composition API = clean, maintainable code
2. **Component Reusability**: `DraggableChart.vue` used 3 times with different props
3. **Professional UI**: Vuetify Material Design components
4. **Better Drag/Drop**: chartjs-plugin-dragdata is battle-tested
5. **Reactive Data Flow**: Changes automatically propagate
6. **Dev Experience**: Hot reload, component devtools
7. **File Size Limit**: Every file < 300 lines
8. **Easy to Extend**: Add new chart types, modify physics, etc.

---

## Migration Strategy

1. **Phase 1**: Set up project structure and dependencies
2. **Phase 2**: Port physics calculations to composables (pure logic, no UI)
3. **Phase 3**: Build DraggableChart component (most critical)
4. **Phase 4**: Build remaining components (CarAnimation, ControlPanel)
5. **Phase 5**: Assemble App.vue and test end-to-end
6. **Phase 6**: Polish UI and add remaining info boxes

---

## Notes

- Original demo is self-contained HTML, new version needs `npm install` + `npm run dev`
- Can still build to single HTML with `vite build` (creates optimized bundle)
- Chart.js canvas rendering = same performance as original
- chartjs-plugin-dragdata handles all drag logic (no manual mouse events)
- Vue reactivity handles all state updates automatically