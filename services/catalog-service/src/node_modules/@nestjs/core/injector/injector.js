"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Injector = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("@nestjs/common/constants");
const cli_colors_util_1 = require("@nestjs/common/utils/cli-colors.util");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const iterare_1 = require("iterare");
const perf_hooks_1 = require("perf_hooks");
const exceptions_1 = require("../errors/exceptions");
const runtime_exception_1 = require("../errors/exceptions/runtime.exception");
const undefined_dependency_exception_1 = require("../errors/exceptions/undefined-dependency.exception");
const unknown_dependencies_exception_1 = require("../errors/exceptions/unknown-dependencies.exception");
const barrier_1 = require("../helpers/barrier");
const safe_instance_decorator_1 = require("../helpers/safe-instance-decorator");
const request_constants_1 = require("../router/request/request-constants");
const constants_2 = require("./constants");
const inquirer_1 = require("./inquirer");
const settlement_signal_1 = require("./settlement-signal");
/**
 * Durable instances that may reference the placeholder of a provider whose
 * deferred load failed, with the error (see `trackDurableDeferredLoad`).
 * These instances live in instance wrappers that every injector of an
 * application shares (the one of the application, the one of each
 * `ModuleRef`, and those of microservices and gateways), so this is shared
 * by all injectors too: an instance one of them knows to be built with a
 * failed placeholder must not be handed out by another.
 */
