<template>
  <v-card>
    <v-card-title :style="{ color: chartConfig.color }">
      {{ chartConfig.title }}
    </v-card-title>
    <v-card-text>
      <div style="height: 400px; position: relative;">
        <canvas
          ref="canvasRef"
          :style="{ width: '100%', height: '100%', display: 'block' }"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseUp"
          @click="handleClick"
          @contextmenu.prevent="handleContextMenu"
        />
      </div>
      <div class="text-caption text-center mt-2" style="font-style: italic;">
        {{ hintText }}
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { getChartConfig } from '../utils/chartConfig'

const props = defineProps({
  type: String,
  data: Array,
  points: Array,
  time: Array
})

const emit = defineEmits(['update:points'])

const canvasRef = ref(null)
const chartConfig = computed(() => getChartConfig(props.type))
const dragState = ref({ isDragging: false, pointIndex: -1 })

const yAxisBounds = computed(() => {
  if (props.type === 'acceleration') {
    // Fixed scale for acceleration
    return { min: -20, max: 20 }
  }

  const allValues = [...props.data, ...props.points.map(p => p.value)]
  let min = Math.min(...allValues)
  let max = Math.max(...allValues)

  const range = max - min || 1
  min = min - range * 0.15
  max = max + range * 0.15

  if (props.type === 'velocity') {
    min = Math.floor(min / 5) * 5
    max = Math.ceil(max / 5) * 5
    if (max - min < 10) {
      const center = (max + min) / 2
      min = center - 5
      max = center + 5
    }
  } else {
    min = Math.floor(min / 10) * 10
    max = Math.ceil(max / 10) * 10
    if (max - min < 20) {
      const center = (max + min) / 2
      min = center - 10
      max = center + 10
    }
  }

  return { min, max }
})

function setupCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * 2
  canvas.height = rect.height * 2
  const ctx = canvas.getContext('2d')
  ctx.scale(2, 2)
}

function drawGraph() {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  const width = canvas.width / 2
  const height = canvas.height / 2
  const padding = 50
  const graphWidth = width - 2 * padding
  const graphHeight = height - 2 * padding

  const { min: minValue, max: maxValue } = yAxisBounds.value
  const valueRange = maxValue - minValue

  // Clear
  ctx.clearRect(0, 0, width, height)

  // Draw axes
  ctx.strokeStyle = '#4a4a5e'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(padding, padding)
  ctx.lineTo(padding, height - padding)
  ctx.lineTo(width - padding, height - padding)
  ctx.stroke()

  // Draw zero line if in range
  if (minValue < 0 && maxValue > 0) {
    const zeroY = height - padding - ((-minValue) / valueRange) * graphHeight
    ctx.strokeStyle = '#666'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(padding, zeroY)
    ctx.lineTo(width - padding, zeroY)
    ctx.stroke()
    ctx.setLineDash([])
  }

  // Draw grid
  ctx.strokeStyle = '#2a2a3e'
  ctx.lineWidth = 0.5
  for (let i = 0; i <= 10; i++) {
    const x = padding + (i / 10) * graphWidth
    const y = padding + (i / 10) * graphHeight

    ctx.beginPath()
    ctx.moveTo(x, padding)
    ctx.lineTo(x, height - padding)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(padding, y)
    ctx.lineTo(width - padding, y)
    ctx.stroke()
  }

  // Draw curve
  if (props.type === 'acceleration') {
    // Piecewise linear
    const sorted = [...props.points].sort((a, b) => a.t - b.t)
    ctx.strokeStyle = chartConfig.value.color
    ctx.lineWidth = 3
    ctx.beginPath()

    for (let i = 0; i < sorted.length; i++) {
      const x = padding + (sorted[i].t / 5) * graphWidth
      const y = height - padding - ((sorted[i].value - minValue) / valueRange) * graphHeight

      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  } else {
    // Smooth curve
    ctx.strokeStyle = chartConfig.value.color
    ctx.lineWidth = 3
    ctx.beginPath()

    for (let i = 0; i < props.data.length; i++) {
      const x = padding + (props.time[i] / 5) * graphWidth
      const y = height - padding - ((props.data[i] - minValue) / valueRange) * graphHeight

      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  // Draw control points
  for (let i = 0; i < props.points.length; i++) {
    const point = props.points[i]
    const x = padding + (point.t / 5) * graphWidth
    const y = height - padding - ((point.value - minValue) / valueRange) * graphHeight

    const isFixed = (props.type === 'position' && (i === 0 || i === props.points.length - 1)) ||
                    (props.type === 'velocity' && i === 0) ||
                    (props.type === 'acceleration' && i === 0)

    // Dashed line for non-acceleration
    if (props.type !== 'acceleration') {
      ctx.strokeStyle = chartConfig.value.color + '40'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 4])
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, height - padding)
      ctx.stroke()
      ctx.setLineDash([])
    }

    ctx.fillStyle = isFixed ? '#666' : chartConfig.value.color
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, isFixed ? 4 : 6, 0, 2 * Math.PI)
    ctx.fill()
    ctx.stroke()

    // Value label
    ctx.fillStyle = chartConfig.value.color
    ctx.font = '10px Arial'
    ctx.fillText(point.value.toFixed(1), x + 8, y - 5)
  }

  // Draw labels
  ctx.fillStyle = '#b0b0c0'
  ctx.font = '11px Arial'
  ctx.fillText('0', padding - 15, height - padding + 15)
  ctx.fillText('5s', width - padding - 10, height - padding + 15)
  ctx.fillText(maxValue.toFixed(0) + ' ' + chartConfig.value.unit, padding - 40, padding + 5)
  ctx.fillText(minValue.toFixed(0) + ' ' + chartConfig.value.unit, padding - 40, height - padding + 5)
}

