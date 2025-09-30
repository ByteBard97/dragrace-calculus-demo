// ============================================================================
// DRAG RACE DEMO - CONFIGURATION
// ============================================================================

const CONFIG = {
    simulation: {
        maxTime: 5,          // seconds
        dt: 0.01,            // time step
        finishPosition: 100, // meters
        playbackSpeed: 2     // multiplier
    },

    canvas: {
        padding: 35,
        dpiScale: 2,
        lineWidth: 3,
        pointRadius: 6,
        hitTestRadius: 15
    },

    colors: {
        acceleration: '#FF6B6B',
        velocity: '#4ECDC4',
        position: '#45B7D1',
        grid: '#2a2a3e',
        axis: '#4a4a5e',
        background: '#1a1a2e'
    },

    graphs: {
        acceleration: {
            unit: 'm/s²',
            roundTo: 5
        },
        velocity: {
            unit: 'm/s',
            roundTo: 5,
            minRange: 10
        },
        position: {
            unit: 'm',
            roundTo: 10,
            minRange: 20
        }
    }
};