"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutesMapper = void 0;
const constants_1 = require("@nestjs/common/constants");
const request_method_enum_1 = require("@nestjs/common/enums/request-method.enum");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const util_1 = require("util");
const invalid_middleware_configuration_exception_1 = require("../errors/exceptions/invalid-middleware-configuration.exception");
const metadata_scanner_1 = require("../metadata-scanner");
const paths_explorer_1 = require("../router/paths-explorer");
const utils_1 = require("../router/utils");
class RoutesMapper {
    constructor(container, applicationConfig) {
        this.container = container;
        this.applicationConfig = applicationConfig;
        this.pathsExplorer = new paths_explorer_1.PathsExplorer(new metadata_scanner_1.MetadataScanner());
    }
    mapRouteToRouteInfo(controllerOrRoute) {
        if ((0, shared_utils_1.isString)(controllerOrRoute)) {
            return this.getRouteInfoFromPath(controllerOrRoute);
        }
        const routePathOrPaths = this.getRoutePath(controllerOrRoute);
        if (this.isRouteInfo(routePathOrPaths, controllerOrRoute)) {
            return this.getRouteInfoFromObject(controllerOrRoute);
        }
        if ((0, shared_utils_1.isUndefined)(routePathOrPaths)) {
            // Neither a controller nor a { path, method } object (e.g. a class
            // without @Controller()): the middleware would be bound to a route no
            // request matches, without a word
            throw new invalid_middleware_configuration_exception_1.InvalidMiddlewareConfigurationException((0, shared_utils_1.isFunction)(controllerOrRoute)
                ? `"${controllerOrRoute.name}" passed to forRoutes() or exclude() is not a controller (is the @Controller() decorator missing?).`
                : `${(0, util_1.inspect)(controllerOrRoute, { depth: 2 })} passed to forRoutes() or exclude() is not a { path, method } object where method is a RequestMethod.`);
        }
        return this.getRouteInfoFromController(controllerOrRoute, routePathOrPaths);
    }
    /**
     * Returns the routes of every controller of the application, as
     * `forRoutes()` maps a controller.
     */
    mapControllersToRouteInfo() {
        const controllers = new Set();
        for (const moduleRef of this.container.getModules().values()) {
            for (const { metatype } of moduleRef.controllers.values()) {
                if (metatype) {
                    controllers.add(metatype);
                }
            }
        }
        return [...controllers].flatMap(controller => this.mapRouteToRouteInfo(controller));
    }
    getRouteInfoFromPath(routePath) {
        const defaultRequestMethod = -1;
        return [
            {
                path: (0, shared_utils_1.addLeadingSlash)(routePath),
                method: defaultRequestMethod,
            },
        ];
    }
    getRouteInfoFromObject(routeInfoObject) {
        const routeInfo = {
            path: (0, shared_utils_1.addLeadingSlash)(routeInfoObject.path),
            method: routeInfoObject.method,
        };
        if (routeInfoObject.version) {
            routeInfo.version = routeInfoObject.version;
        }
        return [routeInfo];
    }
    getRouteInfoFromController(controller, routePath) {
        const controllerPaths = this.pathsExplorer.scanForPaths(Object.create(controller), controller.prototype);
        const controllerVersion = this.getVersionMetadata(controller);
        const versioningConfig = this.applicationConfig.getVersioning();
        const modulePaths = this.getModulePathsOfController(controller);
        const concatPaths = (acc, currentValue) => acc.concat(currentValue);
        const toRouteInfo = (item, prefix, modulePath) => item.path?.flatMap(p => {
            const endpointPath = modulePath + this.normalizeGlobalPath(prefix) + (0, shared_utils_1.addLeadingSlash)(p);
            const routeInfo = {
                path: endpointPath,
                method: item.requestMethod,
            };
            // A VERSION_NEUTRAL route is kept apart from a route without a
            // version, which is also served under the default version
            const version = item.version ?? controllerVersion;
            if (version && versioningConfig) {
                if (typeof version !== 'string' && Array.isArray(version)) {
                    return version.map((v) => ({
                        ...routeInfo,
                        version: v,
                    }));
                }
                routeInfo.version = version;
            }
            return routeInfo;
        });
        return []
            .concat(routePath)
            .flatMap(routePath => modulePaths.map(modulePath => controllerPaths
            .map(item => toRouteInfo(item, routePath, modulePath))
            .reduce(concatPaths, [])))
            .reduce(concatPaths, []);
    }
    isRouteInfo(path, objectOrClass) {
        if (!(0, shared_utils_1.isUndefined)(path) || !(0, shared_utils_1.isObject)(objectOrClass)) {
            return false;
        }
        const { path: routePath, method } = objectOrClass;
        return ((0, shared_utils_1.isString)(routePath) &&
            typeof method === 'number' &&
            // -1 is the "every method" of a route passed as a plain string
            (!(0, shared_utils_1.isUndefined)(request_method_enum_1.RequestMethod[method]) || (0, utils_1.isRequestMethodAll)(method)));
    }
    normalizeGlobalPath(path) {
        const prefix = (0, shared_utils_1.addLeadingSlash)(path);
        return prefix === '/' ? '' : prefix;
    }
    getRoutePath(route) {
        return Reflect.getMetadata(constants_1.PATH_METADATA, route);
    }
    /**
     * Returns the paths the controller is served under: the router registers it
     * once for each module that declares it, under the path of that module.
     */
    getModulePathsOfController(metatype) {
        const modulePaths = this.getHostModulesOfController(metatype).map(moduleRef => (0, shared_utils_1.stripEndSlash)(this.getModulePath(moduleRef.metatype) ?? ''));
        return modulePaths.length > 0 ? [...new Set(modulePaths)] : [''];
    }
    getHostModulesOfController(metatype) {
        if (!metatype) {
            return [];
        }
        const modulesContainer = this.container.getModules();
        return Array.from(modulesContainer.values()).filter(({ controllers }) => controllers.has(metatype));
    }
    getModulePath(metatype) {
        if (!metatype) {
            return;
        }
        const modulesContainer = this.container.getModules();
        const modulePath = Reflect.getMetadata(constants_1.MODULE_PATH + modulesContainer.applicationId, metatype);
        return modulePath ?? Reflect.getMetadata(constants_1.MODULE_PATH, metatype);
    }
    getVersionMetadata(metatype) {
        const versioningConfig = this.applicationConfig.getVersioning();
        if (versioningConfig) {
            return (Reflect.getMetadata(constants_1.VERSION_METADATA, metatype) ??
                versioningConfig.defaultVersion);
        }
    }
}
exports.RoutesMapper = RoutesMapper;
