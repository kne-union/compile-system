const cracoSystemPlugin = require('@kne/compile-system/plugins/cracoSystemPlugin');
module.exports = {
    plugins: [
        {
            plugin: cracoSystemPlugin,
            options: {
                imports: {},
                HtmlWebpackPlugin: require('html-webpack-plugin')
            }
        }
    ]
};