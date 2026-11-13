"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextCreator = void 0;
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const constants_1 = require("../injector/constants");
const class_ref_registry_1 = require("./class-ref-registry");
class ContextCreator {
    createContext(instance, callback, metadataKey, contextId = constants_1.STATIC_CONTEXT, inquirerId) {
        const globalMetadata = this.getGlobalMetadata &&
            this.getGlobalMetadata(contextId, inquirerId);
        const classMetadata = this.reflectClassMetadata(instance, metadataKey);
        const methodMetadata = this.reflectMethodMetadata(callback, metadataKey);
        return [
            ...this.createConcreteContext(globalMetadata || [], contextId, inquirerId),
            ...this.createConcreteContext(classMetadata, contextId, inquirerId),
            ...this.createConcreteContext(methodMetadata, contextId, inquirerId),
        ];
    }
    reflectClassMetadata(instance, metadataKey) {
        return Reflect.getMetadata(metadataKey, (0, class_ref_registry_1.getClassRef)(instance));
    }
    reflectMethodMetadata(callback, metadataKey) {
        return Reflect.getMetadata(metadataKey, callback);
    }
    /**
     * Returns the enhancer to run for one bound as a class: the instance that
     * the container holds for it. The class itself is used only when that
     * instance doesn't implement the method and the class has a static one of
     * that name, so a static method no longer takes the place of the instance.
     */
    pickEnhancer(metatype, instance, methodKey) {
        if (instance && (0, shared_utils_1.isFunction)(instance[methodKey])) {
            return instance;
        }
        if ((0, shared_utils_1.isFunction)(metatype[methodKey])) {
            return metatype;
        }
        return instance ?? null;
    }
    getContextId(contextId, instanceWrapper) {
        return contextId.getParent
            ? contextId.getParent({
                token: instanceWrapper.token,
                // A transient instance belongs to the consumer it was created for,
                // which is not necessarily durable, so it is never shared through
                // a durable sub-tree
                isTreeDurable: !instanceWrapper.isTransient &&
                    instanceWrapper.isDependencyTreeDurable(),
            })
            : contextId;
    }
}
exports.ContextCreator = ContextCreator;
