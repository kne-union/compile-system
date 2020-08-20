const path = require('path');
const {getImportMap} = require('../index');
const merge = require('lodash/merge');
const ExternalModuleFactoryPlugin = require('webpack/lib/ExternalModuleFactoryPlugin');

class InjectImportMapsPlugin {
    constructor(htmlWebpackPlugin, options) {
        options = Object.assign({
            publicUrl: './system-modules',
            importMap: {}
        }, options);
        this.pluginName = 'InjectImportMapsPlugin';
        this.htmlWebpackPlugin = htmlWebpackPlugin;
        this.importMap = options.importMap;
        this.publicUrl = options.publicUrl;
    }

    apply(compiler) {
        const pkg = require(path.resolve(process.cwd(), 'package.json'));
        compiler.hooks.compile.tap(this.pluginName, (params) => {
            new ExternalModuleFactoryPlugin(
                compiler.options.output.libraryTarget,
                Object.keys(pkg.dependencies)
            ).apply(params.normalModuleFactory);
        });

        compiler.hooks.compilation.tap(this.pluginName, (compilation) => {
            compiler.options.externals = [];
            const hooks = this.htmlWebpackPlugin.getHooks(compilation);
            hooks.alterAssetTagGroups.tapAsync(this.pluginName, (assets, callback) => {
                const getModuleInfo = async () => {
                    const {dependencies} = pkg;
                    return merge(...await Promise.all(Object.keys(Object.assign({}, dependencies)).map((name) => {
                        return getImportMap({name, version: dependencies[name], baseUrl: this.publicUrl},this.importMap);
                    })));
                };

                getModuleInfo().then((importMap) => {
                    assets.headTags = [
                        {
                            tagName: 'script',
                            attributes: {
                                type: 'systemjs-importmap'
                            },
                            innerHTML: JSON.stringify(merge({}, importMap, this.importMap)),
                            closeTag: true
                        }, {
                            tagName: 'script',
                            voidTag: false,
                            attributes: {
                                src: 'https://cdn.jsdelivr.net/npm/systemjs@6.4.2/dist/s.min.js'
                            }
                        }, {
                            tagName: 'script',
                            voidTag: false,
                            attributes: {
                                src: 'https://cdn.jsdelivr.net/npm/systemjs/dist/extras/amd.js'
                            }
                        }, {
                            tagName: 'script',
                            voidTag: false,
                            attributes: {
                                src: 'https://cdn.jsdelivr.net/npm/systemjs-css-extra@1.0.2/dist/css.min.js'
                            }
                        }
                    ];
                    assets.bodyTags = [{
                        tagName: 'script',
                        innerHTML: assets.bodyTags.map(({attributes}, index) => {
                            if (index === 0) {
                                return `System.import(".${attributes.src}")`
                            } else {
                                return `then(()=>System.import(".${attributes.src}"))`
                            }
                        }).join('.'),
                        closeTag: true
                    }];
                    callback();
                });
            });

        });
    }
}

module.exports = InjectImportMapsPlugin;