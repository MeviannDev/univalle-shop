import { HttpServer, RequestMethod } from '@nestjs/common';
import { IncomingMessage } from 'http';
import { Observable } from 'rxjs';
import { AdditionalHeaders, WritableHeaderStream } from './sse-stream';
/**
 * The surface the router listens on to learn that the client is gone.
 */
interface CloseSource {
    destroyed?: boolean;
    once(event: 'close', listener: () => void): unknown;
    removeListener(event: 'close', listener: () => void): unknown;
}
/**
 * The request's socket, or the response, whichever the router can listen on
 * for the connection to close.
 */
export declare function pickCloseSource(socket: unknown, response: unknown): CloseSource | undefined;
/**
 * Calls `callback` once `source` closes.
 * @returns a function that stops waiting. Once nothing waits for `source`
 * anymore, no listener is left on it.
 */
export declare function onceClosed(source: CloseSource, callback: () => void): () => void;
export interface CustomHeader {
    name: string;
    value: string | (() => string);
}
export interface RedirectResponse {
    url: string;
    statusCode?: number;
}
export declare class RouterResponseController {
    private readonly applicationRef;
    private readonly logger;
    private readonly exceptionFilter;
    constructor(applicationRef: HttpServer);
    apply<TInput = any, TResponse = any>(result: TInput, response: TResponse, httpStatusCode?: number): Promise<any>;
    redirect<TInput = any, TResponse = any>(resultOrDeferred: TInput, response: TResponse, redirectResponse: RedirectResponse): Promise<void>;
    render<TInput = unknown, TResponse = unknown>(resultOrDeferred: TInput, response: TResponse, template: string): Promise<any>;
    transformToResult(resultOrDeferred: any): Promise<any>;
    getStatusByMethod(requestMethod: RequestMethod): number;
    setHeaders<TResponse = unknown>(response: TResponse, headers: CustomHeader[]): void;
    setStatus<TResponse = unknown>(response: TResponse, statusCode: number): void;
    sse<TInput extends Observable<unknown> = any, TResponse extends WritableHeaderStream = any, TRequest extends IncomingMessage = any>(result: TInput | Promise<TInput>, response: TResponse, request: TRequest, options?: {
        additionalHeaders?: AdditionalHeaders;
        statusCode?: number;
        maxPendingDataLength?: number;
    }): Promise<void>;
    private assertObservable;
    private getOrCreateAbortController;
}
export {};
