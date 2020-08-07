const path = require('path');
const fs = require('fs-extra');
const semver = require('semver');
const moduleVersionSort = require('./moduleVersionSort');

module.exports = async ({name, version = '*'}) => {
  const moduleDir = path.resolve(process.cwd(), './system-modules/', name);
  if (!await fs.exists(moduleDir)) {
    return null;
  }
  const moduleVersionList = await fs.readdir(moduleDir);
  if (!moduleVersionList) {
    return null;
  }

  const satisfies = moduleVersionList.filter((v) => semver.satisfies(v, version)).sort(moduleVersionSort);
  if (satisfies.length > 0) {
    return satisfies[0];
  }
  return null;
};
