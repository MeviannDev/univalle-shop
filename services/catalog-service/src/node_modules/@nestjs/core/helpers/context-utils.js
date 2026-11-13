"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextUtils = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("@nestjs/common/constants");
const validation_pipe_1 = require("@nestjs/common/pipes/validation.pipe");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const messages_1 = require("../errors/messages");
const class_ref_registry_1 = require("./class-ref-registry");
const execution_context_host_1 = require("./execution-context-host");
// Handlers already warned about (see `warnOnMissingParamtypes()`). Shared, as
// each context creator has its own `ContextUtils`.
const handlersWithoutParamtypes = new WeakSet();
class ContextUtils {
    mapParamType(key) {
        const keyPair = key.split(':');
        return keyPair[0];
    }
    reflectCallbackParamtypes(instance, methodName) {
        // The types are stored on the prototype that declared the method, which a
        // method copied by a mixin helper does not share with the instance.
        const paramsHost = this.getParamsHost(instance, methodName);
        return ((paramsHost?.prototype &&
            Reflect.getMetadata(constants_1.PARAMTYPES_METADATA, paramsHost.prototype, methodName)) ??
            Reflect.getMetadata(constants_1.PARAMTYPES_METADATA, instance, methodName));
    }
    reflectCallbackMetadata(instance, methodName, metadataKey) {
        return Reflect.getMetadata(metadataKey, this.getParamsHost(instance, methodName), methodName);
    }
    reflectPassthrough(instance, methodName) {
        return Reflect.getMetadata(constants_1.RESPONSE_PASSTHROUGH_METADATA, this.getParamsHost(instance, methodName), methodName);
    }
    /**
     * Returns the class that the parameter decorators of the given handler
     * stored their metadata on (see `getParamsHost`).
     */
    getParamsHost(instance, methodName) {
        return (0, class_ref_registry_1.getParamsHost)((0, class_ref_registry_1.getClassRef)(instance), methodName);
    }
    getArgumentsLength(keys, metadata) {
        return keys.length
            ? Math.max(...keys.map(key => metadata[key].index)) + 1
            : 0;
    }
    createNullArray(length) {
        const a = new Array(length);
        for (let i = 0; i < length; ++i)
            a[i] = undefined;
        return a;
    }
    mergeParamsMetatypes(paramsProperties, paramtypes) {
        if (!paramtypes) {
            return paramsProperties;
        }
        return paramsProperties.map(param => ({
            ...param,
            metatype: paramtypes[param.index],
        }));
    }
    /**
     * A handler has parameter types only if its compiler emits decorator
     * metadata, and tsx and esbuild don't. Without them a `ValidationPipe` has
     * nothing to validate a parameter against and passes it on as it came, so
     * this says so once per handler, when the handler is set up. It doesn't
     * throw, as the handler may not rely on the pipe. A parameter whose
     * `ValidationPipe` was given an `expectedType` needs no metadata, so it isn't
     * reported, and neither is a custom decorator's, which `ValidationPipe`
     * skips by default.
     *
     * @param pipes pipes bound to the handler (global, class and method ones)
     * @param paramsProperties parameters the pipes are applied to
     */
    warnOnMissingParamtypes(instance, methodName, paramtypes, pipes, paramsProperties) {
        const handler = instance[methodName];
        if (paramtypes ||
            !(0, shared_utils_1.isFunction)(handler) ||
            handlersWithoutParamtypes.has(handler)) {
            return;
        }
        const isLeftUnvalidated = ({ type, pipes: paramPipes, }) => {
            if ((0, shared_utils_1.isString)(type)) {
                return false;
            }
            const validationPipes = pipes
                .concat(paramPipes ?? [])
                .filter((pipe) => pipe instanceof validation_pipe_1.ValidationPipe);
            // `expectedType` is protected: read it the way `transform()` does
            return (validationPipes.length > 0 &&
                !validationPipes.some(pipe => pipe['expectedType']));
        };
        if (!paramsProperties.some(isLeftUnvalidated)) {
            return;
        }
        handlersWithoutParamtypes.add(handler);
        new common_1.Logger(ContextUtils.name).warn((0, messages_1.MISSING_HANDLER_METADATA_MESSAGE)((0, class_ref_registry_1.getClassRef)(instance).name, methodName));
    }
    getCustomFactory(factory, data, contextFactory) {
        return (0, shared_utils_1.isFunction)(factory)
            ? (...args) => factory(data, contextFactory(args))
            : () => null;
    }
    getContextFactory(contextType, instance, callback) {
        const type = instance && instance.constructor;
        return (args) => {
            const ctx = new execution_context_host_1.ExecutionContextHost(args, type, callback);
            ctx.setType(contextType);
            return ctx;
        };
    }
}
exports.ContextUtils = ContextUtils;
