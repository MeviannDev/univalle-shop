"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardsContextCreator = void 0;
const constants_1 = require("@nestjs/common/constants");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const iterare_1 = require("iterare");
const assert_enhancer_1 = require("../helpers/assert-enhancer");
const context_creator_1 = require("../helpers/context-creator");
const constants_2 = require("../injector/constants");
class GuardsContextCreator extends context_creator_1.ContextCreator {
    constructor(container, config) {
        super();
        this.container = container;
        this.config = config;
    }
    create(instance, callback, module, contextId = constants_2.STATIC_CONTEXT, inquirerId) {
        this.moduleContext = module;
        return this.createContext(instance, callback, constants_1.GUARDS_METADATA, contextId, inquirerId);
    }
    createConcreteContext(metadata, contextId = constants_2.STATIC_CONTEXT, inquirerId) {
        if ((0, shared_utils_1.isEmpty)(metadata)) {
            return [];
        }
        return (0, iterare_1.iterate)(metadata)
            .filter((guard) => guard && ((0, shared_utils_1.isFunction)(guard) || (0, shared_utils_1.isFunction)(guard.canActivate)))
            .map(guard => this.getGuardInstance(guard, contextId, inquirerId))
            .filter((guard) => !!guard && (0, shared_utils_1.isFunction)(guard.canActivate))
            .toArray();
    }
    getGuardInstance(metatype, contextId = constants_2.STATIC_CONTEXT, inquirerId) {
        if (!(0, shared_utils_1.isFunction)(metatype)) {
            return metatype;
        }
        const instanceWrapper = this.getInstanceByMetatype(metatype);
        if (!instanceWrapper) {
            return this.pickEnhancer(metatype, null, 'canActivate');
        }
        const instanceHost = instanceWrapper.getInstanceByContextId(this.getContextId(contextId, instanceWrapper), inquirerId);
        const enhancer = this.pickEnhancer(metatype, instanceHost && instanceHost.instance, 'canActivate');
        // Nest constructed the bound class, and neither the instance nor the
        // class can run as a guard. A request-scoped or transient guard outside of
        // its context is only a placeholder whose constructor never ran, and a
        // class that resolves to no provider (a host outside of every module)
        // is skipped as before.
        if (instanceHost?.isConstructorCalled) {
            (0, assert_enhancer_1.assertEnhancer)(enhancer, 'guard', (0, assert_enhancer_1.describeEnhancer)(metatype));
        }
        return enhancer;
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
        const injectables = moduleRef.injectables;
        return injectables.get(metatype);
    }
    getGlobalMetadata(contextId = constants_2.STATIC_CONTEXT, inquirerId) {
        if (!this.config) {
            return [];
        }
        const globalGuards = this.config.getGlobalGuards();
        if (contextId === constants_2.STATIC_CONTEXT && !inquirerId) {
            return globalGuards;
        }
        const scopedGuardWrappers = this.config.getGlobalRequestGuards();
        const scopedGuards = (0, iterare_1.iterate)(scopedGuardWrappers)
            .map(wrapper => wrapper.getInstanceByContextId(this.getContextId(contextId, wrapper), inquirerId))
            .filter(host => !!host)
            .map(host => {
            // A scoped instance only exists here, once per context
            if (host.isConstructorCalled) {
                (0, assert_enhancer_1.assertEnhancer)(host.instance, 'guard');
            }
            return host.instance;
        })
            .toArray();
        return globalGuards.concat(scopedGuards);
    }
}
exports.GuardsContextCreator = GuardsContextCreator;
