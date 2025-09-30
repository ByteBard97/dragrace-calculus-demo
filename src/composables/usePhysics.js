export function usePhysics() {
  function interpolateLinear(points, t) {
    const sorted = [...points].sort((a, b) => a.t - b.t);

    if (t <= sorted[0].t) return sorted[0].value;
    if (t >= sorted[sorted.length - 1].t) return sorted[sorted.length - 1].value;

    for (let i = 0; i < sorted.length - 1; i++) {
      if (t >= sorted[i].t && t <= sorted[i + 1].t) {
        const ratio = (t - sorted[i].t) / (sorted[i + 1].t - sorted[i].t);
        return sorted[i].value + ratio * (sorted[i + 1].value - sorted[i].value);
      }
    }

    return 0;
  }

  function computeQuadraticSegment(t0, v0, a0, t1, v1, a1, t) {
    const dt = t1 - t0;
    const tau = (t - t0) / dt;
    const v_mid = (v0 + v1) / 2 + (a0 - a1) * dt / 8;
    const v = (1-tau)*(1-tau)*v0 + 2*(1-tau)*tau*v_mid + tau*tau*v1;
    return v;
  }

  function computeCubicSegment(t0, x0, v0, t1, x1, v1, t) {
    const dt = t1 - t0;
    const tau = (t - t0) / dt;
    const h00 = 2*tau*tau*tau - 3*tau*tau + 1;
    const h10 = tau*tau*tau - 2*tau*tau + tau;
    const h01 = -2*tau*tau*tau + 3*tau*tau;
    const h11 = tau*tau*tau - tau*tau;
    return h00 * x0 + h10 * dt * v0 + h01 * x1 + h11 * dt * v1;
  }

  function computeFromAcceleration(accelPoints, maxTime, dt) {
    const time = [];
    const accel = [];
    const velocity = [];
    const position = [];

    const sorted = [...accelPoints].sort((a, b) => a.t - b.t);
    const velocityPoints = [];
    const positionPoints = [];

    // First pass: compute raw velocity and position values
    let v_cumulative = 0;
    let x_cumulative = 0;
    let velocityAtPoints = [0];
    let positionAtPoints = [0];

    for (let i = 0; i < sorted.length - 1; i++) {
      const dt_seg = sorted[i + 1].t - sorted[i].t;
      const a_avg = (sorted[i].value + sorted[i + 1].value) / 2;
      v_cumulative += a_avg * dt_seg;
      velocityAtPoints.push(v_cumulative);

      const v0 = velocityAtPoints[i];
      const v1 = v_cumulative;
      const a0 = sorted[i].value;
      const a1 = sorted[i + 1].value;

      const dx = (v0 + v1) * dt_seg / 2 + (a0 - a1) * dt_seg * dt_seg / 12;
      x_cumulative += dx;
      positionAtPoints.push(x_cumulative);
    }

    // No scaling - let physics be realistic

    // Create velocity and position control points
    for (let i = 0; i < sorted.length; i++) {
      velocityPoints.push({
        t: sorted[i].t,
        value: velocityAtPoints[i],
        isDraggable: i > 0 && i < sorted.length - 1
      });

      positionPoints.push({
        t: sorted[i].t,
        value: positionAtPoints[i],
        isDraggable: i > 0 && i < sorted.length - 1
      });
    }

    // Generate smooth time series data
    for (let t_curr = 0; t_curr <= maxTime; t_curr += dt) {
      time.push(t_curr);
      accel.push(interpolateLinear(accelPoints, t_curr));

      let v = 0;
      for (let i = 0; i < sorted.length - 1; i++) {
        if (t_curr >= sorted[i].t && t_curr <= sorted[i + 1].t) {
          v = computeQuadraticSegment(
            sorted[i].t, velocityAtPoints[i], sorted[i].value,
            sorted[i + 1].t, velocityAtPoints[i + 1], sorted[i + 1].value,
            t_curr
          );
          break;
        } else if (t_curr > sorted[sorted.length - 1].t) {
          v = velocityAtPoints[velocityAtPoints.length - 1];
        }
      }
      velocity.push(v);

      let x = 0;
      for (let i = 0; i < sorted.length - 1; i++) {
        if (t_curr >= sorted[i].t && t_curr <= sorted[i + 1].t) {
          x = computeCubicSegment(
            sorted[i].t, positionAtPoints[i], velocityAtPoints[i],
            sorted[i + 1].t, positionAtPoints[i + 1], velocityAtPoints[i + 1],
            t_curr
          );
          break;
        } else if (t_curr > sorted[sorted.length - 1].t) {
          x = positionAtPoints[positionAtPoints.length - 1];
        }
      }
      position.push(x);
    }

    return {
      time,
      accel,
      velocity,
      position,
      velocityPoints,
      positionPoints
    };
  }

  function computeFromVelocity(velocityPoints, accelPoints, maxTime, dt) {
    const sorted = [...accelPoints].sort((a, b) => a.t - b.t);

    for (let i = 1; i < velocityPoints.length - 1; i++) {
      if (i < sorted.length) {
        const v_prev = velocityPoints[i - 1].value;
        const v_curr = velocityPoints[i].value;
        const t_prev = velocityPoints[i - 1].t;
        const t_curr = velocityPoints[i].t;
        const dt_seg = t_curr - t_prev;

        if (dt_seg > 0) {
          const dv = v_curr - v_prev;
          const a_avg = dv / dt_seg;

          const accelPoint = accelPoints.find(p => Math.abs(p.t - t_curr) < 0.01);
          if (accelPoint) {
            accelPoint.value = 2 * a_avg - accelPoints[i - 1].value;
          }
        }
      }
    }

    return computeFromAcceleration(accelPoints, maxTime, dt);
  }

  function computeFromPosition(positionPoints, velocityPoints, accelPoints, maxTime, dt) {
    for (let i = 1; i < positionPoints.length - 1; i++) {
      const x_prev = positionPoints[i - 1].value;
      const x_curr = positionPoints[i].value;
      const x_next = positionPoints[i + 1].value;
      const t_prev = positionPoints[i - 1].t;
      const t_curr = positionPoints[i].t;
      const t_next = positionPoints[i + 1].t;

      const v_est = ((x_curr - x_prev) / (t_curr - t_prev) +
                     (x_next - x_curr) / (t_next - t_curr)) / 2;

      velocityPoints[i].value = v_est;
    }

    return computeFromVelocity(velocityPoints, accelPoints, maxTime, dt);
  }

  return {
    computeFromAcceleration,
    computeFromVelocity,
    computeFromPosition
  };
}