const pick = require('lodash/pick');
const pkg = require('../lib/pkg');

class SystemModulePlugin {
    constructor(args) {
        args = Object.assign({
            options: {},
            pkg
        }, args);
        this.pkg = args.pkg;
        this.options = args.options;
        this.pluginName = 'SystemModulePlugin';
    }

    apply(compiler) {
        compiler.hooks.emit.tapPromise(this.pluginName, async (compilation) => {
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


            const content = JSON.stringify(
                Object.assign(
                    {'main': compiler.options.output.filename},
                    pick(this.pkg, 'name', 'version', 'dependencies'),
                    this.options, {assets, moduleType: this.pkg.moduleType === 'module' ? 'module' : 'package'}
                )
            );


            compilation.assets['system-module.json'] = {
                source() {
                    return content;
                },
                size() {
                    return content.length;
                }
            };
        });
    }
}

module.exports = SystemModulePlugin;