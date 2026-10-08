/* eslint-env node */
const https = require('https');

function test(path, method, data, label) {
  const payload = data ? JSON.stringify(data) : null;
  const options = {
    hostname: 'nibit.in',
    path: path,
    method: method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0'
    }
  };
  if (payload) {
    options.headers['Content-Length'] = Buffer.byteLength(payload);
  }

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => {
      console.log(`\n=== ${label} (HTTP ${res.statusCode}) ===`);
      console.log(body);
    });
  });
  req.on('error', e => console.error(`${label} ERROR:`, e.message));
  if (payload) req.write(payload);
  req.end();
}

test('/admin/api.php?app_id=1', 'GET', null, 'TEST 1: GET RECORDS');

setTimeout(() => {
  test('/admin/api.php', 'POST', { email: 'shouky@gmail.com', password: '9441166030@Nk' }, 'TEST 2: ADMIN LOGIN');
}, 800);

setTimeout(() => {
  test('/admin/api.php', 'POST', { empid: 'EMP101', code: '1234' }, 'TEST 3: EMPLOYEE LOGIN');
}, 1600);
