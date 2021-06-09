const path = require('path');

module.exports = {
    entry: {
        mixineos_wallet: './src/mixineos-wallet.ts',
        mixineos: './src/mixineos.ts',
        constants: './src/constants.ts'
    },
    mode: 'production',
    module: {
        rules: [
            {
                test: /\.css$/,
                include: path.join(__dirname, 'src'),
                use: [
                  'style-loader',
                  {
                    loader: 'typings-for-css-modules-loader',
                    options: {
                      modules: true,
                      namedExport: true
                    }
                  }
                ]
            },
            {
                test: /\.tsx?$/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        configFile: 'tsconfig.web.json'
                    }
                },
                exclude: /node_modules/,
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    output: {
        filename: x => x.chunk.name.replace('_', '-') + '.min.js',
        library: '[name]',
        path: path.resolve(__dirname, 'dist-web'),
    }
};
