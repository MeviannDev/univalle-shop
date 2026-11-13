import { HttpServer, MiddlewareConsumer, Type } from '@nestjs/common/interfaces';
import { MiddlewareConfigProxy, MiddlewareConfiguration, RouteInfo } from '@nestjs/common/interfaces/middleware';
import { RouteInfoPathExtractor } from './route-info-path-extractor';
import { RoutesMapper } from './routes-mapper';
export declare class MiddlewareBuilder implements MiddlewareConsumer {
    private readonly routesMapper;
    private readonly httpAdapter;
    private readonly routeInfoPathExtractor;
    private readonly middlewareCollection;
    private servedRoutes?;
    constructor(routesMapper: RoutesMapper, httpAdapter: HttpServer, routeInfoPathExtractor: RouteInfoPathExtractor);
    apply(...middleware: Array<Type<any> | Function | Array<Type<any> | Function>>): MiddlewareConfigProxy;
    build(): MiddlewareConfiguration[];
    getHttpAdapter(): HttpServer;
    /**
     * Returns the routes of the controllers of the application at the paths
     * the router serves them at (global prefix and version included).
     */
    getServedRoutes(): RouteInfo[];
    private static readonly ConfigProxy;
}
