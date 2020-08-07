const fs = require('fs-extra');
const tempy = require('tempy');
const spawn = require('./lib/spawnPromise');
const traverse = require('./lib/traverse');
const getModule = require('./lib/getModule');
const getCurrentModule = require('./lib/getCurrentModule');

const buildPackage = async ({name, version}) => {
  process.env.NODE_ENV = 'production';

  const module = await getCurrentModule({name, version});
  if (module) {
    return;
  }

  const dir = tempy.directory();
  await spawn(`npm i --production ${name}@${version || '*'}`, {
    cwd: dir
  });
  await traverse(dir);
  await fs.remove(dir);
};

module.exports = {
  buildPackage, getModule
};
