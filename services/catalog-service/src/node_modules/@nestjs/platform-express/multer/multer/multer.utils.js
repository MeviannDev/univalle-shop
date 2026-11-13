"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeMulterOptions = mergeMulterOptions;
exports.applyDefaultLimits = applyDefaultLimits;
exports.runMulter = runMulter;
exports.closeArrayGaps = closeArrayGaps;
exports.removeFilesOnPipeRejection = removeFilesOnPipeRejection;
exports.transformException = transformException;
const common_1 = require("@nestjs/common");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const rxjs_1 = require("rxjs");
const stream_1 = require("stream");
const multer_constants_1 = require("./multer.constants");
const on_response_close_util_1 = require("../../adapters/utils/on-response-close.util");
/**
 * Merges the module-level (global) multer options with the options of a
 * route's interceptor (local), which win.
 *
 * A local option set to `null` or `undefined` (e.g. an optional
 * configuration value that is not set) keeps the global value, as if it were
 * not set.
 */
function mergeMulterOptions(options = {}, localOptions = {}) {
    return { ...options, ...withoutNil(localOptions) };
}
function withoutNil(options) {
    return Object.fromEntries(Object.entries(options).filter(([, value]) => !(0, shared_utils_1.isNil)(value)));
}
/**
 * Sets `parts`, which multer leaves at `Infinity`, to `DEFAULT_PARTS_LIMIT`
 * wherever it is not set. multer only checks a limit that is present in
 * `limits`, so the default is added to the object, or to the object a
 * function-valued `limits` (multer >= 2.4.0) returns.
 *
 * `fileFilter` is wrapped as well (see `passErrorToCallback()`).
 */
function applyDefaultLimits(options) {
    const limits = options.limits;
    const { fileFilter } = options;
    return {
        ...options,
        ...((0, shared_utils_1.isFunction)(fileFilter) && {
            fileFilter: passErrorToCallback(fileFilter),
        }),
        limits: typeof limits === 'function'
            ? (req) => withDefaultLimits(limits(req))
            : withDefaultLimits(limits),
    };
}
/**
 * multer calls `fileFilter` from an event of the multipart parser, where
 * nothing catches what it throws: the error would not fail the request but
 * end the process, as would the rejection of an async filter. Either is
 * handed to the filter's callback instead, so that multer fails the request
 * with it, as with `callback(error)`. Once the filter has called back, an
 * error is no longer its decision on the file (multer runs the storage
 * engine from that callback), and is left as it is.
 */
function passErrorToCallback(fileFilter) {
    return (req, file, callback) => {
        let calledBack = false;
        const callbackOnce = (error, acceptFile) => {
            if (!calledBack) {
                calledBack = true;
                callback(error, acceptFile);
            }
        };
        const fail = (error) => {
            if (calledBack) {
                throw error;
            }
            // multer takes a falsy error for none.
            callbackOnce((error || new Error(`fileFilter failed: ${String(error)}`)), false);
        };
        let result;
        try {
            result = fileFilter(req, file, callbackOnce);
        }
        catch (error) {
            return fail(error);
        }
        if ((0, shared_utils_1.isFunction)(result?.then)) {
            result.then(undefined, fail);
        }
    };
}
function withDefaultLimits(limits) {
    return {
        ...limits,
        parts: limits?.parts ?? multer_constants_1.DEFAULT_PARTS_LIMIT,
    };
}
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
async function runMulter(middleware, req, res) {
    let isReceiving = true;
    const stopWatching = onResponseFinished(res, () => {
        if (isReceiving && !req?.complete && typeof req?.destroy === 'function') {
            req.destroy();
        }
    });
    try {
        await new Promise((resolve, reject) => middleware(req, res, (err) => err ? reject(transformException(err)) : resolve()));
    }
    finally {
        isReceiving = false;
        stopWatching();
    }
    // multer gives a multipart request a body without a prototype, and leaves
    // any other body alone.
    const body = req?.body;
    if (typeof body === 'object' &&
        body !== null &&
        !Object.getPrototypeOf(body)) {
        closeArrayGaps(body);
    }
}
/**
 * Closes the gaps in the arrays of a multipart body once it is parsed, as
 * `qs` does for a urlencoded body. A field name picks the index its value is
 * stored at (`tags[1000]`), which leaves the indexes before it empty: the
 * array is longer than the number of values sent, and what copies it skips
 * the empty slots (class-transformer does, for `ValidationPipe`), so the
 * array that was validated would not be the one the route handler gets.
 * The order of the values is kept.
 */
