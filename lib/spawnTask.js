const {getInstance} = require('../lib/task');

const [packageName,version] = process.argv;

const task = getInstance({name: packageName, version});
task.build();