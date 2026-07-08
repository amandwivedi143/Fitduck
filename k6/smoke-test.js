/**
 * Quick smoke test before the full 1,000-user load test.
 *   k6 run -e BASE_URL=http://localhost k6/smoke-test.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  const health = http.get(`${BASE_URL}/api/auth/me`);
  check(health, { 'gateway up': (r) => r.status === 200 || r.status === 401 });

  const activity = http.get(`${BASE_URL}/api/activity`, {
    headers: { 'X-User-ID': 'smoke-test-user' },
  });
  check(activity, { 'activity endpoint': (r) => r.status < 500 });

  sleep(1);
}
