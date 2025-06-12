const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { DefinePlugin } = require('webpack');
const dotenv = require('dotenv')


dotenv.config();

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: {
    'popup/popup': './src/popup/popup.js',
    'content/detector': './src/content/detector.js',
    'background/service-worker': './src/background/service-worker.js',
    'services/mantleAPI': './src/services/mantleAPI.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx'],
    alias: {
      '@services': path.resolve(__dirname, 'src/services'),
    }
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        { from: 'src/manifest.json' },
        { from: 'src/popup/popup.html', to: 'popup/' },
        { from: 'src/assets', to: 'assets' }
      ]
    }),
    new DefinePlugin({
      'process.env.MANTLE_API_KEY': JSON.stringify(process.env.MANTLE_API_KEY),
    }),
  ]
};