function closeArrayGaps(store) {
    // Not recursive, as field names may be nested to any depth.
    const pending = [store];
    while (pending.length > 0) {
        const container = pending.pop();
        // The values rather than the indexes up to `length`, so that the work
        // depends on the number of values: an index may be as large as the
        // field name makes it.
        const values = Object.values(container);
        if (Array.isArray(container) && values.length < container.length) {
            values.forEach((value, index) => (container[index] = value));
            container.length = values.length;
        }
        for (const value of values) {
            if (typeof value === 'object' && value !== null) {
                pending.push(value);
            }
        }
    }
}
function onResponseFinished(res, callback) {
    // A stand-in for a response (e.g. in a unit test) is not watched.
    if (typeof res?.on !== 'function') {
        return () => undefined;
    }
    try {
        return (0, stream_1.finished)(res, callback);
    }
    catch {
        return () => undefined;
    }
}
/**
 * Set on a request whose pipes rejected it, by the router of
 * `@nestjs/core` (see `markRejectedByPipes()` there). Read through the
 * registered symbol rather than an import, so this package still loads with
 * a version of `@nestjs/core` that does not set it.
 */
const REJECTED_BY_PIPES = Symbol.for('nestjs:rejected-by-pipes');
function isRejectedByPipes(req) {
    return req?.[REJECTED_BY_PIPES] === true;
}
/**
 * Removes the files multer stored for `req` when the route's pipes reject
 * the request (e.g. `ParseFilePipe`): the route handler never sees them, and
 * nothing else would remove them. They are removed once the response has
 * been sent, as an exception filter may still use (or remove) them, or once
 * the connection of the request has closed: the response of a pipelined
 * request that waits behind others may never report that itself.
 */
function removeFilesOnPipeRejection(storage, req, res) {
    return (0, rxjs_1.catchError)(err => {
        if (isRejectedByPipes(req)) {
            (0, on_response_close_util_1.onResponseClose)(res, () => {
                for (const file of storedFiles(req)) {
                    try {
                        storage._removeFile(req, file, () => undefined);
                    }
                    catch {
                        // The request has failed already.
                    }
                }
            });
        }
        return (0, rxjs_1.throwError)(() => err);
    });
}
function storedFiles(req) {
    const { file, files } = req;
    if (file) {
        return [file];
    }
    return Array.isArray(files) ? files : Object.values(files ?? {}).flat();
}
// Multer may add in a 'field' property to the error
// https://github.com/expressjs/multer/blob/aa42bea6ac7d0cb8fcb279b15a7278cda805dc63/lib/multer-error.js#L19
function transformException(error) {
    if (!error || error instanceof common_1.HttpException) {
        return error;
    }
    // Multer identifies its errors by `code`, while the messages may change
    // between releases (e.g. "Unexpected field" became "Unexpected file field")
    const exception = isMulterExceptionCode(error.code)
        ? multer_constants_1.multerExceptions[error.code]
        : error.message;
    switch (exception) {
        case multer_constants_1.multerExceptions.LIMIT_FILE_SIZE:
            return new common_1.PayloadTooLargeException(error.message);
        case multer_constants_1.multerExceptions.LIMIT_FILE_COUNT:
        case multer_constants_1.multerExceptions.LIMIT_FIELD_KEY:
        case multer_constants_1.multerExceptions.LIMIT_FIELD_VALUE:
        case multer_constants_1.multerExceptions.LIMIT_FIELD_COUNT:
        case multer_constants_1.multerExceptions.LIMIT_FIELD_NESTING:
        case multer_constants_1.multerExceptions.LIMIT_FIELD_ARRAY_INDEX:
        case multer_constants_1.multerExceptions.INVALID_FIELD_NAME:
        case multer_constants_1.multerExceptions.LIMIT_UNEXPECTED_FILE:
        case multer_constants_1.multerExceptions.LIMIT_PART_COUNT:
        case multer_constants_1.multerExceptions.MISSING_FIELD_NAME:
            if (error.field) {
                return new common_1.BadRequestException(`${error.message} - ${error.field}`);
            }
            return new common_1.BadRequestException(error.message);
        case multer_constants_1.busboyExceptions.MULTIPART_BOUNDARY_NOT_FOUND:
            return new common_1.BadRequestException(error.message);
        case multer_constants_1.busboyExceptions.MULTIPART_MALFORMED_PART_HEADER:
        case multer_constants_1.busboyExceptions.MULTIPART_UNEXPECTED_END_OF_FORM:
        case multer_constants_1.busboyExceptions.MULTIPART_UNEXPECTED_END_OF_FILE:
            return new common_1.BadRequestException(`Multipart: ${error.message}`);
    }
    return error;
}
function isMulterExceptionCode(code) {
    return (typeof code === 'string' &&
        Object.prototype.hasOwnProperty.call(multer_constants_1.multerExceptions, code));
}
