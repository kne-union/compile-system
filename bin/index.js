#!/usr/bin/env node
const Webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server/lib/Server');
const fs = require('fs-extra');
const path = require('path');
const omit = require('lodash/omit');
const template = require('lodash/template');
const detectPort = require('detect-port');
const getWebpackConfig = require('../lib/getWebpackConfig');
const {buildPackage, getModule} = require('../index');

class SystemHtmlWebpackPlugin {
  constructor(options) {
    this.options = Object.assign({}, options);
  }

  apply(compiler) {
    const afterEmit = async (compilation) => {
      const systemModule = (() => {
        const json = compilation.assets['system-module.json'];
        return JSON.parse(json.source());
      })();

      const htmlFile = await fs.readFile(this.options.template);
      const htmlContent = template(htmlFile)({
        moduleName: systemModule.name,
        importmap: JSON.stringify(this.options.importmap),
        scriptList: `<script>
          ${[...systemModule.assets.js, ...systemModule.assets.css].map((str) => {
          return `System.import("./${str}");`
        }).join('')}
        </script>`
      });

      compilation.assets['index.html'] = {
        source() {
          return htmlContent;
        },
        size() {
          return htmlContent.length;
        }
      };

    };
    if (compiler.hooks) {
      const plugin = {name: 'SystemHtmlWebpackPlugin'};

      compiler.hooks.emit.tapPromise(plugin, afterEmit);
    } else {
      compiler.plugin('emit', afterEmit);
    }
  }
}

const start = async () => {
  process.env.NODE_ENV = 'development';
  const dir = process.cwd();

  const {dependencies} = await fs.readJson(path.resolve(dir, 'package.json'));

  await Promise.all(Object.keys(dependencies).map((name) => buildPackage({name, version: dependencies[name]})));

  const serverConfig = {
    template: path.resolve(__dirname, './index.html'),
    port: await detectPort(),
    contentBase: path.resolve(dir, 'system-modules')
  };
  const {devServer, ...webpackConfig} = await getWebpackConfig(dir);

  Object.assign(serverConfig, devServer);

  const requireModule = await getModule(Object.keys(dependencies).map((name) => ({name, version: dependencies[name]})));

  webpackConfig.plugins.push(new SystemHtmlWebpackPlugin({
    template: serverConfig.template,
    importmap: {
      imports: (() => {
        const output = {};
        requireModule.forEach(({name, version, assets, main}) => {
          output[name] = `/${name}/${version}/${main}`;
        });
        return output;
      })()
    }
  }));

  const compiler = Webpack(webpackConfig);

  const devServerOptions = Object.assign({}, serverConfig, {
    open: true,
    stats: {
      colors: true,
    },
  });
  const server = new WebpackDevServer(compiler, omit(devServerOptions, ['port', 'template']));

  server.listen(serverConfig.port, () => {
    console.log(`Starting server on http://localhost:${serverConfig.port}`);
  });
};

start().then(() => {
  console.log('-------------Success--------------');
}, (err) => {
  throw err;
});
