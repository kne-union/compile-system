const webpack = require('webpack');
const getWebpackConfig = require('./getWebpackConfig');

module.exports = async (entry) => {
  const webpackConfig = await getWebpackConfig(entry);
  await new Promise((resolve, reject) => {
    webpack(webpackConfig, (err, states) => {
      if (err || states.hasErrors()) {
        return reject(err);
      }
      resolve(states);
    });
  });
};
