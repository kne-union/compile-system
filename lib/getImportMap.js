const paths = require('./paths');
const path = require('path');
const fs = require('fs-extra');
const ensureSlash = require('@kne/ensure-slash');
const {computedSatisfyVersion} = require('./satisfyVersion');

const transformImportedFormImportMap = ({imports = {}, scopes = {}}) => {
    const output = {};
    const core = (target, output) => {
        Object.keys(target).forEach((key) => {
            if (!output[key]) {
                output[key] = [];
            }
            const url = target[key];

            const matched = url.match(new RegExp(`${key}[@\/]([0-9]+\\.[0-9]+\\.[0-9]+.*?)\\/`));
            if (matched && matched[1]) {
                output[key].push(matched[1]);
            }
        });
    };

    core(imports, output);

    Object.values(scopes).forEach((target) => {
        core(target, output);
    });

    return output;
};

const getDepcache = ({main, name, version, assets}) => {
    const arr = [...assets.js, ...assets.css];
    const index = arr.indexOf(main);
    index > -1 && arr.splice(index, 1);
    return arr.map((file) => `${name}/${version}/${file}`);
}

const computedVersionInfo = async ({name, version = '*', baseUrl}, imported = {}) => {
    const output = {
        imports: {},
        scopes: {},
        depcache: {}
    };
    const rootName = name;
    const core = async ({name, version = '*'}, imported = {}) => {
        const satisfyVersion = await computedSatisfyVersion({name, version}, imported);

        if (!satisfyVersion) {
            return null;
        }
        const moduleInfo = await fs.readJson(path.resolve(path.resolve(paths.modulePath, name), `${satisfyVersion}/${paths.systemModuleJsonFileName}`));

        if (!imported[moduleInfo.name]) {
            imported[moduleInfo.name] = [];
        }

        imported[moduleInfo.name].push(moduleInfo.version);

        const moduleUrl = ensureSlash(baseUrl, true) + `${moduleInfo.name}/${moduleInfo.version}/${moduleInfo.main}`;

        if (rootName === name) {
            output.imports[moduleInfo.name] = moduleUrl;
        }

        const depcache = getDepcache(moduleInfo);

        if (depcache.length) {
            output.depcache[moduleUrl] = [ensureSlash(baseUrl, true) + depcache];
        }

        await Promise.all(Object.keys(moduleInfo.dependencies || {}).map((name) => {
            const version = moduleInfo.dependencies[name];
            output.scopes[moduleUrl] = {};
            return core({name, version}, imported).then((moduleInfo) => {
                if (moduleInfo) {
                    const {name, url} = moduleInfo;
                    output.scopes[moduleUrl][name] = url;
                    if (!output.depcache[moduleUrl]) {
                        output.depcache[moduleUrl] = [];
                    }
                    if (output.depcache[moduleUrl].indexOf(url) === -1) {
                        output.depcache[moduleUrl].push(url);
                    }
                }
            });
        }));

        return {...moduleInfo, url: moduleUrl};
    }

    await core({name, version});

    return output;
};

module.exports = async ({name, version = '*', baseUrl = '/'}, current = {}) => {
    //TODO: 忽略current里面已经有的版本可以兼容的包
    const imported = transformImportedFormImportMap(current);
    return await computedVersionInfo({name, version, baseUrl}, imported);
};