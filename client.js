const net = require('net');
const client = net.createConnection(
  {
    host: '127.0.0.1',
    port: 3000,
  },
  () => {
    // 'connect' listener.
    console.log('connected to server!');
    client.write('GET / HTTP/1.1\r\n');
    client.write('Content-Type: application/x-www-form-urlencoded');
    client.write('Content-Length: 17\r\n');
    client.write('\r\n');
    client.write('field=aaa&code=22');
  }
);
client.on('data', (data) => {
  console.log(data.toString());
  client.end();
});
client.on('end', () => {
  console.log('disconnected from server');
});