const failedInstances = new WeakMap();
class Injector {
    constructor(options) {
        this.options = options;
        this.logger = new common_1.Logger('InjectorLogger');
        this.instanceDecorator = (target) => target;
        /**
         * Per-context loads that the provider which started them could not wait
         * for (see `resolveComponentHost`), awaited by `waitForDeferredLoads`.
         */
        this.deferredLoads = new WeakMap();
        /**
         * Deferred loads that are still running, per durable dependent of the
         * provider being loaded and per context of that dependent (see
         * `trackDurableDeferredLoad`). Like `deferredLoads`, these are kept per
         * injector: a durable provider that resolves another one through its own
         * `ModuleRef` while such a load runs must not wait for it, as the load may
         * be waiting for that provider.
         */
        this.durableDeferredLoads = new WeakMap();
        this.failedInstances = failedInstances;
        if (options?.instanceDecorator) {
            this.instanceDecorator = (0, safe_instance_decorator_1.makeSafeInstanceDecorator)(options.instanceDecorator);
        }
    }
    loadPrototype({ token }, collection, contextId = constants_2.STATIC_CONTEXT) {
        if (!collection) {
            return;
        }
        const target = collection.get(token);
        const instance = target.createPrototype(contextId);
        if (instance) {
            // Update the wrapper in place instead of replacing it with a copy, as
            // hosts (e.g., the classes its enhancers are bound to) keep a reference
            // to it and must be notified of the dependencies it gets later.
            target.setInstanceByContextId(contextId, { instance });
        }
    }
    async loadInstance(wrapper, collection, moduleRef, resolutionContext = { contextId: constants_2.STATIC_CONTEXT }) {
        const inquirerId = this.getContextInquirerId(resolutionContext);
        const hostContextId = this.getContextId(resolutionContext.contextId, wrapper);
        const instanceHost = this.getInstanceHost(wrapper, hostContextId, inquirerId);
        if (instanceHost.isPending) {
            const settlementSignal = wrapper.settlementSignal;
            if (resolutionContext.inquirer &&
                settlementSignal?.isCycle(resolutionContext.inquirer.id)) {
                throw new exceptions_1.CircularDependencyException(`"${wrapper.name}"`);
            }
            return instanceHost.donePromise.then((err) => {
                if (err) {
                    throw err;
                }
                if (this.failedInstances.has(instanceHost)) {
                    throw this.failedInstances.get(instanceHost);
                }
                this.linkDurableDeferredLoads(wrapper, resolutionContext.contextId, hostContextId);
            });
        }
        const settlementSignal = this.applySettlementSignal(instanceHost, wrapper);
        const token = wrapper.token || wrapper.name;
        const { inject } = wrapper;
        const targetWrapper = collection.get(token);
        if ((0, shared_utils_1.isUndefined)(targetWrapper)) {
            throw new runtime_exception_1.RuntimeException();
        }
        if (instanceHost.isResolved) {
            return settlementSignal.complete();
        }
        try {
            const t0 = this.getNowTimestamp();
            const localResolutionContext = this.createResolutionContext(resolutionContext.contextId, wrapper, inquirerId);
            const callback = async (instances) => {
                const properties = await this.resolveProperties(wrapper, moduleRef, inject, localResolutionContext, resolutionContext.inquirer);
                const instance = await this.instantiateClass(instances, wrapper, targetWrapper, wrapper.isTransient ? localResolutionContext : resolutionContext);
                this.applyProperties(instance, properties);
                wrapper.initTime = this.getNowTimestamp() - t0;
                settlementSignal.complete();
            };
            await this.resolveConstructorParams(wrapper, moduleRef, inject, callback, localResolutionContext, resolutionContext.inquirer);
            if (!instanceHost.isResolved) {
                settlementSignal.complete();
            }
        }
        catch (err) {
            wrapper.removeInstanceByContextId(this.getContextId(resolutionContext.contextId, wrapper), inquirerId);
            settlementSignal.error(err);
            throw err;
        }
    }
    async loadMiddleware(wrapper, collection, moduleRef, contextId = constants_2.STATIC_CONTEXT, inquirer) {
        const { metatype, token } = wrapper;
        const targetWrapper = collection.get(token);
        if (!(0, shared_utils_1.isUndefined)(targetWrapper.instance)) {
            return;
        }
        targetWrapper.instance = Object.create(metatype.prototype);
        await this.loadInstance(wrapper, collection, moduleRef, this.createResolutionContext(contextId, inquirer || wrapper));
    }
    async loadController(wrapper, moduleRef, contextId = constants_2.STATIC_CONTEXT) {
        const controllers = moduleRef.controllers;
        await this.loadInstance(wrapper, controllers, moduleRef, this.createResolutionContext(contextId, wrapper));
        if (wrapper.isDependencyTreeStatic()) {
            // A static controller never gets a per-request load, so its transient
            // enhancers must exist for the controller before the first request.
            return this.loadEnhancers(contextId, wrapper, wrapper.getEnhancersMetadata() || []);
        }
        await this.loadEnhancersPerContext(wrapper, contextId, wrapper);
    }
    async loadInjectable(wrapper, moduleRef, contextId = constants_2.STATIC_CONTEXT, inquirer) {
        const injectables = moduleRef.injectables;
        await this.loadInstance(wrapper, injectables, moduleRef, this.createResolutionContext(contextId, inquirer));
    }
    async loadProvider(wrapper, moduleRef, resolutionContext = { contextId: constants_2.STATIC_CONTEXT }) {
        if (this.shouldSkipProviderLoading(wrapper, resolutionContext)) {
            return;
        }
        const providers = moduleRef.providers;
        await this.loadInstance(wrapper, providers, moduleRef, resolutionContext);
        if (resolutionContext.contextId === constants_2.STATIC_CONTEXT &&
            !resolutionContext.inquirer &&
            wrapper.isDependencyTreeStatic()) {
            // A static provider that hosts handlers (e.g., an entry provider or a
            // gateway) never gets a per-request load either, so its transient
            // enhancers must exist for the provider before the first call.
            // Only its bootstrap load (no inquirer) waits for them, as they may depend
            // on a provider that is itself waiting for this one. The non-transient
            // ones are shared, and get loaded with the injectables of the module.
            const enhancers = wrapper.getEnhancersMetadata() || [];
            return this.loadEnhancers(constants_2.STATIC_CONTEXT, wrapper, enhancers.filter(item => item.isTransient));
        }
        await this.loadEnhancersPerContext(wrapper, resolutionContext.contextId, wrapper);
    }
    applySettlementSignal(instancePerContext, host) {
        const settlementSignal = new settlement_signal_1.SettlementSignal();
        instancePerContext.donePromise = settlementSignal.asPromise();
        instancePerContext.isPending = true;
        host.settlementSignal = settlementSignal;
        return settlementSignal;
    }
    async resolveConstructorParams(wrapper, moduleRef, inject, callback, resolutionContext = { contextId: constants_2.STATIC_CONTEXT }, parentInquirer) {
        const metadata = wrapper.getCtorMetadata();
        if (resolutionContext.contextId !== constants_2.STATIC_CONTEXT &&
            this.hasDenseCtorMetadata(wrapper, inject, metadata)) {
            const deps = await this.loadCtorMetadata(metadata, resolutionContext.contextId, resolutionContext.inquirer, parentInquirer);
            return callback(deps);
        }
        const isFactoryProvider = !(0, shared_utils_1.isNil)(inject);
        const [dependencies, optionalDependenciesIds] = isFactoryProvider
            ? this.getFactoryProviderDependencies(wrapper)
            : this.getClassDependencies(wrapper);
        const paramBarrier = new barrier_1.Barrier(dependencies.length);
        let isResolved = true;
        const resolveParam = async (param, index) => {
            let isFound = false;
            try {
                if (this.isInquirer(param, parentInquirer)) {
                    /*
                     * Signal the barrier to make sure other dependencies do not get stuck waiting forever.
                     */
                    paramBarrier.signal();
                    return parentInquirer && parentInquirer.instance;
                }
                if (resolutionContext.inquirer?.isTransient && parentInquirer) {
                    // When `inquirer` is transient too, inherit the parent inquirer
                    // This is required to ensure that transient providers are only resolved
                    // when requested
                    resolutionContext.inquirer.attachRootInquirer(parentInquirer);
                }
                const nestedResolutionContext = this.getStaticTransientResolutionContext(resolutionContext, parentInquirer);
                const paramWrapper = await this.resolveSingleParam(wrapper, param, { index, dependencies }, moduleRef, nestedResolutionContext, index);
                isFound = true;
                /*
                 * Ensure that all instance wrappers are resolved at this point before we continue.
                 * Otherwise the staticity of `wrapper`'s dependency tree may be evaluated incorrectly
                 * and result in undefined / null injection.
                 */
                await paramBarrier.signalAndWait();
                const effectiveResolutionContext = this.getEffectiveResolutionContext(paramWrapper, resolutionContext, parentInquirer);
                const paramWrapperWithInstance = await this.resolveComponentHost(moduleRef, paramWrapper, effectiveResolutionContext);
                const instanceHost = paramWrapperWithInstance.getInstanceByContextId(this.getContextId(effectiveResolutionContext.contextId, paramWrapperWithInstance), effectiveResolutionContext.effectiveInquirerId);
                if (!instanceHost.isResolved && !paramWrapperWithInstance.forwardRef) {
                    isResolved = false;
                }
                if (this.shouldInjectDurablePayload(paramWrapperWithInstance, wrapper, parentInquirer, resolutionContext.contextId)) {
                    return resolutionContext.contextId.payload;
                }
                return instanceHost?.instance;
            }
            catch (err) {
                /*
                 * Signal the barrier to make sure other dependencies do not get stuck waiting forever. We
                 * do not care if this occurs after `Barrier.signalAndWait()` is called in the `try` block
                 * because the barrier will always have been resolved by then.
                 */
                paramBarrier.signal();
                const isOptional = optionalDependenciesIds.includes(index);
                if (!isOptional ||
                    this.isLoadOfFoundDependency(isFound, resolutionContext)) {
                    throw err;
                }
                return undefined;
            }
        };
        const loads = dependencies.map(resolveParam);
        let instances;
        try {
            instances = await Promise.all(loads);
        }
        catch (err) {
            this.releaseDetachedWrappersOnSettle(loads, wrapper, parentInquirer);
            throw err;
        }
        this.releaseDetachedWrappers(wrapper, parentInquirer);
        isResolved && (await callback(instances));
    }
    getClassDependencies(wrapper) {
        const ctorRef = wrapper.metatype;
        return [
            this.reflectConstructorParams(ctorRef),
            this.reflectOptionalParams(ctorRef),
        ];
    }
    getFactoryProviderDependencies(wrapper) {
        const optionalDependenciesIds = [];
        /**
         * Same as the internal utility function `isOptionalFactoryDependency` from `@nestjs/common`.
         * We are duplicating it here because that one is not supposed to be exported.
         */
        function isOptionalFactoryDependency(value) {
            return (!(0, shared_utils_1.isUndefined)(value.token) &&
                !(0, shared_utils_1.isUndefined)(value.optional) &&
                !value.prototype);
        }
        const mapFactoryProviderInjectArray = (item, index) => {
            if (typeof item !== 'object') {
                return item;
            }
            if (isOptionalFactoryDependency(item)) {
                if (item.optional) {
                    optionalDependenciesIds.push(index);
                }
                return item?.token;
            }
            return item;
        };
        return [
            wrapper.inject?.map?.(mapFactoryProviderInjectArray),
            optionalDependenciesIds,
        ];
    }
    reflectConstructorParams(type) {
        const paramtypes = [
            ...(Reflect.getMetadata(constants_1.PARAMTYPES_METADATA, type) || []),
        ];
        const selfParams = this.reflectSelfParams(type);
        selfParams.forEach(({ index, param }) => (paramtypes[index] = param));
        return Array.from(paramtypes);
    }
    reflectOptionalParams(type) {
        return Reflect.getMetadata(constants_1.OPTIONAL_DEPS_METADATA, type) || [];
    }
    reflectSelfParams(type) {
        return Reflect.getMetadata(constants_1.SELF_DECLARED_DEPS_METADATA, type) || [];
    }
    async resolveSingleParam(wrapper, param, dependencyContext, moduleRef, resolutionContext = { contextId: constants_2.STATIC_CONTEXT }, keyOrIndex) {
        if ((0, shared_utils_1.isUndefined)(param)) {
            this.logger.log('Nest encountered an undefined dependency. This may be due to a circular import or a missing dependency declaration.');
            throw new undefined_dependency_exception_1.UndefinedDependencyException(wrapper.name, dependencyContext, moduleRef);
        }
        const token = this.resolveParamToken(wrapper, param);
        return this.resolveComponentWrapper(moduleRef, token, dependencyContext, wrapper, resolutionContext, keyOrIndex);
    }
    resolveParamToken(wrapper, param) {
        if (typeof param === 'object' && 'forwardRef' in param) {
            wrapper.forwardRef = true;
            return param.forwardRef();
        }
        return param;
    }
    async resolveComponentWrapper(moduleRef, token, dependencyContext, wrapper, resolutionContext = { contextId: constants_2.STATIC_CONTEXT }, keyOrIndex) {
        this.printResolvingDependenciesLog(token, resolutionContext.inquirer);
        this.printLookingForProviderLog(token, moduleRef);
        const providers = moduleRef.providers;
        return this.lookupComponent(providers, moduleRef, { ...dependencyContext, name: token }, wrapper, resolutionContext, keyOrIndex);
    }
    async resolveComponentHost(moduleRef, instanceWrapper, resolutionContext = { contextId: constants_2.STATIC_CONTEXT }) {
        const inquirerId = this.getContextInquirerId(resolutionContext);
        const instanceHost = this.getInstanceHost(instanceWrapper, this.getContextId(resolutionContext.contextId, instanceWrapper), inquirerId);
        if (!instanceHost.isResolved && !instanceWrapper.forwardRef) {
            resolutionContext.inquirer?.settlementSignal?.insertRef(instanceWrapper.id);
            await this.loadProvider(instanceWrapper, instanceWrapper.host ?? moduleRef, resolutionContext);
        }
        else if (!instanceHost.isResolved &&
            instanceWrapper.forwardRef &&
            (resolutionContext.contextId !== constants_2.STATIC_CONTEXT || !!inquirerId)) {
            /**
             * When circular dependency has been detected between
             * either request/transient providers, we have to asynchronously
             * resolve instance host for a specific contextId or inquirer, to ensure
             * that eventual lazily created instance will be merged with the prototype
             * instantiated beforehand.
             */
            if (instanceHost.donePromise) {
                const deferredLoad = instanceHost.donePromise.then((err) => {
                    // The placeholder handed out belongs to the load that failed...
                    if (err) {
                        throw err;
                    }
                    // ...or to an instance built with a provider whose deferred load
                    // failed (see `trackDurableDeferredLoad`). Loading the provider
                    // would build it again (see `getInstanceHost`), which may defer
                    // this load again and fail the same way, without end
                    if (this.failedInstances.has(instanceHost)) {
                        throw this.failedInstances.get(instanceHost);
                    }
                    return this.loadProvider(instanceWrapper, instanceWrapper.host ?? moduleRef, resolutionContext);
                });
                void deferredLoad.catch(err => {
                    instanceWrapper.settlementSignal?.error(err);
                });
                this.addDeferredLoad(resolutionContext.contextId, deferredLoad);
                this.trackDurableDeferredLoad(instanceWrapper, resolutionContext.contextId, deferredLoad);
            }
            else {
                /**
                 * No load has ever been scheduled for this context (e.g., request-scoped
                 * providers are no longer instantiated during static bootstrap, so a fresh
                 * durable/request sub-tree host has no inherited `donePromise`).
                 * Load it now; if a circular dependency is truly in-flight, the nested
                 * lookup will find this host pending and defer through its `donePromise`.
                 */
                await this.loadProvider(instanceWrapper, instanceWrapper.host ?? moduleRef, resolutionContext);
            }
        }
        if (instanceWrapper.async) {
            const host = instanceWrapper.getInstanceByContextId(this.getContextId(resolutionContext.contextId, instanceWrapper), inquirerId);
            host.instance = await host.instance;
            instanceWrapper.setInstanceByContextId(resolutionContext.contextId, host, inquirerId);
        }
        this.linkDurableDeferredLoads(instanceWrapper, resolutionContext.contextId, this.getContextId(resolutionContext.contextId, instanceWrapper));
        return instanceWrapper;
    }
    async lookupComponent(providers, moduleRef, dependencyContext, wrapper, resolutionContext = { contextId: constants_2.STATIC_CONTEXT }, keyOrIndex) {
        const token = wrapper.token || wrapper.name;
        const { name } = dependencyContext;
        if (wrapper && token === name) {
            throw new unknown_dependencies_exception_1.UnknownDependenciesException(wrapper.name, dependencyContext, moduleRef, { id: wrapper.id });
        }
        if (name && providers.has(name)) {
            const instanceWrapper = this.getDependencyWrapper(providers.get(name), wrapper);
            this.printFoundInModuleLog(name, moduleRef);
            this.addDependencyMetadata(keyOrIndex, wrapper, instanceWrapper);
            return instanceWrapper;
        }
        return this.lookupComponentInParentModules(dependencyContext, moduleRef, wrapper, resolutionContext, keyOrIndex);
    }
    async lookupComponentInParentModules(dependencyContext, moduleRef, wrapper, resolutionContext = { contextId: constants_2.STATIC_CONTEXT }, keyOrIndex) {
        const instanceWrapper = await this.lookupComponentInImports(moduleRef, dependencyContext.name, wrapper, new Set(), resolutionContext, keyOrIndex);
        if ((0, shared_utils_1.isNil)(instanceWrapper)) {
            throw new unknown_dependencies_exception_1.UnknownDependenciesException(wrapper.name, dependencyContext, moduleRef, { id: wrapper.id });
        }
        return instanceWrapper;
    }
    async lookupComponentInImports(moduleRef, name, wrapper, moduleRegistry = new Set(), resolutionContext = { contextId: constants_2.STATIC_CONTEXT }, keyOrIndex, isTraversing) {
        let instanceWrapperRef = null;
        const imports = moduleRef.imports || new Set();
        const identity = (item) => item;
        let children = [...imports.values()].filter(identity);
        if (isTraversing) {
            const contextModuleExports = moduleRef.exports;
            children = children.filter(child => contextModuleExports.has(child.metatype));
        }
        for (const relatedModule of children) {
            if (moduleRegistry.has(relatedModule.id)) {
                continue;
            }
            this.printLookingForProviderLog(name, relatedModule);
            moduleRegistry.add(relatedModule.id);
            const { providers, exports } = relatedModule;
            if (!exports.has(name) || !providers.has(name)) {
                const instanceRef = await this.lookupComponentInImports(relatedModule, name, wrapper, moduleRegistry, resolutionContext, keyOrIndex, true);
                if (instanceRef) {
                    this.addDependencyMetadata(keyOrIndex, wrapper, instanceRef);
                    return instanceRef;
                }
                continue;
            }
            this.printFoundInModuleLog(name, relatedModule);
            instanceWrapperRef = this.getDependencyWrapper(providers.get(name), wrapper);
            this.addDependencyMetadata(keyOrIndex, wrapper, instanceWrapperRef);
            /*
             * Stop at the first direct export match. Continuing when the provider is
             * already resolved would let a later import (e.g. a global forRoot module)
             * override an explicit forFeature import for the same token.
             */
            break;
        }
        return instanceWrapperRef;
    }
    /**
     * Returns the provider that an alias (`useExisting`) stands for, following
     * a chain of aliases, each looked up the way the alias looks it up when it
     * is loaded. An alias is a default-scoped provider of its own, so injecting
     * it would hand the one instance it got itself to every consumer, which
     * breaks a transient provider behind it. Returns the alias as it is when
     * the provider it stands for is not found, or when the aliases point to
     * each other, so that loading the alias reports it.
     *
     * Synchronous, so that a lookup settles after as many microtask hops
     * whether it finds an alias or not.
     */
    getAliasedWrapper(alias) {
        const aliases = new Set();
        let instanceWrapper = alias;
        while (instanceWrapper.isAlias && instanceWrapper.host) {
            if (aliases.has(instanceWrapper)) {
                return alias;
            }
            aliases.add(instanceWrapper);
            // `{ inject: [useExisting] }` (see `Module#addCustomUseExisting`)
            const dependency = instanceWrapper.inject?.[0];
            const token = ((0, shared_utils_1.isObject)(dependency) && 'forwardRef' in dependency
                ? dependency.forwardRef()
                : dependency);
            if ((0, shared_utils_1.isNil)(token)) {
                return alias;
            }
            const { host } = instanceWrapper;
            const aliasedWrapper = host.providers.get(token) ??
                this.lookupAliasedComponentInImports(host, token, new Set());
            if (!aliasedWrapper) {
                return alias;
            }
            instanceWrapper = aliasedWrapper;
        }
        return instanceWrapper;
    }
    /**
     * The wrapper to inject for the one found for a dependency of the given
     * wrapper: the provider an alias stands for (see `getAliasedWrapper`),
     * except to another alias, which loads it itself.
     */
    getDependencyWrapper(instanceWrapper, wrapper) {
        return instanceWrapper.isAlias && !wrapper.isAlias
            ? this.getAliasedWrapper(instanceWrapper)
            : instanceWrapper;
    }
    /**
     * A synchronous `lookupComponentInImports` for `getAliasedWrapper`: walks
     * the imports the same way, without recording dependency metadata, so
     * that the lookups of other dependencies keep the same number of awaits.
     */
    lookupAliasedComponentInImports(moduleRef, name, moduleRegistry, isTraversing) {
        const imports = moduleRef.imports || new Set();
        for (const relatedModule of imports) {
            if (!relatedModule) {
                continue;
            }
            if (isTraversing && !moduleRef.exports.has(relatedModule.metatype)) {
                continue;
            }
            if (moduleRegistry.has(relatedModule.id)) {
                continue;
            }
            this.printLookingForProviderLog(name, relatedModule);
            moduleRegistry.add(relatedModule.id);
            const { providers, exports } = relatedModule;
            if (!exports.has(name) || !providers.has(name)) {
                const instanceRef = this.lookupAliasedComponentInImports(relatedModule, name, moduleRegistry, true);
                if (instanceRef) {
                    return instanceRef;
                }
                continue;
            }
            this.printFoundInModuleLog(name, relatedModule);
            return providers.get(name);
        }
        return undefined;
    }
    async resolveProperties(wrapper, moduleRef, inject, resolutionContext = { contextId: constants_2.STATIC_CONTEXT }, parentInquirer) {
        if (!(0, shared_utils_1.isNil)(inject)) {
            return [];
        }
        const metadata = wrapper.getPropertiesMetadata();
        if (metadata && resolutionContext.contextId !== constants_2.STATIC_CONTEXT) {
            return this.loadPropertiesMetadata(metadata, resolutionContext.contextId, resolutionContext.inquirer, parentInquirer);
        }
        const properties = this.reflectProperties(wrapper.metatype);
        const propertyBarrier = new barrier_1.Barrier(properties.length);
        const loads = properties.map(async (item) => {
            let isFound = false;
            try {
                const dependencyContext = {
                    key: item.key,
                    name: item.name,
                };
                if (this.isInquirer(item.name, parentInquirer)) {
                    /*
                     * Signal the barrier to make sure other dependencies do not get stuck waiting forever.
                     */
                    propertyBarrier.signal();
                    return parentInquirer && parentInquirer.instance;
                }
                const nestedResolutionContext = this.getStaticTransientResolutionContext(resolutionContext, parentInquirer);
                const paramWrapper = await this.resolveSingleParam(wrapper, item.name, dependencyContext, moduleRef, nestedResolutionContext, item.key);
                isFound = true;
                /*
                 * Ensure that all instance wrappers are resolved at this point before we continue.
                 * Otherwise the staticity of `wrapper`'s dependency tree may be evaluated incorrectly
                 * and result in undefined / null injection.
                 */
                await propertyBarrier.signalAndWait();
                const effectivePropertyResolutionContext = this.getEffectiveResolutionContext(paramWrapper, resolutionContext, parentInquirer);
                const paramWrapperWithInstance = await this.resolveComponentHost(moduleRef, paramWrapper, effectivePropertyResolutionContext);
                if (!paramWrapperWithInstance) {
                    return undefined;
                }
                const instanceHost = paramWrapperWithInstance.getInstanceByContextId(this.getContextId(effectivePropertyResolutionContext.contextId, paramWrapperWithInstance), effectivePropertyResolutionContext.effectiveInquirerId);
                if (this.shouldInjectDurablePayload(paramWrapperWithInstance, wrapper, parentInquirer, resolutionContext.contextId)) {
                    return resolutionContext.contextId.payload;
                }
                return instanceHost.instance;
            }
            catch (err) {
                /*
                 * Signal the barrier to make sure other dependencies do not get stuck waiting forever. We
                 * do not care if this occurs after `Barrier.signalAndWait()` is called in the `try` block
                 * because the barrier will always have been resolved by then.
                 */
                propertyBarrier.signal();
                if (!item.isOptional ||
                    this.isLoadOfFoundDependency(isFound, resolutionContext)) {
                    throw err;
                }
                return undefined;
            }
        });
        let instances;
        try {
            instances = await Promise.all(loads);
        }
        catch (err) {
            this.releaseDetachedWrappersOnSettle(loads, wrapper, parentInquirer);
            throw err;
        }
        this.releaseDetachedWrappers(wrapper, parentInquirer);
        return properties.map((item, index) => ({
            ...item,
            instance: instances[index],
        }));
    }
    reflectProperties(type) {
        const properties = Reflect.getMetadata(constants_1.PROPERTY_DEPS_METADATA, type) || [];
        const optionalKeys = Reflect.getMetadata(constants_1.OPTIONAL_PROPERTY_DEPS_METADATA, type) || [];
        return properties.map((item) => ({
            ...item,
            name: item.type,
            isOptional: optionalKeys.includes(item.key),
        }));
    }
    applyProperties(instance, properties) {
        if (!(0, shared_utils_1.isObject)(instance)) {
            return undefined;
        }
        (0, iterare_1.iterate)(properties)
            .filter(item => !(0, shared_utils_1.isNil)(item.instance))
            .forEach(item => (instance[item.key] = item.instance));
    }
    async instantiateClass(instances, wrapper, targetMetatype, resolutionContext = { contextId: constants_2.STATIC_CONTEXT }) {
        const { metatype, inject } = wrapper;
        const inquirerId = this.getContextInquirerId(resolutionContext);
        const instanceHost = targetMetatype.getInstanceByContextId(this.getContextId(resolutionContext.contextId, targetMetatype), inquirerId);
        const isInContext = this.isInContext(wrapper, resolutionContext);
        if (this.options?.preview && !wrapper.host?.initOnPreview) {
            instanceHost.isResolved = true;
            return instanceHost.instance;
        }
        if ((0, shared_utils_1.isNil)(inject) && isInContext) {
            instanceHost.instance = wrapper.forwardRef
                ? Object.assign(instanceHost.instance, new metatype(...instances))
                : new metatype(...instances);
            instanceHost.instance = this.instanceDecorator(instanceHost.instance);
            instanceHost.isConstructorCalled = true;
        }
        else if (isInContext) {
            const factoryReturnValue = targetMetatype.metatype(...instances);
            instanceHost.instance = await factoryReturnValue;
            instanceHost.instance = this.instanceDecorator(instanceHost.instance);
            instanceHost.isConstructorCalled = true;
        }
        instanceHost.isResolved = true;
        return instanceHost.instance;
    }
    async loadPerContext(instance, moduleRef, collection, ctx, wrapper) {
        if (!wrapper) {
            const injectionToken = instance.constructor;
            wrapper =
                collection.get(injectionToken) ??
                    // A class provider registered under a token other than its class
                    (0, iterare_1.iterate)(collection.values()).find(item => !item.isAlias && item.instance === instance);
        }
        else {
            wrapper = collection.get(wrapper.token) ?? wrapper;
        }
        await this.loadInstance(wrapper, collection, moduleRef, this.createResolutionContext(ctx, wrapper));
        await this.loadEnhancersPerContext(wrapper, ctx, wrapper);
        if (this.hasDeferredLoads(ctx)) {
            await this.waitForDeferredLoads(ctx);
        }
        const host = wrapper.getInstanceByContextId(this.getContextId(ctx, wrapper), wrapper.id);
        return host && host.instance;
    }
    /**
     * Whether loads were deferred while resolving the given context (see
     * `resolveComponentHost`) that `waitForDeferredLoads` has yet to wait for.
     * Lets callers skip awaiting it otherwise, so that the order in which
     * providers are constructed stays the same for every other context.
     */
    hasDeferredLoads(contextId) {
        return !!this.deferredLoads.get(contextId)?.size;
    }
    /**
     * Waits for the loads deferred while resolving the given context (see
     * `resolveComponentHost`), including those that the durable instances it
     * uses were built with (see `trackDurableDeferredLoad`), and throws if one
     * of them failed. A failed load is kept, as instances of the context already
     * reference the provider that it failed to instantiate.
     */
    async waitForDeferredLoads(contextId) {
        const deferredLoads = this.deferredLoads.get(contextId);
        if (!deferredLoads) {
            return;
        }
        for (const deferredLoad of deferredLoads) {
            await deferredLoad;
            deferredLoads.delete(deferredLoad);
        }
    }
    async loadEnhancersPerContext(wrapper, ctx, inquirer) {
        if (ctx === constants_2.STATIC_CONTEXT) {
            return;
        }
        const enhancers = wrapper.getEnhancersMetadata() || [];
        await this.loadEnhancers(ctx, inquirer, enhancers);
    }
    async loadEnhancers(ctx, inquirer, enhancers) {
        const loadEnhancer = (item) => {
            const hostModule = item.host;
            return this.loadInstance(item, hostModule.injectables, hostModule, this.createResolutionContext(ctx, inquirer));
        };
        await Promise.all(enhancers.map(loadEnhancer));
    }
    async loadCtorMetadata(metadata, contextId, inquirer, parentInquirer) {
        const loads = metadata.map(async (item) => this.resolveScopedComponentHost(item, contextId, inquirer, parentInquirer));
        let hosts;
        try {
            hosts = await Promise.all(loads);
        }
        catch (err) {
            this.releaseDetachedWrappersOnSettle(loads, inquirer, parentInquirer);
            throw err;
        }
        this.releaseDetachedWrappers(inquirer, parentInquirer);
        return hosts.map((item, index) => {
            const dependency = metadata[index];
            const effectiveInquirerId = this.getEffectiveInquirerId(dependency, this.createResolutionContext(contextId, inquirer), parentInquirer);
            if (this.shouldInjectDurablePayload(item, inquirer, parentInquirer, contextId)) {
                return contextId.payload;
            }
            return item?.getInstanceByContextId(this.getContextId(contextId, item), effectiveInquirerId).instance;
        });
    }
    async loadPropertiesMetadata(metadata, contextId, inquirer, parentInquirer) {
        const loads = metadata.map(async ({ wrapper: item, key }) => ({
            key,
            host: await this.resolveComponentHost(item.host, item, this.createResolutionContext(contextId, inquirer)),
        }));
        let dependenciesHosts;
        try {
            dependenciesHosts = await Promise.all(loads);
        }
        catch (err) {
            this.releaseDetachedWrappersOnSettle(loads, inquirer, parentInquirer);
            throw err;
        }
        this.releaseDetachedWrappers(inquirer, parentInquirer);
        const inquirerId = this.getInquirerId(inquirer);
        return dependenciesHosts.map(({ key, host }) => ({
            key,
            name: key,
            instance: this.shouldInjectDurablePayload(host, inquirer, parentInquirer, contextId)
                ? contextId.payload
                : host.getInstanceByContextId(this.getContextId(contextId, host), inquirerId).instance,
        }));
    }
    /**
     * Whether an error of an optional dependency comes from loading one that
     * exists (e.g., its constructor threw), rather than from looking it up.
     * `@Optional()` only covers a missing provider, so such an error fails the
     * consumer, as it does when the dependencies come from recorded metadata
     * (see `loadCtorMetadata`). This is limited to the instances built for a
     * context, so that an application that starts with a failing optional
     * transient provider still starts.
     */
    isLoadOfFoundDependency(isFound, resolutionContext) {
        return isFound && resolutionContext.contextId !== constants_2.STATIC_CONTEXT;
    }
    /**
     * A wrapper may be detached while a dependency of it is still loading,
     * e.g., when `ModuleRef#create()` rejects on the first error of its
     * dependencies, or when a lazy module fails to load and is removed before
     * its other providers settle (see `NestContainer#removeModules`). Releases
     * what the dependencies kept for it since.
     */
    releaseDetachedWrappers(wrapper, inquirer) {
        if (wrapper?.isDetached) {
            wrapper.detachFromDependencies();
        }
        if (inquirer?.isDetached) {
            inquirer.detachFromDependencies();
        }
    }
    /**
     * As `releaseDetachedWrappers`, once the given loads settle: when one of
     * the dependencies of a wrapper fails, the others keep loading after its
     * consumers have failed, and may be detached by then.
     */
    releaseDetachedWrappersOnSettle(loads, wrapper, inquirer) {
        void Promise.allSettled(loads).then(() => this.releaseDetachedWrappers(wrapper, inquirer));
    }
    addDeferredLoad(contextId, deferredLoad) {
        if (contextId === constants_2.STATIC_CONTEXT) {
            return;
        }
        let deferredLoads = this.deferredLoads.get(contextId);
        if (!deferredLoads) {
            deferredLoads = new Set();
            this.deferredLoads.set(contextId, deferredLoads);
        }
        deferredLoads.add(deferredLoad);
    }
    /**
     * In a durable context (see `ContextIdStrategy`), the dependents built with
     * the placeholder of a provider whose load is deferred are shared with the
     * next contexts mapped to it, which do not wait for that load. Until it
     * settles, the contexts that use them wait for it as well (see
     * `linkDurableDeferredLoads`); if it fails, the contexts still waiting for
     * one of them fail, and the next one that uses them builds them again (see
     * `getInstanceHost`).
     */
    trackDurableDeferredLoad(wrapper, contextId, deferredLoad) {
        if (this.getContextId(contextId, wrapper) === contextId) {
            return;
        }
        const untrackers = [];
        this.forEachDurableDependent(wrapper, contextId, (dependent, hostId) => {
            const loadsPerContext = this.durableDeferredLoads.get(dependent) ?? new WeakMap();
            const loads = loadsPerContext.get(hostId) ?? new Set();
            loads.add(deferredLoad);
            loadsPerContext.set(hostId, loads);
            this.durableDeferredLoads.set(dependent, loadsPerContext);
            untrackers.push(() => {
                loads.delete(deferredLoad);
                if (loads.size === 0) {
                    loadsPerContext.delete(hostId);
                }
            });
        });
        const untrack = () => untrackers.forEach(untrackLoad => untrackLoad());
        deferredLoad.then(untrack, (err) => {
            // Looked up again, as a context may have built another dependent with
            // the placeholder in the meantime
            this.forEachDurableDependent(wrapper, contextId, (dependent, hostId) => dependent
                .getExistingInstancesByContextId(hostId)
                .filter(host => host.isResolved || host.isPending)
                .forEach(host => this.failedInstances.set(host, err)));
            untrack();
        });
    }
    /**
     * Adds the running loads that the instance of the wrapper in a durable
     * context was built with (see `trackDurableDeferredLoad`) to the loads of
     * the given context.
     */
    linkDurableDeferredLoads(wrapper, contextId, hostContextId) {
        if (hostContextId === contextId) {
            return;
        }
        this.durableDeferredLoads
            .get(wrapper)
            ?.get(hostContextId)
            ?.forEach(deferredLoad => this.addDeferredLoad(contextId, deferredLoad));
    }
    forEachDurableDependent(wrapper, contextId, callback) {
        for (const dependent of wrapper.getDependents()) {
            const hostContextId = this.getContextId(contextId, dependent);
            if (hostContextId !== contextId) {
                callback(dependent, hostContextId);
            }
        }
    }
    /**
     * Returns the instance of the wrapper for the given context, or a new one
     * when it was built with a provider whose deferred load failed (see
     * `trackDurableDeferredLoad`), so that it is built again.
     */
    getInstanceHost(wrapper, contextId, inquirerId) {
        const instanceHost = wrapper.getInstanceByContextId(contextId, inquirerId);
        if (!instanceHost.isResolved || !this.failedInstances.has(instanceHost)) {
            return instanceHost;
        }
        wrapper.removeInstanceByContextId(contextId, inquirerId);
        return wrapper.getInstanceByContextId(contextId, inquirerId);
    }
    getInquirerId(inquirer) {
        return inquirer ? inquirer.id : undefined;
    }
    createResolutionContext(contextId, inquirer, effectiveInquirerId) {
        return {
            contextId,
            inquirer,
            effectiveInquirerId,
        };
    }
    getContextInquirerId({ inquirer, effectiveInquirerId, }) {
        return effectiveInquirerId ?? this.getInquirerId(inquirer);
    }
    isInContext(wrapper, resolutionContext) {
        return (wrapper.isStatic(resolutionContext.contextId, resolutionContext.inquirer) ||
            wrapper.isInRequestScope(resolutionContext.contextId, resolutionContext.inquirer) ||
            wrapper.isLazyTransient(resolutionContext.contextId, resolutionContext.inquirer) ||
            wrapper.isExplicitlyRequested(resolutionContext.contextId, resolutionContext.inquirer));
    }
    shouldSkipProviderLoading(wrapper, resolutionContext) {
        const isStaticContext = resolutionContext.contextId === constants_2.STATIC_CONTEXT;
        const hasNoInquirer = !resolutionContext.inquirer;
        const isTopLevelStaticTransientOrRequestProvider = hasNoInquirer && (wrapper.isTransient || wrapper.scope === common_1.Scope.REQUEST);
        const isStaticInquirerOutsideResolutionContext = !!resolutionContext.inquirer &&
            !this.isInContext(resolutionContext.inquirer, this.createResolutionContext(resolutionContext.contextId, resolutionContext.inquirer));
        const shouldSkipForStaticBootstrap = isStaticContext &&
            (isTopLevelStaticTransientOrRequestProvider ||
                isStaticInquirerOutsideResolutionContext);
        return shouldSkipForStaticBootstrap;
    }
    /**
     * For nested TRANSIENT dependencies (TRANSIENT -> TRANSIENT) in non-static contexts,
     * returns parentInquirer to ensure each parent TRANSIENT gets its own instance.
     * This is necessary because in REQUEST/DURABLE scopes, the same TRANSIENT wrapper
     * can be used by multiple parents, causing nested TRANSIENTs to be shared incorrectly.
     * For non-TRANSIENT -> TRANSIENT, returns inquirer (current wrapper being created).
     */
    getEffectiveInquirer(dependency, resolutionContext, parentInquirer) {
        const { inquirer, contextId } = resolutionContext;
        if (dependency?.isTransient && inquirer?.isTransient && parentInquirer) {
            if (contextId === constants_2.STATIC_CONTEXT) {
                return inquirer.getRootInquirer() ?? parentInquirer;
            }
            return parentInquirer;
        }
        return inquirer;
    }
    getEffectiveInquirerId(dependency, resolutionContext, parentInquirer) {
        const { contextId, inquirer, effectiveInquirerId } = resolutionContext;
        if (contextId === constants_2.STATIC_CONTEXT &&
            dependency?.isTransient &&
            inquirer?.isTransient &&
            parentInquirer) {
            const baseInquirerId = effectiveInquirerId ?? this.getInquirerId(parentInquirer);
            return `${baseInquirerId}:${inquirer.id}`;
        }
        const effectiveInquirer = this.getEffectiveInquirer(dependency, resolutionContext, parentInquirer);
        return this.getInquirerId(effectiveInquirer);
    }
    getStaticTransientResolutionContext(resolutionContext, parentInquirer) {
        const { contextId, inquirer, effectiveInquirerId } = resolutionContext;
        if (contextId === constants_2.STATIC_CONTEXT &&
            inquirer?.isTransient &&
            parentInquirer) {
            const baseInquirerId = effectiveInquirerId ?? this.getInquirerId(parentInquirer);
            return this.createResolutionContext(contextId, inquirer, `${baseInquirerId}:${inquirer.id}`);
        }
        return resolutionContext;
    }
    getEffectiveResolutionContext(dependency, resolutionContext, parentInquirer) {
        return this.createResolutionContext(resolutionContext.contextId, this.getEffectiveInquirer(dependency, resolutionContext, parentInquirer), this.getEffectiveInquirerId(dependency, resolutionContext, parentInquirer));
    }
    hasDenseCtorMetadata(wrapper, inject, metadata) {
        if (!metadata) {
            return false;
        }
        // The fast path requires a fully populated metadata array.
        // While another request is still registering dependency metadata,
        // sparse entries here would feed request-scoped factories `undefined`.
        const expectedDepsLength = !(0, shared_utils_1.isNil)(inject)
            ? inject.length
            : wrapper.metatype
                ? this.reflectConstructorParams(wrapper.metatype).length
                : 0;
        if (metadata.length !== expectedDepsLength) {
            return false;
        }
        for (let index = 0; index < expectedDepsLength; index++) {
            if (metadata[index] === undefined) {
                return false;
            }
        }
        return true;
    }
    resolveScopedComponentHost(item, contextId, inquirer, parentInquirer) {
        return this.isInquirerRequest(item, parentInquirer)
            ? parentInquirer
            : this.resolveComponentHost(item.host, item, this.getEffectiveResolutionContext(item, this.createResolutionContext(contextId, inquirer), parentInquirer));
    }
    isInquirerRequest(item, parentInquirer) {
        return item.isTransient && item.name === inquirer_1.INQUIRER && parentInquirer;
    }
    isInquirer(param, parentInquirer) {
        return param === inquirer_1.INQUIRER && parentInquirer;
    }
    addDependencyMetadata(keyOrIndex, hostWrapper, instanceWrapper) {
        if ((0, shared_utils_1.isSymbol)(keyOrIndex) || (0, shared_utils_1.isString)(keyOrIndex)) {
            hostWrapper.addPropertiesMetadata(keyOrIndex, instanceWrapper);
        }
        else {
            hostWrapper.addCtorMetadata(keyOrIndex, instanceWrapper);
        }
    }
    getTokenName(token) {
        return (0, shared_utils_1.isFunction)(token) ? token.name : token.toString();
    }
    printResolvingDependenciesLog(token, inquirer) {
        if (!this.isDebugMode()) {
            return;
        }
        const tokenName = this.getTokenName(token);
        const dependentName = (inquirer?.name && inquirer.name.toString?.()) ?? 'unknown';
        const isAlias = dependentName === tokenName;
        const messageToPrint = `Resolving dependency ${cli_colors_util_1.clc.cyanBright(tokenName)}${cli_colors_util_1.clc.green(' in the ')}${cli_colors_util_1.clc.yellow(dependentName)}${cli_colors_util_1.clc.green(` provider ${isAlias ? '(alias)' : ''}`)}`;
        this.logger.log(messageToPrint);
    }
    printLookingForProviderLog(token, moduleRef) {
        if (!this.isDebugMode()) {
            return;
        }
        const tokenName = this.getTokenName(token);
        const moduleRefName = moduleRef?.metatype?.name ?? 'unknown';
        this.logger.log(`Looking for ${cli_colors_util_1.clc.cyanBright(tokenName)}${cli_colors_util_1.clc.green(' in ')}${cli_colors_util_1.clc.magentaBright(moduleRefName)}`);
    }
    printFoundInModuleLog(token, moduleRef) {
        if (!this.isDebugMode()) {
            return;
        }
        const tokenName = this.getTokenName(token);
        const moduleRefName = moduleRef?.metatype?.name ?? 'unknown';
        this.logger.log(`Found ${cli_colors_util_1.clc.cyanBright(tokenName)}${cli_colors_util_1.clc.green(' in ')}${cli_colors_util_1.clc.magentaBright(moduleRefName)}`);
    }
    isDebugMode() {
        return !!process.env.NEST_DEBUG;
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
    /**
     * An instance kept in another context than the one being resolved (a
     * durable one, see `ContextIdStrategy`) outlives the request it is built
     * for, and is handed to the next requests mapped to that context. When the
     * strategy supplies a payload, that is its `REQUEST`, never the request
     * that the entry point (a controller that is not durable, a middleware, a
     * message handler, ...) registered as the `REQUEST` of the context.
     */
    shouldInjectDurablePayload(dependency, dependent, parentInquirer, contextId) {
        if (dependency?.token !== request_constants_1.REQUEST || (0, shared_utils_1.isUndefined)(contextId.payload)) {
            return false;
        }
        // An instance of a transient provider belongs to its consumer
        const host = dependent?.isTransient ? parentInquirer : dependent;
        return !!host && this.getContextId(contextId, host) !== contextId;
    }
    getNowTimestamp() {
        return perf_hooks_1.performance.now();
    }
}
exports.Injector = Injector;