function getMousePos(event) {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }
}

function findPointAtPosition(x, y) {
  const canvas = canvasRef.value
  const width = canvas.width / 2
  const height = canvas.height / 2
  const padding = 50
  const graphWidth = width - 2 * padding
  const graphHeight = height - 2 * padding
  const { min: minValue, max: maxValue } = yAxisBounds.value
  const valueRange = maxValue - minValue

  for (let i = 0; i < props.points.length; i++) {
    const point = props.points[i]
    const px = padding + (point.t / 5) * graphWidth
    const py = height - padding - ((point.value - minValue) / valueRange) * graphHeight
    const dist = Math.sqrt(Math.pow(x - px, 2) + Math.pow(y - py, 2))

    if (dist < 15) return i
  }
  return -1
}

function handleMouseDown(event) {
  const { x, y } = getMousePos(event)
  const pointIndex = findPointAtPosition(x, y)

  if (pointIndex >= 0) {
    const isFixed = (props.type === 'position' && (pointIndex === 0 || pointIndex === props.points.length - 1)) ||
                    (props.type === 'velocity' && pointIndex === 0) ||
                    (props.type === 'acceleration' && pointIndex === 0)

    if (!isFixed) {
      dragState.value = { isDragging: true, pointIndex }
    }
  }
}

function handleMouseMove(event) {
  if (!dragState.value.isDragging) return

  const { x, y } = getMousePos(event)
  const canvas = canvasRef.value
  const width = canvas.width / 2
  const height = canvas.height / 2
  const padding = 50
  const graphWidth = width - 2 * padding
  const graphHeight = height - 2 * padding
  const { min: minValue, max: maxValue } = yAxisBounds.value
  const valueRange = maxValue - minValue

  const pointIndex = dragState.value.pointIndex
  const newPoints = [...props.points]

  // Update time (only for acceleration)
  if (props.type === 'acceleration' && pointIndex > 0 && pointIndex < newPoints.length - 1) {
    const prevPoint = newPoints[pointIndex - 1]
    const nextPoint = newPoints[pointIndex + 1]
    const newT = Math.max(prevPoint.t + 0.1, Math.min(nextPoint.t - 0.1, ((x - padding) / graphWidth) * 5))
    newPoints[pointIndex].t = newT
  }

  // Update value
  const newValue = (1 - (y - padding) / graphHeight) * valueRange + minValue

  if (props.type === 'acceleration') {
    // Clamp to -20 to 20
    newPoints[pointIndex].value = Math.max(-20, Math.min(20, newValue))
  } else if (props.type === 'position') {
    const minPos = pointIndex > 0 ? newPoints[pointIndex - 1].value + 1 : 0
    const maxPos = pointIndex < newPoints.length - 1 ? newPoints[pointIndex + 1].value - 1 : Infinity
    newPoints[pointIndex].value = Math.max(minPos, Math.min(maxPos, newValue))
  } else {
    newPoints[pointIndex].value = newValue
  }

  emit('update:points', newPoints)
}

function handleMouseUp() {
  dragState.value = { isDragging: false, pointIndex: -1 }
}

function handleClick(event) {
  if (props.type !== 'acceleration') return
  if (dragState.value.isDragging) return

  const { x, y } = getMousePos(event)
  const pointIndex = findPointAtPosition(x, y)
  if (pointIndex >= 0) return // Clicked on existing point

  const canvas = canvasRef.value
  const width = canvas.width / 2
  const height = canvas.height / 2
  const padding = 50
  const graphWidth = width - 2 * padding
  const graphHeight = height - 2 * padding
  const { min: minValue, max: maxValue } = yAxisBounds.value
  const valueRange = maxValue - minValue

  const t = ((x - padding) / graphWidth) * 5
  let value = (1 - (y - padding) / graphHeight) * valueRange + minValue

  // Clamp to -20 to 20 for acceleration
  value = Math.max(-20, Math.min(20, value))

  if (t > 0 && t < 5) {
    const newPoints = [...props.points, { t, value }]
    newPoints.sort((a, b) => a.t - b.t)
    emit('update:points', newPoints)
  }
}

function handleContextMenu(event) {
  if (props.type !== 'acceleration') return

  const { x, y } = getMousePos(event)
  const pointIndex = findPointAtPosition(x, y)

  if (pointIndex > 0 && pointIndex < props.points.length - 1) {
    const newPoints = [...props.points]
    newPoints.splice(pointIndex, 1)
    emit('update:points', newPoints)
  }
}

const hintText = computed(() => {
  if (props.type === 'acceleration') return 'Click to add • Drag points • Right-click to remove'
  return 'Drag corresponding points to adjust'
})

onMounted(() => {
  setupCanvas()
  drawGraph()

  window.addEventListener('resize', () => {
    setupCanvas()
    drawGraph()
  })
})

watch([() => props.data, () => props.points], () => {
  drawGraph()
}, { deep: true })
</script>

<style scoped>
.v-card {
  height: 100%;
}
canvas {
  cursor: crosshair;
}
</style>