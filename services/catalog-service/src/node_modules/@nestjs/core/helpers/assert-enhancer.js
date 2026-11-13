"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertEnhancer = assertEnhancer;
exports.warnOnInvalidFilter = warnOnInvalidFilter;
exports.describeEnhancer = describeEnhancer;
const common_1 = require("@nestjs/common");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const invalid_enhancer_exception_1 = require("../errors/exceptions/invalid-enhancer.exception");
const messages_1 = require("../errors/messages");
const ENHANCER_METHODS = {
    guard: 'canActivate',
    interceptor: 'intercept',
    pipe: 'transform',
};
/**
 * Throws when the given value can't run as an enhancer of the given kind.
 * Such a value used to be dropped without an error, which left the handlers
 * it was bound to without it (e.g., unguarded).
 *
 * @param description what was bound, for the message (by default, the value)
 */
function assertEnhancer(enhancer, kind, description = describeEnhancer(enhancer)) {
    const method = ENHANCER_METHODS[kind];
    if (enhancer && (0, shared_utils_1.isFunction)(enhancer[method])) {
        return;
    }
    throw new invalid_enhancer_exception_1.InvalidEnhancerException(kind, method, description);
}
/**
 * Warns when the given value can't run as an exception filter. Unlike the
 * other enhancers, such a filter is still skipped rather than rejected: the
 * exceptions it was meant to handle get the default response, so no handler
 * runs without a check it relies on.
 *
 * @param description what was bound, for the message (by default, the value)
 */
function warnOnInvalidFilter(filter, description = describeEnhancer(filter)) {
    // A promise has a "catch" method too, but is never a filter
    const isThenable = (0, shared_utils_1.isFunction)(filter?.then);
    if (filter &&
        !isThenable &&
        (0, shared_utils_1.isFunction)(filter.catch)) {
        return;
    }
    new common_1.Logger('ExceptionFilter').warn((0, messages_1.INVALID_FILTER_MESSAGE)(description));
}
function describeEnhancer(value) {
    if ((0, shared_utils_1.isFunction)(value)) {
        return value.name ? `class ${value.name}` : 'an anonymous class';
    }
    if ((0, shared_utils_1.isFunction)(value?.then)) {
        return 'a promise';
    }
    if (Array.isArray(value)) {
        return 'an array';
    }
    if ((0, shared_utils_1.isObject)(value)) {
        const name = value.constructor?.name;
        return name && name !== 'Object' ? `an instance of ${name}` : 'an object';
    }
    return String(value);
}
