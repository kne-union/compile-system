const fs = require('fs-extra');
const tempy = require('tempy');
const path = require('path');
const paths = require('./paths');
const spawn = require('./spawnPromise');
const readPackageTree = require('read-package-tree');
const resolve = require('pify')(require("enhanced-resolve"));
const {computedServerSatisfyVersion} = require('./satisfyVersion');
const build = require('./build');

class Task {
    constructor({name, version}) {
        this.name = name;
        this.version = version;
        this.dir = tempy.directory();
        fs.writeFileSync(path.resolve(this.dir, 'package.json'), JSON.stringify({
            name: 'tempy-module',
            version: '1.0.0'
        }), 'utf8');
    }

    async install() {
        if (this.__isInstalled) {
            return;
        }
        await spawn(`npm i --production ${this.name}@${this.version || '*'}`, {
            cwd: this.dir
        });
        this.__isInstalled = true;
    }

    async build() {
        // TODO: 更加完整的依赖包检查，检查通过后再忽略构建
        const satisfyVersion = await computedServerSatisfyVersion({name: this.name, version: this.version});
        if (satisfyVersion !== null) {
            return;
        }
        await this.install();
        const buildCore = async (root) => {
            const pkg = require(path.resolve(root, 'package.json'));
            const {name, version, main, dependencies, peerDependencies} = pkg;
            if (await fs.exists(paths.getSystemModuleJson({name, version}))) {
                console.warn(`${name}@${version}已存在将忽略构建`);
                return
            }

            const entry = await resolve(root, path.resolve(root, main || 'index.js')).catch(() => {
                return null;
            });

            if (!entry) {
                console.warn(`${name}@${version}的入口文件不存在，已忽略构建，请自行确认这是否影响您的应用程序！`);
                return;
            }
            if (!process.env.NODE_ENV) {
                process.env.NODE_ENV = "production";
            }

            delete require.cache[require.resolve('react-scripts/config/webpack.config')];
            const webpackConfig = require('../plugins/cracoSystemPlugin').overrideWebpackConfig({
                webpackConfig: ((webpackConfig) => {
                    webpackConfig.externals = [...Object.keys(dependencies || {}), ...Object.keys(peerDependencies || {})];
                    return webpackConfig;
                })(require('react-scripts/config/webpack.config')('production')),
                context: {env: 'production'},
                pluginOptions: {
                    entry, root, pkg
                }
            });

            await build(webpackConfig);

            console.log(`${name}@${version}构建成功！`);
        };
        const tree = await readPackageTree(this.dir);
        const traverse = async (tree) => {
            tree.parent && await buildCore(tree.path);
            for (let item of tree.children) {
                await traverse(item);
            }
        }

        await traverse(tree);
    }
}

const cache = new Map();

module.exports = {
    getInstance({name, version = '*'}) {
        const key = Symbol.for(`${name}@${version}`);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const task = new Task({name, version});
        cache.set(key, task);
        return task;
    },
    async clear() {
        for (let [name, value] of cache.values()) {
            await fs.remove(value.dir);
        }
        cache.clear();
    }
};