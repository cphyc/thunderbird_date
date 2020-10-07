const path = require('path');

module.exports = {
  entry: './change_message.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'change_message.js'
  },
  mode: "production"
};