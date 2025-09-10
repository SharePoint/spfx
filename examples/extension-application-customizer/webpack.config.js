"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, /**
 * Generates the webpack configuration for the project.
 */ "default", {
    enumerable: true,
    get: function() {
        return generateConfig;
    }
});
const _spfxheftplugins = require("@microsoft/spfx-heft-plugins");
const _webpack5localizationplugin = require("@rushstack/webpack5-localization-plugin");
const _nodecorelibrary = require("@rushstack/node-core-library");
const _terminal = require("@rushstack/terminal");
const _path = /*#__PURE__*/ _interop_require_wildcard(require("path"));
const _glob = /*#__PURE__*/ _interop_require_wildcard(require("glob"));
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
const DEFAULT_LOCALE = 'en-us';
const bundles = [
  {
    "bundleName": "application-customizer-application-customizer",
    "components": [
      {
        "entrypoint": "./src/extensions/applicationCustomizer/ApplicationCustomizerApplicationCustomizer.ts",
        "manifest": "./src/extensions/applicationCustomizer/ApplicationCustomizerApplicationCustomizer.manifest.json"
      }
    ]
  }
];
const localization = {
  "ApplicationCustomizerApplicationCustomizerStrings": "src/extensions/applicationCustomizer/loc/{locale}.resjson"
};
function getBundleConfig() {
    const entry = {};
    const bundleEntries = [];
    for (const bundle of bundles){
        entry[bundle.bundleName] = bundle.components[0].entrypoint;
        const bundleEntry = {
            bundleName: bundle.bundleName,
            components: {}
        };
        for (const component of bundle.components){
            const manifestData = _nodecorelibrary.JsonFile.load(component.manifest);
            bundleEntry.components[manifestData.id] = {
                manifestData,
                manifestPath: `${__dirname}/${component.manifest}`,
                exportName: undefined,
                entrypoint: `${__dirname}/${component.entrypoint}`,
                manifest: component.manifest
            };
        }
        bundleEntries.push(bundleEntry);
    }
    return {
        entry,
        bundleEntries
    };
}
function buildTranslatedStrings() {
    const translatedStrings = {};
    const aliases = {};
    for (const [key, value] of Object.entries(localization)){
        const defaultLocalePath = value.replace('{locale}', DEFAULT_LOCALE);
        aliases[key] = _path.resolve(__dirname, defaultLocalePath);
        const localizedFiles = _glob.sync(value.replace('{locale}', '*'), {
            cwd: __dirname
        });
        for (const localizedFile of localizedFiles){
            const locale = _path.basename(localizedFile, _path.extname(localizedFile));
            if (locale === DEFAULT_LOCALE) {
                continue;
            }
            translatedStrings[locale] = translatedStrings[locale] || {};
            translatedStrings[locale][defaultLocalePath] = `./${localizedFile}`;
        }
    }
    return {
        translatedStrings,
        aliases
    };
}
const { translatedStrings, aliases } = buildTranslatedStrings();
function generateConfig({ production }) {
    const terminal = new _terminal.Terminal(new _terminal.ConsoleTerminalProvider());
    const cumulativeManifestProcessor = new _spfxheftplugins.CumulativeManifestProcessor({
        terminal,
        rootPath: __dirname,
        tempFolderName: 'temp',
        distFolderName: 'dist'
    });
    const referencedProjects = cumulativeManifestProcessor.discoverManifests(__dirname, _spfxheftplugins.DependencyDiscoveryMode.deepSparseIgnoreFirstProject);
    const linkedExternals = new Map();
    for (const [manifestId, versionMap] of Object.entries(referencedProjects)){
        for (const { packageName, isAssembly, manifestData: { version } } of Object.values(versionMap)){
            if (packageName && !isAssembly) {
                linkedExternals.set(packageName, {
                    id: manifestId,
                    name: packageName,
                    version: version
                });
            }
        }
    }
    const externalsKeys = new Set(linkedExternals.keys());
    const { entry, bundleEntries } = getBundleConfig();
    return {
        mode: production ? 'production' : 'development',
        entry,
        output: {
            filename: '[name]_[locale]_[contenthash].js',
            path: `${__dirname}/dist`,
            libraryTarget: 'amd'
        },
        module: {
            rules: [
                {
                    test: /\.resjson$/,
                    use: {
                        // All loaders are available in `@rushstack/webpack5-localization-plugin/lib/loaders/`
                        // Loaders for specific formats: `resjson-loader`, `locjson-loader`, `resx-loader`
                        // Loader that switches on file extension: `loc-loader`
                        // Loader that switches on file extension and skips localization: `default-locale-loader`
                        loader: require.resolve('@rushstack/webpack5-localization-plugin/lib/loaders/resjson-loader')
                    },
                    // Can be one of `javascript/esm`, `javascript/dynamic`, or `json`
                    // `javascript/esm` will produce the smallest bundle sizes, while `json` will produce faster code for large string tables
                    type: 'javascript/esm',
                    sideEffects: false
                },
                {
                    // Allow importing JS files that don't have explicit extensions
                    test: /\.js$/,
                    resolve: {
                        fullySpecified: false
                    }
                },
                {
                    test: /\.tsx?$/,
                    loader: 'ts-loader',
                    options: {
                        transpileOnly: true,
                        configFile: `${__dirname}/tsconfig.json`
                    },
                    resolve: {
                        fullySpecified: false
                    }
                },
                {
                    test: /\.(png|mp4|mp3|svg|jpg|aac|woff2|woff)$/i,
                    type: 'asset/resource'
                },
                {
                    test: /\.s[ac]ss$/i,
                    use: [
                        'style-loader',
                        'css-loader',
                        {
                            loader: 'sass-loader',
                            options: {
                                implementation: require('sass'),
                                sassOptions: {
                                    includePaths: [
                                        `${__dirname}/node_modules`
                                    ]
                                }
                            }
                        }
                    ]
                }
            ]
        },
        resolve: {
            extensions: [
                '.js',
                '.jsx',
                '.ts',
                '.tsx'
            ],
            alias: aliases
        },
        externals: [
            ...externalsKeys
        ],
        performance: {
            hints: false
        },
        plugins: [
            new _webpack5localizationplugin.LocalizationPlugin({
                localizedData: {
                    defaultLocale: {
                        localeName: DEFAULT_LOCALE
                    },
                    translatedStrings
                }
            }),
            new _spfxheftplugins.ManifestPlugin({
                terminal,
                bundleEntries,
                internalModuleBaseUrls: [
                    'http://these-webparts-dont-get-deployed'
                ],
                debugInternalModuleBaseUrls: [],
                linkedExternals,
                referencedProjects,
                cumulativeManifestProcessor,
                sourceLocaleName: DEFAULT_LOCALE,
                // localized manifest strings
                tryGetLocFileTranslations: (absoluteFilePath)=>{
                    return undefined;
                },
                selectedLocales: undefined,
                production
            })
        ]
    };
}

//# sourceMappingURL=./webpack.config.js.map