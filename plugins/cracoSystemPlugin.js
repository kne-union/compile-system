const paths = require('../lib/paths');
const path = require('path');
const SystemModulePlugin = require('./SystemModulePlugin');
const InjectImportMapsPlugin = require('./InjectImportMapsPlugin');
const CompileModulesPlugin = require('./CompileModulesPlugin');
const pkg = require('../lib/pkg');

module.exports = {
    overrideWebpackConfig: ({webpackConfig, pluginOptions, context: {env}}) => {
        const whenProd = (callback)=>{
            env === 'production' && callback();
        };

        const whenDev = (callback)=>{
            env === 'development' && callback();
        };

        pluginOptions = Object.assign({
            root: paths.base,
            pkg,
            imports: {},
            publicUrl: '/',
        }, pluginOptions);

        if (pluginOptions.entry) {
            webpackConfig.entry = pluginOptions.entry;
        }

        webpackConfig.output.path = path.join(paths.modulePath, pluginOptions.pkg.name, pluginOptions.pkg.version);
        webpackConfig.output.filename = 'index.js';
        webpackConfig.output.chunkFilename = '[name].chunk.js';

        whenProd(() => {
            ['HtmlWebpackPlugin', 'InlineChunkHtmlPlugin', 'InterpolateHtmlPlugin', 'ManifestPlugin', 'GenerateSW'].forEach((name) => {
                const index = webpackConfig.plugins.findIndex((plugin) => {
                    return plugin.constructor.name === name
                });

                if (index > -1) {
                    webpackConfig.plugins.splice(index, 1);
                }
            });
        });

        whenDev(() => {
            webpackConfig.plugins.push(new InjectImportMapsPlugin(pluginOptions.HtmlWebpackPlugin || require('html-webpack-plugin'), {
                importMap: {
                    imports: pluginOptions.imports
                },
                publicUrl: pluginOptions.publicUrl
            }), new CompileModulesPlugin({
                imports: pluginOptions.imports
            }));
        });

        webpackConfig.plugins.push(new SystemModulePlugin({pkg: pluginOptions.pkg}));

        delete webpackConfig.optimization.runtimeChunk;

        whenProd(()=>{
            delete webpackConfig.optimization;
        });

        webpackConfig.output.libraryTarget = 'umd';
        webpackConfig.output.library = pluginOptions.pkg.name;

        return webpackConfig;
    },
    overrideDevServerConfig: ({devServerConfig, context: {paths}}) => {
        devServerConfig.contentBase = path.resolve(paths.appPath, 'system-modules');
        return devServerConfig;
    }
};