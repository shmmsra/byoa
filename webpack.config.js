const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
    mode: isDevelopment ? 'development' : 'production',
    entry: {
        app: './src/web/index.jsx'
    },
    output: {
        path: path.resolve(__dirname, 'build/Resources'),
        filename: isDevelopment ? '[name].js' : '[name].[contenthash].js',
        publicPath: isDevelopment ? '/' : './'
    },
    resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        alias: {
            '@': path.resolve(__dirname, 'src/web'),
            '@components': path.resolve(__dirname, 'src/web/components'),
            '@stores': path.resolve(__dirname, 'src/web/stores'),
            '@utils': path.resolve(__dirname, 'src/web/utils'),
            '@styles': path.resolve(__dirname, 'src/web/styles')
        }
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            '@babel/preset-env',
                            '@babel/preset-react'
                        ]
                    }
                }
            },
            {
                test: /\.(ts|tsx)$/,
                exclude: /node_modules/,
                use: 'ts-loader'
            },
            {
                test: /\.(css|scss|sass)$/,
                use: [
                    isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: isDevelopment
                        }
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            sourceMap: isDevelopment,
                            sassOptions: {
                                includePaths: [path.resolve(__dirname, 'src/web/styles')]
                            }
                        }
                    }
                ]
            },
            {
                test: /\.(png|jpe?g|gif|svg|ico)$/,
                type: 'asset/resource',
                generator: {
                    filename: 'images/[name].[hash:8][ext]'
                }
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/,
                type: 'asset/resource',
                generator: {
                    filename: 'fonts/[name].[hash:8][ext]'
                }
            }
        ]
    },
    plugins: [
        // Only clean in production builds
        ...(isDevelopment ? [] : [new CleanWebpackPlugin()]),
        new HtmlWebpackPlugin({
            template: './src/web/index.ejs',
            filename: 'index.html',
            inject: 'body',
            minify: !isDevelopment,
            templateParameters: {
                env: isDevelopment ? 'development' : 'production'
            }
        }),
        ...(isDevelopment ? [] : [
            new MiniCssExtractPlugin({
                filename: '[name].[contenthash].css',
                chunkFilename: '[id].[contenthash].css'
            })
        ])
    ],
    devtool: isDevelopment ? 'eval-source-map' : 'source-map',
    devServer: {
        host: 'localhost',
        port: 3000,
        hot: true,
        liveReload: true,
        historyApiFallback: {
            index: '/index.html'
        },
        allowedHosts: 'all',
        client: {
            overlay: {
                errors: true,
                warnings: false
            }
        },
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
            'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
        },
        compress: true,
        devMiddleware: {
            writeToDisk: false
        }
    },
    optimization: {
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'all'
                }
            }
        }
    },
    stats: isDevelopment ? 'minimal' : 'normal',
    performance: {
        hints: isDevelopment ? false : 'warning',
        maxEntrypointSize: 512000,
        maxAssetSize: 512000
    }
};
