<template>
  <v-card>
    <v-card-title>Simulation Controls</v-card-title>
    <v-card-text>
      <v-row>
        <v-col cols="6" sm="3">
          <v-btn block color="primary" @click="$emit('play')" :disabled="isPlaying">
            <v-icon start>mdi-play</v-icon> Play
          </v-btn>
        </v-col>
        <v-col cols="6" sm="3">
          <v-btn block color="warning" @click="$emit('pause')" :disabled="!isPlaying">
            <v-icon start>mdi-pause</v-icon> Pause
          </v-btn>
        </v-col>
        <v-col cols="6" sm="3">
          <v-btn block color="info" @click="$emit('step')">
            <v-icon start>mdi-skip-forward</v-icon> Step
          </v-btn>
        </v-col>
        <v-col cols="6" sm="3">
          <v-btn block color="error" @click="$emit('reset')">
            <v-icon start>mdi-refresh</v-icon> Reset
          </v-btn>
        </v-col>
      </v-row>
      <v-row class="mt-2">
        <v-col cols="12" sm="6">
          <v-btn block color="success" variant="outlined" @click="$emit('preset-ease')">
            <v-icon start>mdi-animation</v-icon> Ease In-Out Preset
          </v-btn>
        </v-col>
        <v-col cols="12" sm="6">
          <v-switch
            :model-value="lockEndVelocity"
            @update:model-value="$emit('update:lockEndVelocity', $event)"
            label="Lock end velocity to 0"
            color="primary"
            hide-details
          />
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
defineProps({
  isPlaying: Boolean,
  lockEndVelocity: Boolean
})
defineEmits(['play', 'pause', 'step', 'reset', 'preset-ease', 'update:lockEndVelocity'])
</script>