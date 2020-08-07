const spawn = require('cross-spawn');

module.exports = async (command, options) => {
  const ls = command.split(' ').filter((str) => !!str);
  await new Promise((resolve, reject) => {
    const child = spawn(ls[0], [...ls.slice(1)], options);

    child.stdout.on('data', (data) => {
      console.log(data.toString());
    });

    child.stderr.on('data', (data) => {
      console.error(data.toString());
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject();
      }
    });
  });
};
