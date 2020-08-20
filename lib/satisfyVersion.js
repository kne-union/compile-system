const path = require('path');
const fs = require('fs-extra');
const semver = require('semver');
const moduleVersionSort = require('./moduleVersionSort');
const get = require('lodash/get');

const getSatisfyVersion = ({name, version}, list) => {
    const importedSatisfies = (list || []).filter((v) => semver.satisfies(v, version)).sort(moduleVersionSort);

    if (importedSatisfies.length > 0) {
        return importedSatisfies[0];
    }
    return null;
}

const computedServerSatisfyVersion = async ({name, version = '*'}) => {
    const moduleDir = path.resolve(process.cwd(), './system-modules/', name);
    if (!await fs.exists(moduleDir)) {
        return null;
    }
    const moduleVersionList = await fs.readdir(moduleDir);
    if (!moduleVersionList) {
        return null;
    }

    return getSatisfyVersion({name, version}, moduleVersionList);
};

const computedSatisfyVersion = async ({name, version}, imported = {}) => {
    const importedSatisfies = getSatisfyVersion({name, version}, get(imported, name, []));

    if (importedSatisfies !== null) {
        return importedSatisfies;
    }

    const satisfyVersion = await computedServerSatisfyVersion({name, version});

    if (satisfyVersion !== null) {
        return satisfyVersion;
    }

    return null;
};

module.exports = {
    getSatisfyVersion, computedServerSatisfyVersion, computedSatisfyVersion
};
