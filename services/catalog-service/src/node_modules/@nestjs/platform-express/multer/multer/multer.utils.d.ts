import { HttpException } from '@nestjs/common';
import { type MonoTypeOperatorFunction } from 'rxjs';
import { MulterOptions } from '../interfaces/multer-options.interface';
/**
 * Merges the module-level (global) multer options with the options of a
 * route's interceptor (local), which win.
 *
 * A local option set to `null` or `undefined` (e.g. an optional
 * configuration value that is not set) keeps the global value, as if it were
 * not set.
 */
export declare function mergeMulterOptions(options?: MulterOptions, localOptions?: MulterOptions): MulterOptions;
/**
 * Sets `parts`, which multer leaves at `Infinity`, to `DEFAULT_PARTS_LIMIT`
 * wherever it is not set. multer only checks a limit that is present in
 * `limits`, so the default is added to the object, or to the object a
 * function-valued `limits` (multer >= 2.4.0) returns.
 *
 * `fileFilter` is wrapped as well (see `passErrorToCallback()`).
 */
export declare function applyDefaultLimits<T extends MulterOptions>(options: T): T;
type MulterMiddleware = (req: any, res: any, next: (err?: any) => void) => void;
/**
 * Runs a multer middleware (e.g. `multer.single()`) over the request, and
 * settles once multer has parsed the body, with multer's error mapped by
 * `transformException()`.
 *
 * The request is destroyed if the response is sent while multer is still
 * receiving the body, e.g. by an interceptor bound earlier that timed out:
 * the route handler would then never run, and nothing would remove what
 * multer goes on to store. multer stops for a destroyed request, and removes
 * the files it stored for it.
 *
 * Once multer is done, the gaps in the arrays of its body are closed (see
 * `closeArrayGaps()`).
 */
export declare function runMulter(middleware: MulterMiddleware, req: any, res: any): Promise<void>;
/**
 * Closes the gaps in the arrays of a multipart body once it is parsed, as
 * `qs` does for a urlencoded body. A field name picks the index its value is
 * stored at (`tags[1000]`), which leaves the indexes before it empty: the
 * array is longer than the number of values sent, and what copies it skips
 * the empty slots (class-transformer does, for `ValidationPipe`), so the
 * array that was validated would not be the one the route handler gets.
 * The order of the values is kept.
 */
export declare function closeArrayGaps(store: object): void;
/**
 * Removes the files multer stored for `req` when the route's pipes reject
 * the request (e.g. `ParseFilePipe`): the route handler never sees them, and
 * nothing else would remove them. They are removed once the response has
 * been sent, as an exception filter may still use (or remove) them, or once
 * the connection of the request has closed: the response of a pipelined
 * request that waits behind others may never report that itself.
 */
export declare function removeFilesOnPipeRejection<T>(storage: any, req: any, res: any): MonoTypeOperatorFunction<T>;
export declare function transformException(error: (Error & {
    field?: string;
    code?: string;
}) | undefined): HttpException | (Error & {
    field?: string;
    code?: string;
}) | undefined;
export {};
