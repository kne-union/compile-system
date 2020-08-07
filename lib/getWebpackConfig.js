const fs = require('fs-extra');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const postcssNormalize = require('postcss-normalize');
const getCSSModuleLocalIdent = require('react-dev-utils/getCSSModuleLocalIdent');
const get = require('lodash/get');
const pick = require('lodash/pick');
const overrides = require('./overrides');
const path = require('path');

module.exports = async (entry) => {
  const cssRegex = /\.css$/;
  const cssModuleRegex = /\.module\.css$/;
  const sassRegex = /\.(scss|sass)$/;
  const sassModuleRegex = /\.module\.(scss|sass)$/;
  const getStyleLoaders = (cssOptions, preProcessor) => {
    const postcssPlugins = [require('postcss-flexbugs-fixes'),
      require('postcss-preset-env')({
        autoprefixer: {
          flexbox: 'no-2009',
        },
        stage: 3,
      }),
      // Adds PostCSS Normalize as the reset css with default options,
      // so that it honors browserslist config in package.json
      // which in turn let's users customize the target behavior as per their needs.
      postcssNormalize()];

    !cssOptions.modules&&postcssPlugins.push(require('postcss-wrap')({selector: `.module-${name}`}));

    const loaders = [
      {
        loader: MiniCssExtractPlugin.loader,
      },
      {
        loader: require.resolve('css-loader'),
        options: cssOptions,
      },
      {
        // Options for PostCSS as we reference these options twice
        // Adds vendor prefixing based on your specified browser support in
        // package.json
        loader: require.resolve('postcss-loader'),
        options: {
          // Necessary for external CSS imports to work
          // https://github.com/facebook/create-react-app/issues/2677
          ident: 'postcss',
          plugins: postcssPlugins,
          sourceMap: true
        },
      },
    ].filter(Boolean);
    if (preProcessor) {
      loaders.push(
        {
          loader: require.resolve('resolve-url-loader'),
          options: {
            sourceMap: true,
            root: entry,
          },
        },
        {
          loader: require.resolve(preProcessor),
          options: {
            sourceMap: true,
          },
        }
      );
    }
    return loaders;
  };
  const packageJSON = await fs.readJson(path.resolve(entry, 'package.json'));
  const {name, version} = packageJSON;

  const webpackConfig = (() => {
    const externals = [...Object.keys(get(packageJSON, 'peerDependencies', {})), ...Object.keys(get(packageJSON, 'dependencies', {}))];

    class EntryAssetsPlugin {
      constructor(options) {
        this.options = Object.assign({}, {
          filename: 'system-module.json',
          options: {}
        }, options);
      }

      apply(compiler) {
        const afterEmit = async (compilation) => {
          const assets = {
            js: [],
            css: []
          };
          const entryNames = Array.from(compilation.entrypoints.keys());
          const extensionRegexp = /\.(css|js)(\?|$)/;
          const entryPointPublicPathMap = {};

          for (let i = 0; i < entryNames.length; i++) {
            const entryName = entryNames[i];
            const entryPointFiles = compilation.entrypoints.get(entryName).getFiles();
            entryPointFiles.forEach((entryPointFile) => {
              const extMatch = extensionRegexp.exec(entryPointFile);
              if (!extMatch) {
                return;
              }
              // Skip if this file is already known
              // (e.g. because of common chunk optimizations)
              if (entryPointPublicPathMap[entryPointFile]) {
                return;
              }
              entryPointPublicPathMap[entryPointFile] = true;
              // ext will contain .js or .css
              const ext = extMatch[1];
              assets[ext].push(entryPointFile);
            });
          }


          const content = JSON.stringify(Object.assign({'main': compiler.options.output.filename}, pick(packageJSON, 'name', 'version', 'dependencies'), this.options.options, {assets}));
          compilation.assets[this.options.filename] = {
            source() {
              return content;
            },
            size() {
              return content.length;
            }
          };
        };

        if (compiler.hooks) {
          const plugin = {name: 'EntryAssetsWebpackPlugin'};

          compiler.hooks.emit.tapPromise(plugin, afterEmit);
        } else {
          compiler.plugin('emit', afterEmit);
        }
      }
    }

    return {
      mode: process.env.NODE_ENV,
      devtool: false,//'source-map'
      entry: path.resolve(entry, packageJSON.main || 'index.js'),
      externals,
      output: {
        path: path.resolve(process.cwd(), './system-modules/', name, version),
        filename: 'index.js',
        chunkFilename: 'chunk/[name].js',
        jsonpFunction: `microServiceJsonp${((name) => {
          const arr = name.split('');
          arr[0] = arr[0].toUpperCase();
          return arr.join('');
        })(name)}`,
        library: name,
        libraryTarget: 'umd'
      },
      module: {
        rules: [
          {parser: {system: false}},
          {
            oneOf: [
              {
                test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
                loader: require.resolve('url-loader'),
                options: {
                  limit: 10000,
                  name: 'media/[name].[ext]',
                },
              },
              {
                test: /\.(js|mjs|jsx|ts|tsx)$/,
                loader: require.resolve('babel-loader'),
                options: {
                  babelrc: false,
                  configFile: false,
                  presets: [require.resolve('babel-preset-react-app')],
                  cacheDirectory: true,
                  cacheCompression: false,
                  compact: true,
                  sourceMaps: true,
                  inputSourceMap: true
                }
              },
              {
                test: cssRegex,
                exclude: cssModuleRegex,
                use: getStyleLoaders({
                  importLoaders: 1,
                  sourceMap: true,
                }),
                // Don't consider CSS imports dead code even if the
                // containing package claims to have no side effects.
                // Remove this when webpack adds a warning or an error for this.
                // See https://github.com/webpack/webpack/issues/6571
                sideEffects: true,
              },
              // Adds support for CSS Modules (https://github.com/css-modules/css-modules)
              // using the extension .module.css
              {
                test: cssModuleRegex,
                use: getStyleLoaders({
                  importLoaders: 1,
                  sourceMap: true,
                  modules: {
                    getLocalIdent: getCSSModuleLocalIdent,
                  },
                }),
              },
              // Opt-in support for SASS (using .scss or .sass extensions).
              // By default we support SASS Modules with the
              // extensions .module.scss or .module.sass
              {
                test: sassRegex,
                exclude: sassModuleRegex,
                use: getStyleLoaders(
                  {
                    importLoaders: 3,
                    sourceMap: true,
                  },
                  'sass-loader'
                ),
                // Don't consider CSS imports dead code even if the
                // containing package claims to have no side effects.
                // Remove this when webpack adds a warning or an error for this.
                // See https://github.com/webpack/webpack/issues/6571
                sideEffects: true,
              },
              // Adds support for CSS Modules, but using SASS
              // using the extension .module.scss or .module.sass
              {
                test: sassModuleRegex,
                use: getStyleLoaders(
                  {
                    importLoaders: 3,
                    sourceMap: true,
                    modules: {
                      getLocalIdent: getCSSModuleLocalIdent,
                    },
                  },
                  'sass-loader'
                ),
              },
              // "file" loader makes sure those assets get served by WebpackDevServer.
              // When you `import` an asset, you get its (virtual) filename.
              // In production, they would get copied to the `build` folder.
              // This loader doesn't use a "test" so it will catch all modules
              // that fall through the other loaders.
              {
                loader: require.resolve('file-loader'),
                // Exclude `js` files to keep "css" loader working as it injects
                // its runtime that would otherwise be processed through "file" loader.
                // Also exclude `html` and `json` extensions so they get processed
                // by webpacks internal loaders.
                exclude: [/\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/],
                options: {
                  name: 'media/[name].[ext]',
                },
              }
            ]
          }
        ]
      },
      plugins: [
        new MiniCssExtractPlugin({
          // Options similar to the same options in webpackOptions.output
          // both options are optional
          filename: 'css/[name].css',
          chunkFilename: 'css/[id].css',
        }),
        new EntryAssetsPlugin()
      ]
    };
  })();

  //config-overrides.js
  return await overrides(webpackConfig, path.resolve(entry, 'config-overrides.js'));
};
