const path = require("path");
const webpack = require("webpack");
const nodeExternals = require("webpack-node-externals");
const StartServerPlugin = require("start-server-webpack-plugin");

module.exports = {
  entry: ["webpack/hot/poll?1000", "./src/server/index"],
  watch: true,
  target: "node",
  externals: [
    nodeExternals({
      allowlist: ["webpack/hot/poll?1000"],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(js|jsx)?$/,
        use: "babel-loader",
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    // new StartServerPlugin("server.js"),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.DefinePlugin({
      "process.env": {
        BUILD_TARGET: JSON.stringify("server"),
      },
    }),
  ],
  output: {
    path: path.join(__dirname, "prod/server"),
    filename: "server.js",
    hotUpdateChunkFilename: ".hot/[id].[fullhash].hot-update.js",
    hotUpdateMainFilename: ".hot/[runtime].[fullhash].hot-update.json",
  },
  resolve: {
    extensions: [".js", ".jsx"],
  },
  infrastructureLogging: {
    level: "info",
  },
};
