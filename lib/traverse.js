const path = require('path');
const get = require('lodash/get');
const readPackageTree = require('read-package-tree');

const build = require('./build');


module.exports = async (dir) => {
  const tree = await readPackageTree(dir);

  const core = async (tree, callback) => {
    const children = tree.children;
    if (children.length > 0) {
      for (let node of children) {
        await core(node, callback);
      }
    } else {
      tree.name && await callback(tree);
    }
  };
  await core({children: get(tree, 'children', [])}, async (node) => {
    const rootPath = path.resolve(dir, 'node_modules', node.name);
    await build(rootPath);
  });
};
