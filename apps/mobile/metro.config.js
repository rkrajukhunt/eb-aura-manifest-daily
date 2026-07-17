const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

const resolvePackageRoot = (packageName) =>
  path.dirname(require.resolve(`${packageName}/package.json`, { paths: [projectRoot] }));
const resolvePackageRootFrom = (packageName, fromPath) =>
  path.dirname(require.resolve(`${packageName}/package.json`, { paths: [fromPath] }));

const bottomSheetRoot = resolvePackageRoot('@gorhom/bottom-sheet');

config.watchFolders = Array.from(new Set([...(config.watchFolders ?? []), workspaceRoot]));

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  '@gorhom/bottom-sheet': bottomSheetRoot,
  '@gorhom/portal': resolvePackageRootFrom('@gorhom/portal', bottomSheetRoot),
};

module.exports = config;
