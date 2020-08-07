const path = require('path');
const fs = require('fs-extra');
const semver = require('semver');
const get = require('lodash/get');
const uniqWith = require('lodash/uniqWith');
const getCurrentModule = require('./getCurrentModule');
const moduleVersionSort = require('./moduleVersionSort');

const getModule = async ({name, version = '*'}, imported = {}) => {
  const satisfyVersion = await (() => {
    const importedSatisfies = get(imported, name, []).filter((v) => semver.satisfies(v, version)).sort(moduleVersionSort);
    if (importedSatisfies.length > 0) {
      return importedSatisfies[0];
    }

    return getCurrentModule({name, version});
  })();

  if (!satisfyVersion) {
    return null;
  }

  const moduleDir = path.resolve(process.cwd(), './system-modules/', name);
  return await fs.readJson(path.resolve(moduleDir, `${satisfyVersion}/system-module.json`));
}

module.exports = async (blockList, imported = {}) => {
  if (!Array.isArray(blockList)) {
    blockList = [blockList];
  }
  const output = [];
  const core = async (block, imported) => {
    const module = await getModule(block, imported);
    output.splice(0, 0, module);
    if (!imported[block.name]) {
      imported[block.name] = [];
    }
    imported[block.name].indexOf(module.version) === -1 && imported[block.name].push(module.version);

    for (let name in module.dependencies) {
      const version = module.dependencies[name];
      await core({name, version}, imported);
    }
  };

  for (let block of blockList) {
    await core(block, imported);
  }

  return uniqWith(output, (a, b) => a.name === b.name && a.version === b.version);
};
