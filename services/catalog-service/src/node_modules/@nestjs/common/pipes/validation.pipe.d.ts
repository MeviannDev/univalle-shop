import { ClassTransformOptions } from '../interfaces/external/class-transform-options.interface';
import { TransformerPackage } from '../interfaces/external/transformer-package.interface';
import { ValidationError } from '../interfaces/external/validation-error.interface';
import { ValidatorOptions } from '../interfaces/external/validator-options.interface';
import { ValidatorPackage } from '../interfaces/external/validator-package.interface';
import { ArgumentMetadata, PipeTransform } from '../interfaces/features/pipe-transform.interface';
import { Type } from '../interfaces/type.interface';
import { ErrorHttpStatusCode } from '../utils/http-error-by-code.util';
/**
 * @publicApi
 */
export interface ValidationPipeOptions extends ValidatorOptions {
    transform?: boolean;
    disableErrorMessages?: boolean;
    transformOptions?: ClassTransformOptions;
    errorHttpStatusCode?: ErrorHttpStatusCode;
    exceptionFactory?: (errors: ValidationError[]) => any;
    validateCustomDecorators?: boolean;
    expectedType?: Type<any>;
    validatorPackage?: ValidatorPackage;
    transformerPackage?: TransformerPackage;
    /**
     * Maximum total length, in characters, of the messages in an error response
     * of the built-in exception factory, counting the property path that comes
     * with each message. The errors past it are left out, and a last message
     * says so. Set it to `Infinity` to lift the limit.
     *
     * @default 1_000_000
     */
    maxErrorMessagesLength?: number;
}
/**
 * @see [Validation](https://docs.nestjs.com/techniques/validation)
 *
 * @publicApi
 */
export declare class ValidationPipe implements PipeTransform<any> {
    protected isTransformEnabled: boolean;
    protected isDetailedOutputDisabled?: boolean;
    protected validatorOptions: ValidatorOptions;
    protected transformOptions: ClassTransformOptions | undefined;
    protected errorHttpStatusCode: ErrorHttpStatusCode;
    protected expectedType: Type<any> | undefined;
    protected exceptionFactory: (errors: ValidationError[]) => any;
    protected validateCustomDecorators: boolean;
    protected maxErrorMessagesLength: number;
    constructor(options?: ValidationPipeOptions);
    protected loadValidator(validatorPackage?: ValidatorPackage): ValidatorPackage;
    protected loadTransformer(transformerPackage?: TransformerPackage): TransformerPackage;
    transform(value: any, metadata: ArgumentMetadata): Promise<any>;
    createExceptionFactory(): (validationErrors?: ValidationError[]) => unknown;
    /**
     * Leaves out the errors that come after the first "maxErrorMessagesLength"
     * characters of messages. Each message counts with the path of its
     * property, which is what makes the response to a deeply nested payload
     * grow faster than the payload. The errors past the limit are not visited.
     */
    protected limitValidationErrors(validationErrors: ValidationError[], budget: {
        remaining: number;
        isExceeded: boolean;
    }, parentPathLength?: number): ValidationError[];
    /**
     * Removes the value of the errors that have children. That value is the
     * object or array in which the children were found, so an exception
     * factory that sends the errors would write a nested value once for each
     * level above it. The values left are those of separate parts of the
     * validated value.
     */
    protected stripParentErrorValues(validationErrors: ValidationError[]): void;
    protected toValidate(metadata: ArgumentMetadata): boolean;
    protected transformPrimitive(value: any, metadata: ArgumentMetadata): any;
    protected toEmptyIfNil<T = any, R = T>(value: T, metatype: Type<unknown> | object): R | object | string;
    protected stripProtoKeys(value: any): void;
    /**
     * Closes the gaps of the sparse arrays in the value to validate, in place
     * (`[, 'a']` becomes `['a']`), so that the arrays that are validated are
     * the ones that are returned.
     */
    protected closeArrayGaps(value: unknown): void;
    protected isPrimitive(value: unknown): boolean;
    protected isBinary(value: unknown): boolean;
    protected validate(object: object, validatorOptions?: ValidatorOptions): Promise<ValidationError[]> | ValidationError[];
    /**
     * Returns an error for each binary value (a Buffer, a typed array or an
     * ArrayBuffer) that a property validated as a nested object holds, directly
     * or as an item, in the shape of class-validator's error for a primitive in
     * that place. The properties are read from class-validator's metadata
     * storage, once per class: a validator package without one is not checked.
     */
    protected findNestedBinaryValues(object: any, metadataCache?: Map<unknown, any[]>): ValidationError[];
    protected toNestedBinaryError(property: string, value: unknown, message: string, metadataCache: Map<unknown, any[]>): ValidationError | undefined;
    protected hasValidationRules(metatype: Type<unknown>): Promise<boolean>;
    protected flattenValidationErrors(validationErrors: ValidationError[]): string[];
    protected mapChildrenToValidationErrors(error: ValidationError, parentPath?: string, validationErrors?: ValidationError[]): ValidationError[];
    protected prependConstraintsWithParentProp(parentPath: string, error: ValidationError): ValidationError;
}
