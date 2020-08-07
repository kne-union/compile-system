module.exports = (a, b) => {
  const transform = (str) => {
    const list = str.match(/^([0-9]+)\.([0-9]+).([0-9]+)(.*)/);
    return list[1] * 100 + list[2] * 10 + list[3];
  };
  return transform(a) - transform(b);
};
