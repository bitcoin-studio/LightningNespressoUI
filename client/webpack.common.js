require('dotenv').config();
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const DotenvPlugin = require('dotenv-webpack');

const clientDir = path.resolve(__dirname);
const serverDir = path.resolve(__dirname, '../server');
const publicPath = '/';

// Loaders, determine what files we can import and how they're compiled
const typescriptLoader = {
  test: /\.tsx?$/,
  use: [
    {
      loader: 'ts-loader',
      options: { transpileOnly: true },
    },
  ],
};
const cssLoader = {
  test: /\.css$/,
  use: [
    'style-loader',
    'css-loader',
  ].filter(Boolean),
};
const sassLoader = {
  test: /\.scss$/,
  use: [
    ...cssLoader.use,
    'sass-loader',
  ],
};
const fileLoader = {
  test: /\.(png|jpg|woff|woff2|eot|ttf|svg|ico)$/,
  use: [{
    loader: 'file-loader',
    options: {
      publicPath,
      name: '[folder]/[name].[ext]',
    },
  }],
}

// Plugins run additional functionality on our build
const plugins = [
  // Adds our .env variables to the build
  new DotenvPlugin({ systemvars: true }),
  // Takes our index.html template, and injects our build into it
  new HtmlWebpackPlugin({
    template: `${clientDir}/index.html`,
    inject: true,
    favicon: 'client/assets/favicon.ico'
  }),
];

module.exports = {
  name: 'main',
  target: 'web',
  entry: path.join(clientDir, 'index.tsx'),
  output: {
    path: path.join(clientDir, 'public'),
    filename: '[name].bundle.js',
    publicPath,
    chunkFilename: '[name].chunk.js',
  },
  module: {
    rules: [
      typescriptLoader,
      sassLoader,
      cssLoader,
      fileLoader,
    ],
  },
  plugins,
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.mjs', '.json'],
    modules: [clientDir, path.join(__dirname, '../node_modules')],
  }
};