require('dotenv').config();
const mongoose = require('mongoose');
const https = require('https');
const fs = require('fs');

const options = {
    key: fs.readFileSync('./key.pem'),
    cert: fs.readFileSync('./cert.pem')
};
mongoose.connect(process.env.DATABASE, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.connection
  .on('open', () => {
    console.log('Mongoose connection open');
  })
  .on('error', (err) => {
    console.log(`Connection error: ${err.message}`);
  });

require('./models/Registration');
require('./models/Blog');
const app = require('./app');

// 创建HTTPS服务器
https.createServer(options, app).listen(5000, () => {
  console.log('HTTPS server running on https://localhost:5000/');
});