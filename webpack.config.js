const path = require('path');
const isProd = process.argv.indexOf('--mode=production') >= 0;
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = [
    {
        target: "node",
        // },x
        entry: ['./src/extension.ts'],
        output: {
            path: path.resolve(__dirname, 'out'),
            filename: 'extension.js',
            libraryTarget: 'commonjs2',
            devtoolModuleFilenameTemplate: '[absoluteResourcePath]',
        },
        externals: {
            vscode: 'commonjs vscode',
            mockjs: 'mockjs vscode',
            'mongodb-client-encryption': 'mongodb-client-encryption'
        },
        resolve: {
            extensions: ['.ts', '.js'],
            alias: {
                '@': path.resolve(__dirname, './src')
            }
        },
        module: { rules: [{ test: /\.ts$/, exclude: /(node_modules|bin)/, use: ['ts-loader'] }] },
        optimization: { minimize: isProd },
        watch: !isProd,
        mode: isProd ? 'production' : 'development',
        devtool: isProd ? false : 'source-map',
    },
    {
        entry: ['./web/main.ts'],
        output: {
            path: path.resolve(__dirname, 'media'),
            filename: 'out.min.js'
        },
        resolve: {
            extensions: ['.css', '.ts']
        },
        plugins: [
            new MiniCssExtractPlugin({filename:"out.min.css"}),
        ],
        module: {
            rules: [
                { test: /\.ts$/, exclude: /(node_modules|bin)/, use: ['ts-loader'] },
                {
                    test: /\.css$/,
                    use:[
                        MiniCssExtractPlugin.loader,
                        "css-loader",
                    ]
                  }
            ]
        },
        optimization: { minimize: isProd },
        watch: !isProd,
        mode: isProd ? 'production' : 'development',
        devtool: isProd ? false : 'source-map',
    }
];
