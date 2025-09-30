import { reactive } from 'vue'
import { usePhysics } from './usePhysics'

export function useSimulation() {
  const physics = usePhysics()

  const state = reactive({
    time: [],
    accel: [],
    velocity: [],
    position: [],
    currentTime: 0,
    realElapsedTime: 0, // Actual real-world time elapsed
    maxTime: 5,
    dt: 0.01,
    isPlaying: false,
    lockEndVelocity: true,
    accelPoints: [
      { t: 0, value: 0 },
      { t: 1.5, value: 15 },
      { t: 3, value: -20 },
      { t: 5, value: 0 }
    ],
    velocityPoints: [],
    positionPoints: []
  })

  let animationId = null

  function enforceZeroEndVelocity() {
    if (!state.lockEndVelocity) return

    const pts = [...state.accelPoints].sort((a, b) => a.t - b.t)
    let area = 0
    for (let i = 0; i < pts.length - 1; i++) {
      const dt = pts[i + 1].t - pts[i].t
      area += 0.5 * (pts[i].value + pts[i + 1].value) * dt
    }
    // Apply uniform bias to make area == 0
    const bias = -area / state.maxTime
    for (const p of state.accelPoints) {
      p.value += bias
    }
  }

  function computeFromAcceleration() {
    enforceZeroEndVelocity()
    const result = physics.computeFromAcceleration(
      state.accelPoints,
      state.maxTime,
      state.dt
    )
    Object.assign(state, result)
  }

  function updateAcceleration(newPoints) {
    state.accelPoints = newPoints
    computeFromAcceleration()
  }

  function presetEaseInOut() {
    const T = state.maxTime
    const A = 18
    state.accelPoints = [
      { t: 0, value: 0 },
      { t: 0.30 * T, value: +A },
      { t: 0.70 * T, value: -A },
      { t: T, value: 0 }
    ]
    computeFromAcceleration()
  }

  function updateVelocity(newPoints) {
    state.velocityPoints = newPoints
    const result = physics.computeFromVelocity(
      state.velocityPoints,
      state.accelPoints,
      state.maxTime,
      state.dt
    )
    Object.assign(state, result)
  }

  function updatePosition(newPoints) {
    state.positionPoints = newPoints
    const result = physics.computeFromPosition(
      state.positionPoints,
      state.velocityPoints,
      state.accelPoints,
      state.maxTime,
      state.dt
    )
    Object.assign(state, result)
  }

  function play() {
    if (state.currentTime >= state.maxTime) {
      state.currentTime = 0
      state.realElapsedTime = 0
    }
    state.isPlaying = true
    lastFrameTime = null
    animationId = requestAnimationFrame(animate)
  }

  function pause() {
    state.isPlaying = false
    lastFrameTime = null
    if (animationId) cancelAnimationFrame(animationId)
  }

  function step() {
    pause()
    state.currentTime = Math.min(state.currentTime + 0.1, state.maxTime)
  }

  function reset() {
    pause()
    state.currentTime = 0
    state.realElapsedTime = 0
    state.accelPoints = [
      { t: 0, value: 0 },
      { t: 1.5, value: 15 },
      { t: 3, value: -20 },
      { t: 5, value: 0 }
    ]
    computeFromAcceleration()
  }

  let lastFrameTime = null
  let animationStartTime = null

  function animate(timestamp) {
    if (!state.isPlaying) return

    if (animationStartTime === null) {
      animationStartTime = timestamp
      lastFrameTime = timestamp
    }

    const realDeltaTime = (timestamp - lastFrameTime) / 1000 // Real seconds elapsed
    lastFrameTime = timestamp

    // Update real elapsed time (actual stopwatch)
    state.realElapsedTime += realDeltaTime

    // Just advance simulation time at real-time rate
    // The position curve already encodes velocity/acceleration
    state.currentTime += realDeltaTime

    if (state.currentTime >= state.maxTime) {
      state.currentTime = state.maxTime
      pause()
      lastFrameTime = null
      animationStartTime = null
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
    reset,
    presetEaseInOut
  }
}