const path = require('path');

module.exports = {
  entry: './src/change_message.js',
  output: {
    path: path.resolve(__dirname, 'src/dist'),
    filename: 'change_message.bundle.js'
  },
  mode: "production"
};