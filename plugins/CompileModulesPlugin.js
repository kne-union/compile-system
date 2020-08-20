const {getInstance} = require('../lib/task');
const get = require('lodash/get');
const pkg = require('../lib/pkg');

class CompileModulesPlugin {
    constructor(args) {
        args = Object.assign({
            imports: {}
        }, args);
        this.imports = args.imports;
        this.pluginName = 'CompileModulesPlugin';
    }

    apply(compiler) {
        compiler.hooks.beforeCompile.tapPromise(this.pluginName, async () => {
            const {dependencies, peerDependencies} = pkg;
            const list = Object.assign({}, peerDependencies, dependencies);
            for (let name in list) {
                if (this.imports[name]) {
                    return;
                }
                const version = list[name];
                const task = getInstance({name, version});
                await task.build();
            }
        });
    }
}

module.exports = CompileModulesPlugin;