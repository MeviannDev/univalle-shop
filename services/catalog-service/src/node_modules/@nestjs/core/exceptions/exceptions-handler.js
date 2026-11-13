"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExceptionsHandler = void 0;
const select_exception_filter_metadata_util_1 = require("@nestjs/common/utils/select-exception-filter-metadata.util");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const rxjs_1 = require("rxjs");
const util_1 = require("util");
const invalid_exception_filter_exception_1 = require("../errors/exceptions/invalid-exception-filter.exception");
const base_exception_filter_1 = require("./base-exception-filter");
class ExceptionsHandler extends base_exception_filter_1.BaseExceptionFilter {
    constructor() {
        super(...arguments);
        this.filters = [];
    }
    next(exception, ctx) {
        if (this.invokeCustomFilters(exception, ctx)) {
            return;
        }
        super.catch(exception, ctx);
    }
    setCustomFilters(filters) {
        if (!Array.isArray(filters)) {
            throw new invalid_exception_filter_exception_1.InvalidExceptionFilterException();
        }
        this.filters = filters;
    }
    invokeCustomFilters(exception, ctx) {
        if ((0, shared_utils_1.isEmpty)(this.filters)) {
            return false;
        }
        const filter = (0, select_exception_filter_metadata_util_1.selectExceptionFilterMetadata)(this.filters, exception);
        if (!filter) {
            return false;
        }
        const result = filter.func(exception, ctx);
        if (util_1.types.isPromise(result)) {
            // What an async filter returns is known once it settles. Only that is
            // handled here: a filter that rejects is left as it is.
            void result.then(value => {
                if (this.isLeftUnanswered(value, ctx)) {
                    this.answerLeftException(exception, ctx);
                }
            });
            return true;
        }
        return !this.isLeftUnanswered(result, ctx);
    }
    /**
     * A filter written for another context returns what that context is to
     * send, and leaves an HTTP request unanswered when it is bound to HTTP
     * routes as well (as a global filter is): an RPC exception filter (e.g. a
     * GrpcExceptionFilter in a hybrid application) returns a stream, or a
     * promise of one, and a GraphQL exception filter the error to report. A
     * filter that answers the request returns nothing, or e.g. the response.
     */
    isLeftUnanswered(result, ctx) {
        return (((0, rxjs_1.isObservable)(result) || result instanceof Error) &&
            !this.applicationRef?.isHeadersSent(ctx.getArgByIndex(1)));
    }
    answerLeftException(exception, ctx) {
        try {
            super.catch(exception, ctx);
        }
        catch (err) {
            // Nothing catches what the built-in filter throws (e.g. for a body that
            // cannot be serialized) once an async filter has settled
            this.handleUnknownError(err, ctx, (this.applicationRef ?? this.httpAdapterHost?.httpAdapter));
        }
    }
}
exports.ExceptionsHandler = ExceptionsHandler;
