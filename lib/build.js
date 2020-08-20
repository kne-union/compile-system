const webpack = require('webpack');

module.exports = async (webpackConfig) => {
  await new Promise((resolve, reject) => {
    webpack(webpackConfig, (err, states) => {
      if (err || states.hasErrors()) {
        console.error(states);
        return reject(err);
      }
      resolve(states);
    });
  });
};
