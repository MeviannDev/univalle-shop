"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseArrayPipe = void 0;
const tslib_1 = require("tslib");
const injectable_decorator_1 = require("../decorators/core/injectable.decorator");
const optional_decorator_1 = require("../decorators/core/optional.decorator");
const http_status_enum_1 = require("../enums/http-status.enum");
const http_error_by_code_util_1 = require("../utils/http-error-by-code.util");
const close_array_gaps_util_1 = require("../utils/close-array-gaps.util");
const shared_utils_1 = require("../utils/shared.utils");
const validation_errors_constants_1 = require("./validation-errors.constants");
const validation_pipe_1 = require("./validation.pipe");
const VALIDATION_ERROR_MESSAGE = 'Validation failed (parsable array expected)';
const DEFAULT_ARRAY_SEPARATOR = ',';
/**
 * Defines the built-in ParseArray Pipe
 *
 * @see [Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)
 *
 * @publicApi
 */
let ParseArrayPipe = class ParseArrayPipe {
    constructor(options = {}) {
        this.options = options;
        this.validationPipe = new validation_pipe_1.ValidationPipe({
            transform: true,
            validateCustomDecorators: true,
            ...options,
        });
        const { exceptionFactory, errorHttpStatusCode = http_status_enum_1.HttpStatus.BAD_REQUEST } = options;
        this.exceptionFactory =
            exceptionFactory ||
                (error => new http_error_by_code_util_1.HttpErrorByCode[errorHttpStatusCode](error));
    }
    /**
     * Method that accesses and performs optional transformation on argument for
     * in-flight requests.
     *
     * @param value currently processed route argument
     * @param metadata contains metadata about the currently processed route argument
     */
    async transform(value, metadata) {
        if (!value && !this.options.optional) {
            throw this.exceptionFactory(VALIDATION_ERROR_MESSAGE);
        }
        else if ((0, shared_utils_1.isNil)(value) && this.options.optional) {
            return value;
        }
        if (!Array.isArray(value)) {
            if (!(0, shared_utils_1.isString)(value)) {
                throw this.exceptionFactory(VALIDATION_ERROR_MESSAGE);
            }
            else {
                try {
                    value = value
                        .trim()
                        .split(this.options.separator || DEFAULT_ARRAY_SEPARATOR);
                }
                catch {
                    throw this.exceptionFactory(VALIDATION_ERROR_MESSAGE);
                }
            }
        }
        else {
            // Only the items that are present (`[, '1']` gives `['1']`), as
            // ValidationPipe does: the gaps of a sparse array would otherwise be
            // handed on unvalidated. The input array is left unchanged.
            value = (0, close_array_gaps_util_1.withoutArrayGaps)(value);
        }
        if (this.options.items) {
            const validationMetadata = {
                metatype: this.options.items,
                type: 'query',
            };
            const isExpectedTypePrimitive = this.isExpectedTypePrimitive();
            const toClassInstance = (item, index) => {
                // `JSON.parse` stringifies its argument first, so an array holding a
                // single item (`[1]` becomes `'1'`) would be parsed as that item.
                if (this.options.items !== String && (0, shared_utils_1.isString)(item)) {
                    try {
                        item = JSON.parse(item);
                    }
                    catch {
                        // Do nothing
                    }
                }
                if (isExpectedTypePrimitive) {
                    return this.validatePrimitive(item, index);
                }
                return this.validationPipe.transform(item, validationMetadata);
            };
            if (this.options.stopAtFirstError === false) {
                // strict compare to "false" to make sure
                // that this option is disabled by default
                const errors = [];
                // The validation pipe applies "maxErrorMessagesLength" to the
                // messages of one item, and a string splits into up to one item per
                // character, so the messages of all the items count against it here.
                // As in the validation pipe, a custom exception factory gets them all.
                let remainingLength = this.options.exceptionFactory
                    ? Infinity
                    : (0, validation_errors_constants_1.resolveMaxErrorMessagesLength)(this.options.maxErrorMessagesLength);
                const targetArray = value;
                for (let i = 0; i < targetArray.length; i++) {
                    try {
                        targetArray[i] = await toClassInstance(targetArray[i]);
                    }
                    catch (err) {
                        if (err instanceof Error && !err.getResponse) {
                            // Not a validation error, but a failure of the code that
                            // validates (e.g. an async constraint or a `@Transform()`
                            // function). It is left to the exception filters, as when the
                            // pipe stops at the first error: in the list of messages, it
                            // would be sent as it is and never logged.
                            throw err;
                        }
                        if (remainingLength <= 0) {
                            // The array is rejected either way, so the items that are left
                            // are not validated.
                            errors.push(validation_errors_constants_1.OMITTED_ERRORS_MESSAGE);
                            break;
                        }
                        let message;
                        if (err.getResponse) {
                            const response = err.getResponse();
                            if (Array.isArray(response.message)) {
                                message = response.message.map((item) => `[${i}] ${item}`);
                            }
                            else {
                                message = `[${i}] ${response.message}`;
                            }
                        }
                        else {
                            message = err;
                        }
                        // Appended in place, since `concat()` would copy all the errors so
                        // far for each invalid item, and one at a time, since one item can
                        // have more errors than `push(...message)` takes arguments.
                        for (const item of Array.isArray(message) ? message : [message]) {
                            errors.push(item);
                            remainingLength -= (0, shared_utils_1.isString)(item) ? item.length : 1;
                        }
                    }
                }
                if (errors.length > 0) {
                    throw this.exceptionFactory(errors);
                }
                return targetArray;
            }
            else {
                // One item at a time, up to the first that fails: validating them all
                // at once kept the validation and the exception of every item alive
                // together, and a string splits into up to one item per character.
                const targetArray = value;
                const items = [];
                for (let i = 0; i < targetArray.length; i++) {
                    items.push(await toClassInstance(targetArray[i], i));
                }
                value = items;
            }
        }
        return value;
    }
    isExpectedTypePrimitive() {
        return [Boolean, Number, String].includes(this.options.items);
    }
    validatePrimitive(originalValue, index) {
        if (this.options.items === Number) {
            if (!this.isNumeric(originalValue)) {
                throw this.exceptionFactory(`${(0, shared_utils_1.isUndefined)(index) ? '' : `[${index}] `}item must be a number`);
            }
            return Number(originalValue);
        }
        else if (this.options.items === String) {
            if (!(0, shared_utils_1.isString)(originalValue)) {
                return `${originalValue}`;
            }
        }
        else if (this.options.items === Boolean) {
            if (typeof originalValue !== 'boolean') {
                throw this.exceptionFactory(`${(0, shared_utils_1.isUndefined)(index) ? '' : `[${index}] `}item must be a boolean value`);
            }
        }
        return originalValue;
    }
    isNumeric(value) {
        if (typeof value === 'number') {
            return Number.isFinite(value);
        }
        // Booleans, arrays and blank strings coerce to numbers (`+true === 1`,
        // `+[2] === 2`, `+' ' === 0`), so only strings are converted.
        if (typeof value !== 'string' || value.trim() === '') {
            return false;
        }
        // Reject radix prefixes (`Number('0x10') === 16`), as ParseIntPipe and
        // ParseFloatPipe do.
        if (/^0[box]/i.test(value.trim())) {
            return false;
        }
        return Number.isFinite(Number(value));
    }
};
exports.ParseArrayPipe = ParseArrayPipe;
exports.ParseArrayPipe = ParseArrayPipe = tslib_1.__decorate([
    (0, injectable_decorator_1.Injectable)(),
    tslib_1.__param(0, (0, optional_decorator_1.Optional)()),
    tslib_1.__metadata("design:paramtypes", [Object])
], ParseArrayPipe);
