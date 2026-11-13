"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiddlewareBuilder = void 0;
const iterare_1 = require("iterare");
const path_to_regexp_1 = require("path-to-regexp");
const legacy_route_converter_1 = require("../router/legacy-route-converter");
const utils_1 = require("./utils");
/**
 * Returns the path the router serves the routes of a mount path at, which is
 * also the path the adapters mount it on: without the "$" that marks an
 * exact-match path, and without a trailing slash.
 */
const toServedPath = (mountPath) => mountPath.replace(/\$$/, '').replace(/\/+$/, '') || '/';
class MiddlewareBuilder {
    constructor(routesMapper, httpAdapter, routeInfoPathExtractor) {
        this.routesMapper = routesMapper;
        this.httpAdapter = httpAdapter;
        this.routeInfoPathExtractor = routeInfoPathExtractor;
        this.middlewareCollection = new Set();
    }
    apply(...middleware) {
        return new MiddlewareBuilder.ConfigProxy(this, middleware.flat(), this.routeInfoPathExtractor);
    }
    build() {
        return [...this.middlewareCollection];
    }
    getHttpAdapter() {
        return this.httpAdapter;
    }
    /**
     * Returns the routes of the controllers of the application at the paths
     * the router serves them at (global prefix and version included).
     */
    getServedRoutes() {
        return (this.servedRoutes ??= this.routesMapper
            .mapControllersToRouteInfo()
            .flatMap(route => this.routeInfoPathExtractor
            .extractPathsFrom(route)
            .map(path => ({ ...route, path: toServedPath(path) }))));
    }
}
exports.MiddlewareBuilder = MiddlewareBuilder;
MiddlewareBuilder.ConfigProxy = class {
    constructor(builder, middleware, routeInfoPathExtractor) {
        this.builder = builder;
        this.middleware = middleware;
        this.routeInfoPathExtractor = routeInfoPathExtractor;
        this.excludedRoutes = [];
    }
    getExcludedRoutes() {
        return this.excludedRoutes;
    }
    exclude(...routes) {
        this.excludedRoutes = [
            ...this.excludedRoutes,
            ...this.getRoutesFlatList(routes).flatMap(route => this.routeInfoPathExtractor.extractExclusionsFrom(route, {
                caseSensitive: this.builder.getHttpAdapter().getRouteMatchingOptions?.()
                    ?.caseSensitive ?? true,
            })),
        ];
        return this;
    }
    forRoutes(...routes) {
        const { middlewareCollection } = this.builder;
        const flattedRoutes = this.getRoutesFlatList(routes);
        const forRoutes = this.removeOverlappedRoutes(this.addCoveredExcludedRoutes(flattedRoutes));
        const configuration = {
            middleware: (0, utils_1.filterMiddleware)(this.middleware, this.excludedRoutes, this.builder.getHttpAdapter(), this.routeInfoPathExtractor.getVersioningOptions(), () => this.builder.getServedRoutes()),
            forRoutes,
        };
        middlewareCollection.add(configuration);
        return this.builder;
    }
    getRoutesFlatList(routes) {
        const { routesMapper } = this.builder;
        return (0, iterare_1.iterate)(routes)
            .map(route => routesMapper.mapRouteToRouteInfo(route))
            .flatten()
            .toArray();
    }
    /**
     * Adds the routes excluded from the global prefix that a route covers
     * without being excluded itself (e.g. "users/me" for "users/:id"): the
     * router serves them outside of the prefix the route is mounted under.
     * Also adds the routes of the controllers that a route covers on the
     * other side of the prefix (see `extractControllerRoutesCoveredBy()`).
     */
    addCoveredExcludedRoutes(routes) {
        const allRoutes = [...routes];
        for (const route of routes) {
            for (const excludedRoute of [
                ...this.routeInfoPathExtractor.extractExcludedRoutesCoveredBy(route),
                ...this.routeInfoPathExtractor.extractControllerRoutesCoveredBy(route),
            ]) {
                const isListed = allRoutes.some(item => item.path === excludedRoute.path &&
                    item.method === excludedRoute.method &&
                    item.version === excludedRoute.version);
                if (!isListed) {
                    allRoutes.push(excludedRoute);
                }
            }
        }
        return allRoutes;
    }
    /**
     * Removes the routes that a parameterized route of the same method is
     * mounted on as well (e.g. "/users/me" next to "/users/:id"), so that
     * the middleware runs once for them. Only a route without parameters or
     * wildcards is removed, and only when the parameterized route matches
     * every path it would be mounted on (global prefix and version included).
     *
     * The paths are compared as the router serves them, without a trailing
     * slash: the root route of a controller is mounted on "/cats/" and served
     * at "/cats", which "/:id/{*path}" matches only with the slash.
     */
    removeOverlappedRoutes(routes) {
        const routesWithRegex = routes
            .filter(route => route.path.includes(':'))
            .map(route => ({
            method: route.method,
            regexes: this.compileMountPaths(route),
        }));
        return routes.filter(route => {
            const mountPaths = this.routeInfoPathExtractor.extractPathsFrom(route);
            if (!mountPaths.every(utils_1.isStaticPath)) {
                return true;
            }
            const isOverlapped = (item) => route.method === item.method &&
                mountPaths.every(path => item.regexes.some(regex => regex.test(toServedPath(path))));
            return !routesWithRegex.some(isOverlapped);
        });
    }
    compileMountPaths(route) {
        try {
            return this.routeInfoPathExtractor.extractPathsFrom(route).map(path => (0, path_to_regexp_1.pathToRegexp)(legacy_route_converter_1.LegacyRouteConverter.tryConvert(toServedPath(path), {
                logs: false,
            }), { sensitive: true }).regexp);
        }
        catch {
            // The adapter reports a path it cannot mount; it covers nothing here
            return [];
        }
    }
};
