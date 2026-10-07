const http = require('http');

function testLogin(payload, label) {
  const data = JSON.stringify(payload);
  const req = http.request({
    hostname: 'localhost',
    port: 80,
    path: '/api_mobile/auth.php',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log(`\n=== ${label} (HTTP ${res.statusCode}) ===`);
      console.log(body);
    });
  });

  req.on('error', (e) => console.error(`${label} Error:`, e.message));
  req.write(data);
  req.end();
}

// Test 1: Employee login with valid credentials (EMP101, 1234)
testLogin({ empid: 'EMP101', code: '1234' }, 'TEST 1: Valid Employee Login (EMP101, 1234)');

// Test 2: Employee login with invalid credentials (EMP101, 9999)
setTimeout(() => {
  testLogin({ empid: 'EMP101', code: '9999' }, 'TEST 2: Invalid PIN Employee Login (EMP101, 9999)');
}, 300);

// Test 3: Admin login (kolasaninikhil1@gmail.com)
setTimeout(() => {
  testLogin({
    email: 'kolasaninikhil1@gmail.com',
    password: '9441166030@Nk',
    website: 'www.nikhil.com'
  }, 'TEST 3: Admin Login');
}, 600);
