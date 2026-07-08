/**
 * FitTrack k6 Load Test — 1,000 Concurrent Virtual Users
 *
 * Run against a deployed instance (Docker or Minikube):
 *   k6 run -e BASE_URL=http://localhost k6/load-test.js
 *   k6 run -e BASE_URL=http://$(minikube ip) k6/load-test.js
 *
 * With HTML report:
 *   k6 run --out json=k6/results.json -e BASE_URL=http://localhost k6/load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost';
const TEST_USER_ID = __ENV.TEST_USER_ID || 'load-test-user-001';

const errorRate = new Rate('errors');
const activityPostDuration = new Trend('activity_post_duration', true);
const recommendationGetDuration = new Trend('recommendation_get_duration', true);
const healthChecks = new Counter('health_checks');

export const options = {
  scenarios: {
    ramp_to_1000: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 200 },   // warm-up
        { duration: '3m', target: 1000 },  // ramp to 1,000 concurrent users
        { duration: '5m', target: 1000 },  // sustain peak load
        { duration: '2m', target: 0 },     // ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],  // 95% of requests under 3s
    http_req_failed: ['rate<0.05'],     // error rate under 5%
    errors: ['rate<0.05'],
  },
};

const ACTIVITY_TYPES = ['RUNNING', 'CYCLING', 'CARDIO', 'WEIGHTLIFTING', 'JUMPING'];

function randomActivity() {
  const type = ACTIVITY_TYPES[Math.floor(Math.random() * ACTIVITY_TYPES.length)];
  return JSON.stringify({
    type,
    duration: 20 + Math.floor(Math.random() * 60),
    caloriesBurned: 100 + Math.floor(Math.random() * 400),
    startTime: new Date().toISOString().slice(0, 19),
    additionalMetrics: { heartRate: 120 + Math.floor(Math.random() * 40) },
  });
}

export default function () {
  group('Health & Gateway', () => {
    const gatewayHealth = http.get(`${BASE_URL}/api/auth/me`, {
      tags: { name: 'GET /api/auth/me' },
    });
    healthChecks.add(1);
    const ok = check(gatewayHealth, {
      'gateway responds': (r) => r.status === 200 || r.status === 401,
    });
    errorRate.add(!ok);
  });

  group('Activity API (read-heavy)', () => {
    const res = http.get(`${BASE_URL}/api/activity`, {
      headers: { 'X-User-ID': TEST_USER_ID },
      tags: { name: 'GET /api/activity' },
    });
    const ok = check(res, {
      'activity list status 200 or 401': (r) => r.status === 200 || r.status === 401,
    });
    errorRate.add(!ok);
  });

  group('Activity API (write)', () => {
    const start = Date.now();
    const res = http.post(`${BASE_URL}/api/activity`, randomActivity(), {
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': TEST_USER_ID,
      },
      tags: { name: 'POST /api/activity' },
    });
    activityPostDuration.add(Date.now() - start);
    const ok = check(res, {
      'activity create 201 or 401': (r) => r.status === 201 || r.status === 401 || r.status === 200,
    });
    errorRate.add(!ok);
  });

  group('Recommendations API', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/recommendation/user/${TEST_USER_ID}`, {
      tags: { name: 'GET /api/recommendation/user' },
    });
    recommendationGetDuration.add(Date.now() - start);
    const ok = check(res, {
      'recommendations 200 or 401': (r) => r.status === 200 || r.status === 401,
    });
    errorRate.add(!ok);
  });

  group('Eureka (internal smoke)', () => {
    // Only when BASE_URL points to gateway; skip if unavailable
    const res = http.get(`${BASE_URL}/actuator/health`, {
      tags: { name: 'GET /actuator/health' },
    });
    check(res, { 'actuator reachable or 404': (r) => r.status === 200 || r.status === 404 });
  });

  sleep(Math.random() * 2 + 0.5);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] ?? 0;
  const failed = data.metrics.http_req_failed?.values?.rate ?? 0;
  const vusMax = data.metrics.vus_max?.values?.max ?? 0;

  return {
  stdout: `
╔══════════════════════════════════════════════════════════════╗
║           FitTrack k6 Load Test — Summary                    ║
╠══════════════════════════════════════════════════════════════╣
║  Peak concurrent VUs     : ${String(vusMax).padEnd(33)}║
║  p(95) response time     : ${String(p95.toFixed(2) + ' ms').padEnd(33)}║
║  HTTP failure rate       : ${String((failed * 100).toFixed(2) + '%').padEnd(33)}║
║  Target                  : 1,000 concurrent users            ║
╚══════════════════════════════════════════════════════════════╝
`,
  };
}
