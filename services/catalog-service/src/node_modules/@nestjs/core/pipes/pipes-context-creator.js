"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipesContextCreator = void 0;
const constants_1 = require("@nestjs/common/constants");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const iterare_1 = require("iterare");
const assert_enhancer_1 = require("../helpers/assert-enhancer");
const context_creator_1 = require("../helpers/context-creator");
const constants_2 = require("../injector/constants");
class PipesContextCreator extends context_creator_1.ContextCreator {
    constructor(container, config) {
        super();
        this.container = container;
        this.config = config;
    }
    create(instance, callback, moduleKey, contextId = constants_2.STATIC_CONTEXT, inquirerId) {
        this.moduleContext = moduleKey;
        return this.createContext(instance, callback, constants_1.PIPES_METADATA, contextId, inquirerId);
    }
    createConcreteContext(metadata, contextId = constants_2.STATIC_CONTEXT, inquirerId) {
        if ((0, shared_utils_1.isEmpty)(metadata)) {
            return [];
        }
        return (0, iterare_1.iterate)(metadata)
            .filter((pipe) => pipe && ((0, shared_utils_1.isFunction)(pipe) || (0, shared_utils_1.isFunction)(pipe.transform)))
            .map(pipe => this.getPipeInstance(pipe, contextId, inquirerId))
            .filter(pipe => !!pipe && pipe.transform && (0, shared_utils_1.isFunction)(pipe.transform))
            .toArray();
    }
    getPipeInstance(pipe, contextId = constants_2.STATIC_CONTEXT, inquirerId) {
        if (!(0, shared_utils_1.isFunction)(pipe)) {
            return pipe;
        }
        const instanceWrapper = this.getInstanceByMetatype(pipe);
        if (!instanceWrapper) {
            return this.pickEnhancer(pipe, null, 'transform');
        }
        const instanceHost = instanceWrapper.getInstanceByContextId(this.getContextId(contextId, instanceWrapper), inquirerId);
        const enhancer = this.pickEnhancer(pipe, instanceHost && instanceHost.instance, 'transform');
        // Nest constructed the bound class, and neither the instance nor the
        // class can run as a pipe. A request-scoped or transient pipe outside of
        // its context is only a placeholder whose constructor never ran, and a
        // class that resolves to no provider (a host outside of every module)
        // is skipped as before.
        if (instanceHost?.isConstructorCalled) {
            (0, assert_enhancer_1.assertEnhancer)(enhancer, 'pipe', (0, assert_enhancer_1.describeEnhancer)(pipe));
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
        return moduleRef.injectables.get(metatype);
    }
    getGlobalMetadata(contextId = constants_2.STATIC_CONTEXT, inquirerId) {
        if (!this.config) {
            return [];
        }
        const globalPipes = this.config.getGlobalPipes();
        if (contextId === constants_2.STATIC_CONTEXT && !inquirerId) {
            return globalPipes;
        }
        const scopedPipeWrappers = this.config.getGlobalRequestPipes();
        const scopedPipes = (0, iterare_1.iterate)(scopedPipeWrappers)
            .map(wrapper => wrapper.getInstanceByContextId(this.getContextId(contextId, wrapper), inquirerId))
            .filter(host => !!host)
            .map(host => {
            // A scoped instance only exists here, once per context
            if (host.isConstructorCalled) {
                (0, assert_enhancer_1.assertEnhancer)(host.instance, 'pipe');
            }
            return host.instance;
        })
            .toArray();
        return globalPipes.concat(scopedPipes);
    }
    setModuleContext(context) {
        this.moduleContext = context;
    }
}
exports.PipesContextCreator = PipesContextCreator;
