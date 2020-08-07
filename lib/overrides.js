const {NodeVM} = require('vm2');
const fs = require('fs-extra');
const parse = require('@babel/parser').parse;
const traverse = require('@babel/traverse').default;
const spawnPromise = require('./spawnPromise');

module.exports = async (config, overridesPath) => {
  if (!await fs.exists(overridesPath)) {
    return config;
  }
  const vm = new NodeVM({
    require: {
      external: true
    }
  });

  const fileContent = await fs.readFile(overridesPath, 'utf8');

  const ast = parse(fileContent, {
    sourceType: "module"
  });

  const dependencies = [];

  traverse(ast, {
    enter(path) {
      const {node} = path;
      if (node.type === 'CallExpression' && node.callee && (node.callee.name === 'require' || node.callee.type === 'Import')) {
        dependencies.push(node.arguments[0].value);
      } else if (node.type === "ImportDeclaration") {
        dependencies.push(node.source.value);
      }
    }
  });

  dependencies.length > 0 && await spawnPromise(`npm i --save ${dependencies.join(' ')}`);

  const overrides = vm.run(fileContent, 'vm.js');

  await Promise.resolve(overrides(config));
};
