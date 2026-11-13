"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationPipe = void 0;
const tslib_1 = require("tslib");
const iterare_1 = require("iterare");
const util_1 = require("util");
const decorators_1 = require("../decorators");
const core_1 = require("../decorators/core");
const http_status_enum_1 = require("../enums/http-status.enum");
const http_error_by_code_util_1 = require("../utils/http-error-by-code.util");
const close_array_gaps_util_1 = require("../utils/close-array-gaps.util");
const load_package_util_1 = require("../utils/load-package.util");
const shared_utils_1 = require("../utils/shared.utils");
const validation_errors_constants_1 = require("./validation-errors.constants");
// Metadata types of class-validator ("ValidationTypes")
const NESTED_VALIDATION = 'nestedValidation';
const CONDITIONAL_VALIDATION = 'conditionalValidation';
let classValidator = {};
let classTransformer = {};
/**
 * Built-in JavaScript types that should be excluded from prototype stripping
 * to avoid conflicts with test frameworks like Jest's useFakeTimers
 */
const BUILT_IN_TYPES = [Date, RegExp, Error, Map, Set, WeakMap, WeakSet];
/**
 * @see [Validation](https://docs.nestjs.com/techniques/validation)
 *
 * @publicApi
 */
let ValidationPipe = class ValidationPipe {
    constructor(options) {
        options = options || {};
        const { transform, disableErrorMessages, errorHttpStatusCode, expectedType, transformOptions, exceptionFactory, validatorPackage, transformerPackage, validateCustomDecorators, maxErrorMessagesLength, ...validatorOptions } = options;
        // @see [https://github.com/nestjs/nest/issues/10683#issuecomment-1413690508](https://github.com/nestjs/nest/issues/10683#issuecomment-1413690508)
        this.validatorOptions = { forbidUnknownValues: false, ...validatorOptions };
        this.isTransformEnabled = !!transform;
        this.transformOptions = transformOptions;
        this.isDetailedOutputDisabled = disableErrorMessages;
        this.validateCustomDecorators = validateCustomDecorators || false;
        this.errorHttpStatusCode = errorHttpStatusCode || http_status_enum_1.HttpStatus.BAD_REQUEST;
        this.expectedType = expectedType;
        this.maxErrorMessagesLength = (0, validation_errors_constants_1.resolveMaxErrorMessagesLength)(maxErrorMessagesLength);
        this.exceptionFactory = exceptionFactory || this.createExceptionFactory();
        classValidator = this.loadValidator(validatorPackage);
        classTransformer = this.loadTransformer(transformerPackage);
    }
    loadValidator(validatorPackage) {
        return (validatorPackage ??
            (0, load_package_util_1.loadPackage)('class-validator', 'ValidationPipe', () => require('class-validator')));
    }
    loadTransformer(transformerPackage) {
        return (transformerPackage ??
            (0, load_package_util_1.loadPackage)('class-transformer', 'ValidationPipe', () => require('class-transformer')));
    }
    async transform(value, metadata) {
        if (this.expectedType) {
            metadata = { ...metadata, metatype: this.expectedType };
        }
        const metatype = metadata.metatype;
        if (!metatype || !this.toValidate(metadata)) {
            return this.isTransformEnabled
                ? this.transformPrimitive(value, metadata)
                : value;
        }
        const originalValue = value;
        value = this.toEmptyIfNil(value, metatype);
        // class-transformer copies an array without its gaps, so the array of a
        // sparse value would be validated without them and returned with them
        // when the value is returned as it came. The gaps are closed first, in
        // place, as the prototype keys are stripped below.
        this.closeArrayGaps(value);
        const isNil = value !== originalValue;
        const isPrimitive = this.isPrimitive(value);
        // class-transformer copies a binary value as it is, and class-validator
        // would then look for the properties of the class among its bytes (and,
        // with "whitelist", fail to delete them), so it gets a stand-in too.
        const isStandIn = isPrimitive || this.isBinary(value);
        this.stripProtoKeys(value);
        let entity = classTransformer.plainToInstance(metatype, value, this.transformOptions);
        const originalEntity = entity;
        const isCtorNotEqual = entity.constructor !== metatype;
        if (isCtorNotEqual && !isStandIn) {
            entity.constructor = metatype;
        }
        else if (isCtorNotEqual) {
            // when "entity" is a primitive or a binary value, we have to
            // temporarily replace the entity to perform the validation against the
            // original metatype defined inside the handler
            entity = { constructor: metatype };
        }
        const binaryErrors = this.findNestedBinaryValues(entity);
        if (binaryErrors.length > 0) {
            // A binary value (e.g. an attachment of a socket.io message) is never
            // an instance of a nested class: class-transformer copies it instead
            // of building the class from it, and class-validator then looks for
            // the rules of its own type (there are none), not those of the class.
            throw await this.exceptionFactory(binaryErrors);
        }
        const errors = await this.validate(entity, {
            ...this.validatorOptions,
            // The target of an error is the whole object it was found in, so an
            // exception factory that sends the errors would repeat that object
            // once per error.
            validationError: {
                target: false,
                ...this.validatorOptions.validationError,
            },
        });
        if (isCtorNotEqual && !isStandIn) {
            // Left on the value, the stand-in would go wherever the value is
            // copied (e.g. `{ ...dto }`), and class-transformer would then take
            // the copy for an instance of the class.
            delete entity.constructor;
        }
        if (errors.length > 0) {
            if ((0, shared_utils_1.isUndefined)(this.validatorOptions.validationError?.value)) {
                this.stripParentErrorValues(errors);
            }
            throw await this.exceptionFactory(errors);
        }
        if (isCtorNotEqual &&
            (isStandIn || Array.isArray(value)) &&
            (await this.hasValidationRules(metatype))) {
            // An array, a primitive or a binary value is never an instance of the
            // class: the validation above has only seen a stand-in without any
            // property set, which passes when none of them is required.
            throw await this.exceptionFactory([
                {
                    property: metadata.data || metadata.type,
                    constraints: { isObject: 'Validation failed (object is expected)' },
                    children: [],
                },
            ]);
        }
        if (originalValue === undefined && originalEntity === '') {
            // Since SWC requires empty string for validation (to avoid an error),
            // a fallback is needed to revert to the original value (when undefined).
            // @see [https://github.com/nestjs/nest/issues/14430](https://github.com/nestjs/nest/issues/14430)
            return originalValue;
        }
        if (isStandIn) {
            // if the value is a primitive (or binary) value and the validation process has been successfully completed
            // we have to revert the original value passed through the pipe
            entity = originalEntity;
        }
        if (this.isTransformEnabled) {
            return entity;
        }
        if (isNil) {
            // if the value was originally undefined or null, revert it back
            return originalValue;
        }
        // we check if the number of keys of the "validatorOptions" is higher than 1 (instead of 0)
        // because the "forbidUnknownValues" now fallbacks to "false" (in case it wasn't explicitly specified)
        const shouldTransformToPlain = Object.keys(this.validatorOptions).length > 1;
        return shouldTransformToPlain
            ? classTransformer.classToPlain(entity, this.transformOptions)
            : value;
    }
    createExceptionFactory() {
        return (validationErrors = []) => {
            if (this.isDetailedOutputDisabled) {
                return new http_error_by_code_util_1.HttpErrorByCode[this.errorHttpStatusCode]();
            }
            const budget = {
                remaining: this.maxErrorMessagesLength,
                isExceeded: false,
            };
            validationErrors = this.limitValidationErrors(validationErrors, budget);
            let errors = this.flattenValidationErrors(validationErrors);
            if (budget.isExceeded) {
                errors = [...errors, validation_errors_constants_1.OMITTED_ERRORS_MESSAGE];
            }
            return new http_error_by_code_util_1.HttpErrorByCode[this.errorHttpStatusCode](errors);
        };
    }
    /**
     * Leaves out the errors that come after the first "maxErrorMessagesLength"
     * characters of messages. Each message counts with the path of its
     * property, which is what makes the response to a deeply nested payload
     * grow faster than the payload. The errors past the limit are not visited.
     */
    limitValidationErrors(validationErrors, budget, parentPathLength = 0) {
        const limited = [];
        let isChanged = false;
        for (const error of validationErrors) {
            if (budget.remaining <= 0) {
                budget.isExceeded = true;
                return limited;
            }
            const pathLength = parentPathLength + String(error.property).length + 1;
            for (const key in error.constraints) {
                budget.remaining -= pathLength + String(error.constraints[key]).length;
            }
            const children = error.children &&
                this.limitValidationErrors(error.children, budget, pathLength);
            if (children === error.children) {
                limited.push(error);
            }
            else {
                limited.push({ ...error, children });
                isChanged = true;
            }
        }
        return isChanged ? limited : validationErrors;
    }
    /**
     * Removes the value of the errors that have children. That value is the
     * object or array in which the children were found, so an exception
     * factory that sends the errors would write a nested value once for each
     * level above it. The values left are those of separate parts of the
     * validated value.
     */
    stripParentErrorValues(validationErrors) {
        // Not recursive, since the validated value decides how deep errors go.
        const pending = [validationErrors];
        while (pending.length > 0) {
            for (const error of pending.pop()) {
                if (error.children && error.children.length > 0) {
                    delete error.value;
                    pending.push(error.children);
                }
            }
        }
    }
    toValidate(metadata) {
        const { metatype, type } = metadata;
        if (type === 'custom' && !this.validateCustomDecorators) {
            return false;
        }
        const types = [String, Boolean, Number, Array, Object, Buffer, Date];
        return !types.some(t => metatype === t) && !(0, shared_utils_1.isNil)(metatype);
    }
    transformPrimitive(value, metadata) {
        if (!metadata.data) {
            // leave top-level query/param objects unmodified
            return value;
        }
        const { type, metatype } = metadata;
        if (type !== 'param' && type !== 'query') {
            return value;
        }
        if (metatype === Boolean) {
            if ((0, shared_utils_1.isUndefined)(value)) {
                // This is an workaround to deal with optional boolean values since
                // optional booleans shouldn't be parsed to a valid boolean when
                // they were not defined
                return undefined;
            }
            // Any fasly value but `undefined` will be parsed to `false`
            return value === true || value === 'true';
        }
        if (metatype === Number) {
            if ((0, shared_utils_1.isUndefined)(value)) {
                // This is a workaround to deal with optional numeric values since
                // optional numerics shouldn't be parsed to a valid number when
                // they were not defined
                return undefined;
            }
            return +value;
        }
        if (metatype === String && !(0, shared_utils_1.isUndefined)(value)) {
            return String(value);
        }
        return value;
    }
    toEmptyIfNil(value, metatype) {
        if (!(0, shared_utils_1.isNil)(value)) {
            return value;
        }
        if (typeof metatype === 'function' ||
            (metatype && 'prototype' in metatype && metatype.prototype?.constructor)) {
            return {};
        }
        // SWC requires empty string to be returned instead of an empty object
        // when the value is nil and the metatype is not a class instance, but a plain object (enum, for example).
        // Otherwise, the error will be thrown.
        // @see [https://github.com/nestjs/nest/issues/12680](https://github.com/nestjs/nest/issues/12680)
        return '';
    }
    stripProtoKeys(value) {
        if (value == null ||
            typeof value !== 'object' ||
            util_1.types.isTypedArray(value)) {
            return;
        }
        // Skip built-in JavaScript primitives to avoid Jest useFakeTimers conflicts
        if (BUILT_IN_TYPES.some(type => value instanceof type)) {
            return;
        }
        if (Array.isArray(value)) {
            // Only the items that are present: the length of a sparse array (e.g.
            // one built from a multipart field named `tags[4294967294]`) can be far
            // beyond its number of items, and a loop over every index would block
            // the event loop for as long. `Object.values()` skips the holes.
            for (const v of Object.values(value)) {
                this.stripProtoKeys(v);
            }
            return;
        }
        // Delete dangerous prototype pollution keys
        delete value.__proto__;
        delete value.prototype;
        // Only delete constructor if it's NOT a built-in type, whatever its value:
        // a falsy one (null, 0, false, "") shadows the prototype's all the same
        if (!BUILT_IN_TYPES.includes(value.constructor)) {
            delete value.constructor;
        }
        for (const key in value) {
            this.stripProtoKeys(value[key]);
        }
    }
    /**
     * Closes the gaps of the sparse arrays in the value to validate, in place
     * (`[, 'a']` becomes `['a']`), so that the arrays that are validated are
     * the ones that are returned.
     */
    closeArrayGaps(value) {
        (0, close_array_gaps_util_1.closeArrayGaps)(value);
    }
    isPrimitive(value) {
        return ['number', 'boolean', 'string'].includes(typeof value);
    }
    isBinary(value) {
        return ArrayBuffer.isView(value) || value instanceof ArrayBuffer;
    }
    validate(object, validatorOptions) {
        return classValidator.validate(object, validatorOptions);
    }
    /**
     * Returns an error for each binary value (a Buffer, a typed array or an
     * ArrayBuffer) that a property validated as a nested object holds, directly
     * or as an item, in the shape of class-validator's error for a primitive in
     * that place. The properties are read from class-validator's metadata
     * storage, once per class: a validator package without one is not checked.
     */
    findNestedBinaryValues(object, metadataCache = new Map()) {
        const metadataStorage = classValidator.getMetadataStorage?.();
        if (!metadataStorage ||
            !(0, shared_utils_1.isObject)(object) ||
            Array.isArray(object) ||
            this.isBinary(object) ||
            !(0, shared_utils_1.isFunction)(object.constructor) ||
            // an object that holds nothing but primitives needs no look
            !Object.values(object).some(shared_utils_1.isObject)) {
            return [];
        }
        const target = object;
        let metadatas = metadataCache.get(target.constructor);
        if (!metadatas) {
            const { always = false, strictGroups = false, groups, } = this.validatorOptions;
            metadatas = metadataStorage.getTargetValidationMetadatas(target.constructor, undefined, always, strictGroups, groups);
            metadataCache.set(target.constructor, metadatas);
        }
        const errors = [];
        const checked = new Set();
        for (const metadata of metadatas) {
            const property = metadata.propertyName;
            if (metadata.type !== NESTED_VALIDATION || checked.has(property)) {
                continue;
            }
            checked.add(property);
            const value = target[property];
            // class-validator does not look at a value that a condition of the
            // property (e.g. "@ValidateIf()" or "@IsOptional()") rules out
            const isValidated = () => metadatas.every(item => item.type !== CONDITIONAL_VALIDATION ||
                item.propertyName !== property ||
                item.constraints[0](target, value));
            const message = ((0, shared_utils_1.isString)(metadata.message)
                ? metadata.message
                : `${metadata.each ? 'each value in ' : ''}nested property $property must be either object or array`).replace(/\$property/g, property);
            const error = this.toNestedBinaryError(property, value, message, metadataCache);
            if (error && isValidated()) {
                errors.push(error);
            }
        }
        return errors;
    }
    toNestedBinaryError(property, value, message, metadataCache) {
        if (this.isBinary(value)) {
            return {
                property,
                constraints: { [NESTED_VALIDATION]: message },
                children: [],
            };
        }
        let children = [];
        if (Array.isArray(value) || value instanceof Set || value instanceof Map) {
            // class-validator validates each item, with or without "each"
            const items = value instanceof Set ? Array.from(value) : value;
            items.forEach((item, key) => {
                const error = this.toNestedBinaryError(String(key), item, message, metadataCache);
                if (error) {
                    children.push(error);
                }
            });
        }
        else {
            children = this.findNestedBinaryValues(value, metadataCache);
        }
        return children.length > 0 ? { property, children } : undefined;
    }
    async hasValidationRules(metatype) {
        // "forbidUnknownValues" rejects a class without any rule that applies
        const errors = await this.validate({ constructor: metatype }, { ...this.validatorOptions, forbidUnknownValues: true });
        return !errors.some(error => error.constraints?.unknownValue);
    }
    flattenValidationErrors(validationErrors) {
        return (0, iterare_1.iterate)(validationErrors)
            .map(error => this.mapChildrenToValidationErrors(error))
            .flatten()
            .filter(item => !!item.constraints)
            .map(item => Object.values(item.constraints))
            .flatten()
            .toArray();
    }
    mapChildrenToValidationErrors(error, parentPath, validationErrors = []) {
        if (!(error.children && error.children.length)) {
            validationErrors.push(error);
            return validationErrors;
        }
        parentPath = parentPath
            ? `${parentPath}.${error.property}`
            : error.property;
        for (const item of error.children) {
            if (item.children && item.children.length) {
                // Nested errors go into the same list: copying each level's list into
                // its parent took as many copies as depth times leaves, and spreading
                // a long one into push() threw a RangeError.
                const nested = this.mapChildrenToValidationErrors(item, parentPath, validationErrors);
                if (nested !== validationErrors) {
                    // an override returned a list of its own
                    for (const nestedError of nested) {
                        validationErrors.push(nestedError);
                    }
                }
            }
            validationErrors.push(this.prependConstraintsWithParentProp(parentPath, item));
        }
        return validationErrors;
    }
    prependConstraintsWithParentProp(parentPath, error) {
        const constraints = {};
        for (const key in error.constraints) {
            constraints[key] = `${parentPath}.${error.constraints[key]}`;
        }
        return {
            ...error,
            constraints,
        };
    }
};
exports.ValidationPipe = ValidationPipe;
exports.ValidationPipe = ValidationPipe = tslib_1.__decorate([
    (0, core_1.Injectable)(),
    tslib_1.__param(0, (0, decorators_1.Optional)()),
    tslib_1.__metadata("design:paramtypes", [Object])
], ValidationPipe);
