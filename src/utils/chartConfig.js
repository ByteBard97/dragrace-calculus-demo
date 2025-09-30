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