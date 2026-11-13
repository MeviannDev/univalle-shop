"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutePathFactory = void 0;
const common_1 = require("@nestjs/common");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const utils_1 = require("./utils");
class RoutePathFactory {
    constructor(applicationConfig) {
        this.applicationConfig = applicationConfig;
    }
    create(metadata, requestMethod) {
        // Each path is built and tested against the global prefix exclusions with
        // the one version it is built for: the version-neutral path of a
        // [VERSION_NEUTRAL, '1'] route has no "/v1" to strip, even when its own
        // path starts with "v1"
        const versionOrVersions = this.getVersion(metadata);
        let versionedPaths = [
            { path: '' },
        ];
        if (versionOrVersions &&
            metadata.versioningOptions?.type === common_1.VersioningType.URI) {
            const versionPrefix = this.getVersionPrefix(metadata.versioningOptions);
            const versions = Array.isArray(versionOrVersions)
                ? versionOrVersions
                : [versionOrVersions];
            versionedPaths = versions.map(version => ({
                // Version Neutral - Do not include version in URL
                path: version === common_1.VERSION_NEUTRAL
                    ? ''
                    : `/${versionPrefix}${String(version)}`,
                version,
            }));
        }
        const paths = versionedPaths.flatMap(({ path, version }) => {
            let pathsOfVersion = this.appendToAllIfDefined([path], metadata.modulePath);
            pathsOfVersion = this.appendToAllIfDefined(pathsOfVersion, metadata.ctrlPath);
            pathsOfVersion = this.appendToAllIfDefined(pathsOfVersion, metadata.methodPath);
            if (!metadata.globalPrefix) {
                return pathsOfVersion;
            }
            return pathsOfVersion.map(path => {
                if (this.isExcludedFromGlobalPrefix(path, requestMethod, version, metadata.versioningOptions)) {
                    return path;
                }
                return (0, shared_utils_1.stripEndSlash)(metadata.globalPrefix || '') + path;
            });
        });
        return paths
            .map(path => (0, shared_utils_1.addLeadingSlash)(path || '/'))
            .map(path => (path !== '/' ? (0, shared_utils_1.stripEndSlash)(path) : path));
    }
    getVersion(metadata) {
        // The version will be either the path version or the controller version,
        // with the pathVersion taking priority.
        return metadata.methodVersion || metadata.controllerVersion;
    }
    getVersionPrefix(versioningOptions) {
        const defaultPrefix = 'v';
        if (versioningOptions.type === common_1.VersioningType.URI) {
            if (versioningOptions.prefix === false) {
                return '';
            }
            else if (versioningOptions.prefix !== undefined) {
                return versioningOptions.prefix;
            }
        }
        return defaultPrefix;
    }
    appendToAllIfDefined(paths, fragmentToAppend) {
        if (!fragmentToAppend) {
            return paths;
        }
        const concatPaths = (a, b) => (0, shared_utils_1.stripEndSlash)(a) + (0, shared_utils_1.addLeadingSlash)(b);
        if (Array.isArray(fragmentToAppend)) {
            const paths2dArray = paths.map(path => fragmentToAppend.map(fragment => concatPaths(path, fragment)));
            return (0, common_1.flatten)(paths2dArray);
        }
        return paths.map(path => concatPaths(path, fragmentToAppend));
    }
    isExcludedFromGlobalPrefix(path, requestMethod, versionOrVersions, versioningOptions) {
        if ((0, shared_utils_1.isUndefined)(requestMethod)) {
            return false;
        }
        const options = this.applicationConfig.getGlobalPrefixOptions();
        const excludedRoutes = options.exclude;
        if (versionOrVersions &&
            versionOrVersions !== common_1.VERSION_NEUTRAL &&
            versioningOptions?.type === common_1.VersioningType.URI) {
            path = this.truncateVersionPrefixFromPath(path, versionOrVersions, versioningOptions);
        }
        return (Array.isArray(excludedRoutes) &&
            (0, utils_1.isRouteExcluded)(excludedRoutes, path, requestMethod));
    }
    truncateVersionPrefixFromPath(path, versionValue, versioningOptions) {
        if (typeof versionValue !== 'string') {
            versionValue.forEach(version => {
                if (typeof version === 'string') {
                    path = this.truncateVersionPrefixFromPath(path, version, versioningOptions);
                }
            });
            return path;
        }
        const prefix = `/${this.getVersionPrefix(versioningOptions)}${versionValue}`;
        return path.startsWith(prefix) ? path.replace(prefix, '') : path;
    }
}
exports.RoutePathFactory = RoutePathFactory;
