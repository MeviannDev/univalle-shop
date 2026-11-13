"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseExceptionFilterContext = void 0;
const constants_1 = require("@nestjs/common/constants");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const iterare_1 = require("iterare");
const class_ref_registry_1 = require("../helpers/class-ref-registry");
const context_creator_1 = require("../helpers/context-creator");
const constants_2 = require("../injector/constants");
class BaseExceptionFilterContext extends context_creator_1.ContextCreator {
    constructor(container) {
        super();
        this.container = container;
    }
    createConcreteContext(metadata, contextId = constants_2.STATIC_CONTEXT, inquirerId) {
        if ((0, shared_utils_1.isEmpty)(metadata)) {
            return [];
        }
        return (0, iterare_1.iterate)(metadata)
            .filter(instance => instance && ((0, shared_utils_1.isFunction)(instance.catch) || (0, shared_utils_1.isFunction)(instance)))
            .map(filter => this.getFilterInstance(filter, contextId, inquirerId))
            .filter(item => !!item)
            .map(instance => ({
            func: instance.catch.bind(instance),
            exceptionMetatypes: this.reflectCatchExceptions(instance),
        }))
            .toArray();
    }
    getFilterInstance(filter, contextId = constants_2.STATIC_CONTEXT, inquirerId) {
        if (!(0, shared_utils_1.isFunction)(filter)) {
            return filter;
        }
        const instanceWrapper = this.getInstanceByMetatype(filter);
        if (!instanceWrapper) {
            return this.pickEnhancer(filter, null, 'catch');
        }
        const instanceHost = instanceWrapper.getInstanceByContextId(this.getContextId(contextId, instanceWrapper), inquirerId);
        if (instanceHost && !this.isInstantiated(instanceWrapper, instanceHost)) {
            return null;
        }
        return this.pickEnhancer(filter, instanceHost && instanceHost.instance, 'catch');
    }
    /**
     * A filter class that has not been instantiated in a context (or for an
     * inquirer) is represented there by an object created from its prototype,
     * e.g. a request-scoped filter of a controller that failed to resolve for
     * the request. Its "catch()" would run without its constructor having been
     * called, i.e. without its dependencies.
     */
    isInstantiated(instanceWrapper, instanceHost) {
        return instanceWrapper.isNotMetatype || !!instanceHost.isConstructorCalled;
    }
    getInstanceByMetatype(metatype) {
        if (!this.moduleContext) {
            return;
        }
        const collection = this.container.getModules();
        const moduleRef = collection.get(this.moduleContext);
        if (!moduleRef) {
            return;
        }
        return moduleRef.injectables.get(metatype);
    }
    reflectCatchExceptions(instance) {
        // `@Catch()` also stores the types on the prototype of the filter class,
        // because the "constructor" of that prototype may name another class (see
        // `getClassRef`), and a filter the application instantiated itself is not
        // a registered class. The class lookup serves filters that an older
        // `@Catch()` decorated.
        return (Reflect.getMetadata(constants_1.FILTER_CATCH_EXCEPTIONS, Object.getPrototypeOf(instance)) ??
            Reflect.getMetadata(constants_1.FILTER_CATCH_EXCEPTIONS, (0, class_ref_registry_1.getClassRef)(instance)) ??
            []);
    }
}
exports.BaseExceptionFilterContext = BaseExceptionFilterContext;
