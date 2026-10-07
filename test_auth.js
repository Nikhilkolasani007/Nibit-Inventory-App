const http = require('http');

const data = JSON.stringify({
  email: 'kolasaninikhil1@gmail.com',
  password: '9441166030@Nk',
  website: 'www.nikhil.com'
});

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
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(data);
req.end();
