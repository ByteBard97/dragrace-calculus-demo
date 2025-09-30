<template>
  <v-app>
    <v-container fluid>
      <v-row>
        <v-col cols="12" class="text-center">
          <img src="/drag-race-logo.webp" alt="Drag Race Physics" style="max-width: 500px; width: 100%; height: auto; margin: 20px auto;" />
          <p class="text-subtitle-1 mb-6">
            Drag points to see how acceleration, velocity, and position relate through calculus
          </p>
        </v-col>
      </v-row>

      <!-- Car Animation -->
      <v-row>
        <v-col cols="12">
          <CarAnimation
            :position-data="state.position"
            :current-time="state.currentTime"
            :real-elapsed-time="state.realElapsedTime"
            :max-time="state.maxTime"
            :dt="state.dt"
          />
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
            :lock-end-velocity="state.lockEndVelocity"
            @play="play"
            @pause="pause"
            @step="step"
            @reset="reset"
            @preset-ease="presetEaseInOut"
            @update:lockEndVelocity="state.lockEndVelocity = $event"
          />
        </v-col>
      </v-row>

      <!-- Info Boxes -->
      <v-row>
        <v-col cols="12" md="6" v-for="info in infoBoxes" :key="info.title">
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

const { state, updateAcceleration, updateVelocity, updatePosition, play, pause, step, reset, presetEaseInOut } = useSimulation()

const infoBoxes = [
  {
    title: 'Mathematical Relationships',
    content: '<p><strong>Velocity</strong> is the integral of acceleration over time</p><p><strong>Position</strong> is the integral of velocity over time</p><p>Going backwards: acceleration is the derivative of velocity, velocity is the derivative of position</p>'
  },
  {
    title: 'How to Use',
    content: '<p>Drag the control points on any graph to modify the motion</p><p>Changes propagate through the integral/derivative relationships</p><p>Use the controls to animate the car along the track</p>'
  }
]
</script>

<style>
html {
  background: linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%);
}
</style>