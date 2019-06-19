const merge = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'cheap-module-inline-source-map',
  devServer: {
    port: 3000,
    hot: true,
    stats: 'minimal',
  },
})