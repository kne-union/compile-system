const path = require('path');

const base = process.cwd();
const modulePath = path.resolve(base, 'system-modules');
const packageJson = path.resolve(base, 'package.json');
const systemModuleJsonFileName = 'system-module.json';
const getModulePath = ({name, version}) => {
    return path.resolve(modulePath, name, version);
};

const getSystemModuleJson = ({name, version}) => {
    return path.join(getModulePath({name, version}), systemModuleJsonFileName);
}

module.exports = {
    base, modulePath, packageJson, getModulePath, systemModuleJsonFileName, getSystemModuleJson
};