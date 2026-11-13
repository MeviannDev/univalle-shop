"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpressAdapter = void 0;
const common_1 = require("@nestjs/common");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const http_adapter_1 = require("@nestjs/core/adapters/http-adapter");
const router_method_factory_1 = require("@nestjs/core/helpers/router-method-factory");
const legacy_route_converter_1 = require("@nestjs/core/router/legacy-route-converter");
const cors = require("cors");
const express = require("express");
const http = require("http");
const https = require("https");
const path_to_regexp_1 = require("path-to-regexp");
const stream_1 = require("stream");
const util_1 = require("util");
const get_body_parser_options_util_1 = require("./utils/get-body-parser-options.util");
const on_response_close_util_1 = require("./utils/on-response-close.util");
/**
 * @publicApi
 */
class ExpressAdapter extends http_adapter_1.AbstractHttpAdapter {
    constructor(instance) {
        super(instance || express());
        this.routerMethodFactory = new router_method_factory_1.RouterMethodFactory();
        this.logger = new common_1.Logger(ExpressAdapter.name);
        this.openConnections = new Set();
        this.instance.use((req, res, next) => {
            if (this.onResponseHook) {
                res.on('finish', () => {
                    void this.onResponseHook.apply(this, [req, res]);
                });
            }
            if (this.onRequestHook) {
                void this.onRequestHook.apply(this, [req, res, next]);
            }
            else {
                next();
            }
        });
    }
    setOnRequestHook(onRequestHook) {
        this.onRequestHook = onRequestHook;
    }
    setOnResponseHook(onResponseHook) {
        this.onResponseHook = onResponseHook;
    }
    reply(response, body, statusCode) {
        if (statusCode) {
            response.status(statusCode);
        }
        if ((0, shared_utils_1.isNil)(body)) {
            return response.send();
        }
        if (body instanceof common_1.StreamableFile) {
            // A stream that failed before the reply (e.g. while an interceptor
            // awaited) has already emitted its 'error' event.
            const { errored } = body.getStream();
            if (errored) {
                return body.errorHandler(errored, response);
            }
            this.applyStreamHeaders(response, body);
            const stream = body.getStream();
            stream.once('error', err => {
                this.handleStreamError(body, err, response);
            });
            // pipe() leaves the source open when the client disconnects early,
            // also before reply() runs ("close" has already fired by then), or
            // while the response waits behind others pipelined on the connection
            (0, on_response_close_util_1.onResponseClose)(response, () => {
                if (!stream.readableEnded) {
                    stream.destroy();
                }
            });
            // Node discards the body of a HEAD response without ever applying
            // backpressure, so piping would read the whole source. The response
            // ends once the source is readable instead, which still leaves an
            // error opening it (e.g. a missing file) to the error handler.
            if (response.req?.method === 'HEAD') {
                stream.once('readable', () => response.end());
                return response.on('error', (err) => body.errorLogger(err));
            }
            return this.toWritableChunks(stream)
                .pipe(response)
                .on('error', (err) => body.errorLogger(err));
        }
        // response.json() serializes the enumerable properties of an Error, e.g.
        // the request config of an HTTP client error.
        if (body instanceof Error &&
            response.statusCode >= common_1.HttpStatus.BAD_REQUEST) {
            body = {
                statusCode: response.statusCode,
                message: http.STATUS_CODES[response.statusCode] ?? 'Error',
            };
        }
        const responseContentType = response.getHeader('Content-Type');
        if (typeof responseContentType === 'string' &&
            !responseContentType.startsWith('application/json') &&
            (body?.statusCode >= common_1.HttpStatus.BAD_REQUEST ||
                // A custom error body (e.g. "new HttpException({ ... }, 404)") need
                // not have a "statusCode" of its own
                ((0, shared_utils_1.isObject)(body) &&
                    !(0, shared_utils_1.isNil)(statusCode) &&
                    statusCode >= common_1.HttpStatus.BAD_REQUEST))) {
            this.logger.warn("Content-Type doesn't match Reply body, you might need a custom ExceptionFilter for non-JSON responses");
            response.setHeader('Content-Type', 'application/json');
        }
        return (0, shared_utils_1.isObject)(body) ? response.json(body) : response.send(String(body));
    }
    status(response, statusCode) {
        return response.status(statusCode);
    }
    end(response, message) {
        return response.end(message);
    }
    render(response, view, options) {
        // res.render() assigns "_locals" (the res.locals of this request) to the
        // object it is given. Here that is the value the handler returned, which
        // may outlive the request (e.g. a cached view model). The view gets the
        // same variables from a copy, as app.render() spreads them anyway.
        return response.render(view, (0, shared_utils_1.isObject)(options) ? { ...options } : options);
    }
    redirect(response, statusCode, url) {
        return response.redirect(statusCode, url);
    }
    setErrorHandler(handler, prefix) {
        return this.use(handler);
    }
    setNotFoundHandler(handler, prefix) {
        return this.use(handler);
    }
    isHeadersSent(response) {
        return response.headersSent;
    }
    getHeader(response, name) {
        return response.get(name);
    }
    setHeader(response, name, value) {
        return response.set(name, value);
    }
    appendHeader(response, name, value) {
        return response.append(name, value);
    }
    normalizePath(path) {
        try {
            const convertedPath = legacy_route_converter_1.LegacyRouteConverter.tryConvert(path);
            // Call "pathToRegexp" to trigger a TypeError if the path is invalid
            (0, path_to_regexp_1.pathToRegexp)(convertedPath);
            return convertedPath;
        }
        catch (e) {
            if (e instanceof TypeError) {
                legacy_route_converter_1.LegacyRouteConverter.printError(path);
            }
            throw e;
        }
    }
    listen(port, ...args) {
        return this.httpServer.listen(port, ...args);
    }
    close() {
        this.closeOpenConnections();
        if (!this.httpServer) {
            return undefined;
        }
        return new Promise(resolve => this.httpServer.close(resolve));
    }
    set(...args) {
        return this.instance.set(...args);
    }
    enable(...args) {
        return this.instance.enable(...args);
    }
    disable(...args) {
        return this.instance.disable(...args);
    }
    engine(...args) {
        return this.instance.engine(...args);
    }
    useStaticAssets(path, options) {
        if (options && options.prefix) {
            return this.use(options.prefix, express.static(path, options));
        }
        return this.use(express.static(path, options));
    }
    setBaseViewsDir(path) {
        return this.set('views', path);
    }
    setViewEngine(engine) {
        return this.set('view engine', engine);
    }
    getRequestHostname(request) {
        return request.hostname;
    }
    getRequestMethod(request) {
        return request.method;
    }
    getRequestUrl(request) {
        return request.originalUrl;
    }
    enableCors(options) {
        return this.use(cors(options));
    }
    createMiddlewareFactory(requestMethod) {
        return (path, callback) => {
            try {
                // The core marks an exact-match path with a trailing "$" (e.g. "/api$").
                // Express 5 reads "$" literally and "use()" matches by prefix, so strip
                // the marker and register the path as an exact "all()" route instead.
                const isExactPath = path.endsWith('$');
                const convertedPath = legacy_route_converter_1.LegacyRouteConverter.tryConvert(isExactPath ? path.slice(0, -1) : path);
                let router = this.routerMethodFactory.get(this.instance, requestMethod);
                if (isExactPath && router === this.instance.use) {
                    router = this.instance.all;
                }
                // Express routes are not strict by default, so "/api" also matches
                // "/api/", which the wildcard path registered next to it may match too
                // ("/api/{*path}" does, "/api/*path" does not). The core runs the
                // middleware for the first of its paths that matches a request only.
                // With "strict routing", the router serves a route the core passes
                // with a trailing slash (the root route of a controller, "/users/")
                // without it ("/users"), so the path is registered without it too.
                if (this.instance.router?.strict &&
                    convertedPath.length > 1 &&
                    convertedPath.endsWith('/')) {
                    router.call(this.instance, (0, shared_utils_1.stripEndSlash)(convertedPath), callback);
                }
                return router.call(this.instance, convertedPath, callback);
            }
            catch (e) {
                if (e instanceof TypeError) {
                    legacy_route_converter_1.LegacyRouteConverter.printError(path);
                }
                throw e;
            }
        };
    }
    initHttpServer(options) {
        const isHttpsEnabled = options && options.httpsOptions;
        if (isHttpsEnabled) {
            this.httpServer = https.createServer(options.httpsOptions, this.getInstance());
        }
        else {
            this.httpServer = http.createServer(this.getInstance());
        }
        if (options?.forceCloseConnections) {
            this.trackOpenConnections();
        }
    }
    registerParserMiddleware(prefix, rawBody) {
        const bodyParserJsonOptions = (0, get_body_parser_options_util_1.getBodyParserOptions)(rawBody);
        const bodyParserUrlencodedOptions = (0, get_body_parser_options_util_1.getBodyParserOptions)(rawBody, {
            extended: true,
        });
        const parserMiddleware = {
            jsonParser: express.json(bodyParserJsonOptions),
            urlencodedParser: express.urlencoded(bodyParserUrlencodedOptions),
        };
        Object.keys(parserMiddleware)
            .filter(parser => !this.isMiddlewareApplied(parser))
            .forEach(parserKey => this.use(parserMiddleware[parserKey]));
    }
    useBodyParser(type, rawBody, options) {
        const parserOptions = (0, get_body_parser_options_util_1.getBodyParserOptions)(rawBody, options);
        const parser = express[type](parserOptions);
        this.use(parser);
        return this;
    }
    setLocal(key, value) {
        this.instance.locals[key] = value;
        return this;
    }
    getType() {
        return 'express';
    }
    // The return type is spelled out (rather than "RouteMatchingOptions") so
    // that the declarations still compile against an older "@nestjs/common"
    getRouteMatchingOptions() {
        // Routes are registered on the application router, which takes the
        // "case sensitive routing" and "strict routing" settings in effect when
        // it is created and ignores later changes
        const router = this.getInstance().router;
        return {
            caseSensitive: !!router?.caseSensitive,
            ignoreTrailingSlash: !router?.strict,
        };
    }
    applyVersionFilter(handler, version, versioningOptions) {
        const callNextHandler = (req, res, next) => {
            if (!next) {
                throw new common_1.InternalServerErrorException('HTTP adapter does not support filtering on version');
            }
            return next();
        };
        if (version === common_1.VERSION_NEUTRAL ||
            // URL Versioning is done via the path, so the filter continues forward
            versioningOptions.type === common_1.VersioningType.URI) {
            const handlerForNoVersioning = (req, res, next) => handler(req, res, next);
            return handlerForNoVersioning;
        }
        // Custom Extractor Versioning Handler
        if (versioningOptions.type === common_1.VersioningType.CUSTOM) {
            const handlerForCustomVersioning = (req, res, next) => {
                const extractedVersion = versioningOptions.extractor(req);
                if (Array.isArray(version)) {
                    if (Array.isArray(extractedVersion) &&
                        version.filter(v => extractedVersion.includes(v)).length) {
                        return handler(req, res, next);
                    }
                    if ((0, shared_utils_1.isString)(extractedVersion) &&
                        version.includes(extractedVersion)) {
                        return handler(req, res, next);
                    }
                }
                else if ((0, shared_utils_1.isString)(version)) {
                    // Known bug here - if there are multiple versions supported across separate
                    // handlers/controllers, we can't select the highest matching handler.
                    // Since this code is evaluated per-handler, then we can't see if the highest
                    // specified version exists in a different handler.
                    if (Array.isArray(extractedVersion) &&
                        extractedVersion.includes(version)) {
                        return handler(req, res, next);
                    }
                    if ((0, shared_utils_1.isString)(extractedVersion) && version === extractedVersion) {
                        return handler(req, res, next);
                    }
                }
                return callNextHandler(req, res, next);
            };
            return handlerForCustomVersioning;
        }
        // Media Type (Accept Header) Versioning Handler
        if (versioningOptions.type === common_1.VersioningType.MEDIA_TYPE) {
            const handlerForMediaTypeVersioning = (req, res, next) => {
                const MEDIA_TYPE_HEADER = 'Accept';
                const acceptHeaderValue = req.headers?.[MEDIA_TYPE_HEADER] ||
                    req.headers?.[MEDIA_TYPE_HEADER.toLowerCase()];
                const acceptHeaderVersionParameter = acceptHeaderValue
                    ? acceptHeaderValue.split(';')[1]
                    : undefined;
                // No version was supplied
                if ((0, shared_utils_1.isUndefined)(acceptHeaderVersionParameter)) {
                    if (Array.isArray(version)) {
                        if (version.includes(common_1.VERSION_NEUTRAL)) {
                            return handler(req, res, next);
                        }
                    }
                }
                else {
                    const headerVersion = acceptHeaderVersionParameter.split(versioningOptions.key)[1];
                    if (Array.isArray(version)) {
                        if (version.includes(headerVersion)) {
                            return handler(req, res, next);
                        }
                    }
                    else if ((0, shared_utils_1.isString)(version)) {
                        if (version === headerVersion) {
                            return handler(req, res, next);
                        }
                    }
                }
                return callNextHandler(req, res, next);
            };
            return handlerForMediaTypeVersioning;
        }
        // Header Versioning Handler
        if (versioningOptions.type === common_1.VersioningType.HEADER) {
            const handlerForHeaderVersioning = (req, res, next) => {
                const customHeaderVersionParameter = req.headers?.[versioningOptions.header] ||
                    req.headers?.[versioningOptions.header.toLowerCase()];
                // No version was supplied
                if ((0, shared_utils_1.isUndefined)(customHeaderVersionParameter)) {
                    if (Array.isArray(version)) {
                        if (version.includes(common_1.VERSION_NEUTRAL)) {
                            return handler(req, res, next);
                        }
                    }
                }
                else {
                    if (Array.isArray(version)) {
                        if (version.includes(customHeaderVersionParameter)) {
                            return handler(req, res, next);
                        }
                    }
                    else if ((0, shared_utils_1.isString)(version)) {
                        if (version === customHeaderVersionParameter) {
                            return handler(req, res, next);
                        }
                    }
                }
                return callNextHandler(req, res, next);
            };
            return handlerForHeaderVersioning;
        }
        throw new Error('Unsupported versioning options');
    }
    trackOpenConnections() {
        this.httpServer.on('connection', (socket) => {
            this.openConnections.add(socket);
            socket.on('close', () => this.openConnections.delete(socket));
        });
    }
    closeOpenConnections() {
        for (const socket of this.openConnections) {
            socket.destroy();
            this.openConnections.delete(socket);
        }
    }
    isMiddlewareApplied(name) {
        const app = this.getInstance();
        return (!!app.router &&
            !!app.router.stack &&
            (0, shared_utils_1.isFunction)(app.router.stack.filter) &&
            app.router.stack.some((layer) => layer && layer.handle && layer.handle.name === name));
    }
    setHeaderIfNotExists(response, name, value) {
        if (value !== undefined && response.getHeader(name) === undefined) {
            const headerValue = Array.isArray(value) ? value.join(',') : value;
            response.setHeader(name, headerValue);
        }
    }
    /**
     * Runs the error handler of a StreamableFile whose stream failed after its
     * headers were applied, from an "error" listener, where nothing catches
     * what the handler throws.
     */
    handleStreamError(streamable, err, response) {
        // The answer is not the file. res.send() also parses the Content-Type it
        // finds to add a charset, and throws on a malformed one (e.g. "image/").
        if (!response.headersSent) {
            response.setHeader('Content-Type', 'text/plain; charset=utf-8');
        }
        try {
            streamable.errorHandler(err, response);
        }
        catch (handlerError) {
            this.logger.error(handlerError);
            if (!response.writableEnded) {
                response.destroy();
            }
        }
    }
    /**
     * response.write() throws for a chunk that is neither a string nor bytes,
     * inside the "data" listener of pipe(), where nothing catches it. A source
     * in object mode (e.g. "Readable.from()" over values) is checked as it is
     * read instead, and fails like any other stream on such a chunk.
     */
    toWritableChunks(stream) {
        if (!stream.readableObjectMode) {
            return stream;
        }
        // Passes the chunks on as they are (an empty string, too, which sends
        // the headers early), one at a time, so that it does not read ahead of
        // the response
        const checked = new stream_1.Transform({
            objectMode: true,
            highWaterMark: 1,
            transform(chunk, _encoding, callback) {
                callback(null, isWritableChunk(chunk) ? chunk : undefined);
            },
        });
        // Registered before pipe(), so the source fails as it emits the chunk,
        // before it can end. Its error handler then answers the request, or
        // aborts a response that has started, as for a file that fails midway.
        stream.on('data', chunk => {
            if (!isWritableChunk(chunk)) {
                checked.destroy();
                stream.destroy(new TypeError(`A StreamableFile can only send string and Uint8Array chunks, received ${typeof chunk}`));
            }
        });
        return stream.pipe(checked);
    }
    applyStreamHeaders(response, streamable) {
        const headers = streamable.getHeaders();
        this.setHeaderIfNotExists(response, 'Content-Type', headers.type);
        this.setHeaderIfNotExists(response, 'Content-Disposition', headers.disposition);
        this.setHeaderIfNotExists(response, 'Content-Length', headers.length);
    }
}
exports.ExpressAdapter = ExpressAdapter;
function isWritableChunk(chunk) {
    return typeof chunk === 'string' || util_1.types.isUint8Array(chunk);
}
