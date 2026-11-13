import { HttpException } from '@nestjs/common';
import { ExceptionFilterMetadata } from '@nestjs/common/interfaces/exceptions/exception-filter-metadata.interface';
import { ArgumentsHost } from '@nestjs/common/interfaces/features/arguments-host.interface';
import { BaseExceptionFilter } from './base-exception-filter';
export declare class ExceptionsHandler extends BaseExceptionFilter {
    private filters;
    next(exception: Error | HttpException, ctx: ArgumentsHost): void;
    setCustomFilters(filters: ExceptionFilterMetadata[]): void;
    invokeCustomFilters<T = any>(exception: T, ctx: ArgumentsHost): boolean;
    /**
     * A filter written for another context returns what that context is to
     * send, and leaves an HTTP request unanswered when it is bound to HTTP
     * routes as well (as a global filter is): an RPC exception filter (e.g. a
     * GrpcExceptionFilter in a hybrid application) returns a stream, or a
     * promise of one, and a GraphQL exception filter the error to report. A
     * filter that answers the request returns nothing, or e.g. the response.
     */
    private isLeftUnanswered;
    private answerLeftException;
}
