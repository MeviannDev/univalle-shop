"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OMITTED_ERRORS_MESSAGE = exports.DEFAULT_MAX_ERROR_MESSAGES_LENGTH = void 0;
exports.resolveMaxErrorMessagesLength = resolveMaxErrorMessagesLength;
/**
 * The default of the `maxErrorMessagesLength` option of the validation pipes.
 */
exports.DEFAULT_MAX_ERROR_MESSAGES_LENGTH = 1_000_000;
/**
 * The `maxErrorMessagesLength` to apply. One that is missing, or that is not
 * a number (e.g. NaN from "Number(process.env.UNSET)"), gets the default:
 * none of the checks on the limit trips for NaN, so keeping it would turn
 * the limit off. 0 and Infinity are kept.
 */
function resolveMaxErrorMessagesLength(value) {
    return value == null || isNaN(value)
        ? exports.DEFAULT_MAX_ERROR_MESSAGES_LENGTH
        : value;
}
/**
 * The last message of an error response that `maxErrorMessagesLength` cut
 * short.
 */
exports.OMITTED_ERRORS_MESSAGE = 'Further validation errors were omitted';
