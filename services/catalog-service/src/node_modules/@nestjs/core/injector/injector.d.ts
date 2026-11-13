import { InjectionToken } from '@nestjs/common';
import { Controller, ForwardReference, Injectable, Type } from '@nestjs/common/interfaces';
import { ContextId, InstancePerContext, InstanceWrapper, PropertyMetadata } from './instance-wrapper';
import { Module } from './module';
import { SettlementSignal } from './settlement-signal';
/**
 * The type of an injectable dependency
 */
export type InjectorDependency = InjectionToken;
/**
 * The property-based dependency
 */
export interface PropertyDependency {
    key: symbol | string;
    name: InjectorDependency;
    isOptional?: boolean;
    instance?: any;
}
/**
 * Context of a dependency which gets injected by
 * the injector
 */
export interface InjectorDependencyContext {
    /**
     * The name of the property key (property-based injection)
     */
    key?: string | symbol;
    /**
     * The function itself, the name of the function, or injection token.
     */
    name?: Function | string | symbol;
    /**
     * The index of the dependency which gets injected
     * from the dependencies array
     */
    index?: number;
    /**
     * The dependency array which gets injected
     */
    dependencies?: InjectorDependency[];
}
interface ResolutionContext {
    contextId: ContextId;
    inquirer?: InstanceWrapper;
    effectiveInquirerId?: string;
}
export declare class Injector {
    private readonly options?;
    private logger;
    private readonly instanceDecorator;
    /**
     * Per-context loads that the provider which started them could not wait
     * for (see `resolveComponentHost`), awaited by `waitForDeferredLoads`.
     */
    private readonly deferredLoads;
    /**
     * Deferred loads that are still running, per durable dependent of the
     * provider being loaded and per context of that dependent (see
     * `trackDurableDeferredLoad`). Like `deferredLoads`, these are kept per
     * injector: a durable provider that resolves another one through its own
     * `ModuleRef` while such a load runs must not wait for it, as the load may
     * be waiting for that provider.
     */
    private readonly durableDeferredLoads;
    private readonly failedInstances;
    constructor(options?: {
        /**
         * Whether to enable preview mode.
         */
        preview: boolean;
        /**
         * Whether to enable deterministic graph snapshot generation.
         */
        snapshot?: boolean;
        /**
         * Function to decorate a freshly created instance.
         */
        instanceDecorator?: (target: unknown) => unknown;
    } | undefined);
    loadPrototype<T>({ token }: InstanceWrapper<T>, collection: Map<InjectionToken, InstanceWrapper<T>>, contextId?: ContextId): void;
    loadInstance<T>(wrapper: InstanceWrapper<T>, collection: Map<InjectionToken, InstanceWrapper>, moduleRef: Module, resolutionContext?: ResolutionContext): Promise<void>;
    loadMiddleware(wrapper: InstanceWrapper, collection: Map<InjectionToken, InstanceWrapper>, moduleRef: Module, contextId?: ContextId, inquirer?: InstanceWrapper): Promise<void>;
    loadController(wrapper: InstanceWrapper<Controller>, moduleRef: Module, contextId?: ContextId): Promise<void>;
    loadInjectable<T = any>(wrapper: InstanceWrapper<T>, moduleRef: Module, contextId?: ContextId, inquirer?: InstanceWrapper): Promise<void>;
    loadProvider(wrapper: InstanceWrapper<Injectable>, moduleRef: Module, resolutionContext?: ResolutionContext): Promise<void>;
    applySettlementSignal<T>(instancePerContext: InstancePerContext<T>, host: InstanceWrapper<T>): SettlementSignal;
    resolveConstructorParams<T>(wrapper: InstanceWrapper<T>, moduleRef: Module, inject: InjectorDependency[] | undefined, callback: (args: unknown[]) => void | Promise<void>, resolutionContext?: ResolutionContext, parentInquirer?: InstanceWrapper): Promise<void>;
    getClassDependencies<T>(wrapper: InstanceWrapper<T>): [InjectorDependency[], number[]];
    getFactoryProviderDependencies<T>(wrapper: InstanceWrapper<T>): [InjectorDependency[], number[]];
    reflectConstructorParams(type: Type<unknown> | Function): any[];
    reflectOptionalParams(type: Type<unknown> | Function): any[];
    reflectSelfParams(type: Type<unknown> | Function): any[];
    resolveSingleParam<T>(wrapper: InstanceWrapper<T>, param: Type<any> | string | symbol, dependencyContext: InjectorDependencyContext, moduleRef: Module, resolutionContext?: ResolutionContext, keyOrIndex?: symbol | string | number): Promise<InstanceWrapper<any>>;
    resolveParamToken<T>(wrapper: InstanceWrapper<T>, param: Type<any> | string | symbol | ForwardReference): any;
    resolveComponentWrapper<T>(moduleRef: Module, token: InjectionToken, dependencyContext: InjectorDependencyContext, wrapper: InstanceWrapper<T>, resolutionContext?: ResolutionContext, keyOrIndex?: symbol | string | number): Promise<InstanceWrapper>;
    resolveComponentHost<T>(moduleRef: Module, instanceWrapper: InstanceWrapper<T | Promise<T>>, resolutionContext?: ResolutionContext): Promise<InstanceWrapper>;
    lookupComponent<T = any>(providers: Map<Function | string | symbol, InstanceWrapper>, moduleRef: Module, dependencyContext: InjectorDependencyContext, wrapper: InstanceWrapper<T>, resolutionContext?: ResolutionContext, keyOrIndex?: symbol | string | number): Promise<InstanceWrapper<T>>;
    lookupComponentInParentModules<T = any>(dependencyContext: InjectorDependencyContext, moduleRef: Module, wrapper: InstanceWrapper<T>, resolutionContext?: ResolutionContext, keyOrIndex?: symbol | string | number): Promise<any>;
    lookupComponentInImports(moduleRef: Module, name: InjectionToken, wrapper: InstanceWrapper, moduleRegistry?: Set<string>, resolutionContext?: ResolutionContext, keyOrIndex?: symbol | string | number, isTraversing?: boolean): Promise<any>;
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
    getAliasedWrapper(alias: InstanceWrapper): InstanceWrapper;
    /**
     * The wrapper to inject for the one found for a dependency of the given
     * wrapper: the provider an alias stands for (see `getAliasedWrapper`),
     * except to another alias, which loads it itself.
     */
    private getDependencyWrapper;
    /**
     * A synchronous `lookupComponentInImports` for `getAliasedWrapper`: walks
     * the imports the same way, without recording dependency metadata, so
     * that the lookups of other dependencies keep the same number of awaits.
     */
    private lookupAliasedComponentInImports;
    resolveProperties<T>(wrapper: InstanceWrapper<T>, moduleRef: Module, inject?: InjectorDependency[], resolutionContext?: ResolutionContext, parentInquirer?: InstanceWrapper): Promise<PropertyDependency[]>;
    reflectProperties<T>(type: Type<T>): PropertyDependency[];
    applyProperties<T = any>(instance: T, properties: PropertyDependency[]): void;
    instantiateClass<T = any>(instances: any[], wrapper: InstanceWrapper, targetMetatype: InstanceWrapper, resolutionContext?: ResolutionContext): Promise<T>;
    loadPerContext<T = any>(instance: T, moduleRef: Module, collection: Map<InjectionToken, InstanceWrapper>, ctx: ContextId, wrapper?: InstanceWrapper): Promise<T>;
    /**
     * Whether loads were deferred while resolving the given context (see
     * `resolveComponentHost`) that `waitForDeferredLoads` has yet to wait for.
     * Lets callers skip awaiting it otherwise, so that the order in which
     * providers are constructed stays the same for every other context.
     */
    hasDeferredLoads(contextId: ContextId): boolean;
    /**
     * Waits for the loads deferred while resolving the given context (see
     * `resolveComponentHost`), including those that the durable instances it
     * uses were built with (see `trackDurableDeferredLoad`), and throws if one
     * of them failed. A failed load is kept, as instances of the context already
     * reference the provider that it failed to instantiate.
     */
    waitForDeferredLoads(contextId: ContextId): Promise<void>;
    loadEnhancersPerContext(wrapper: InstanceWrapper, ctx: ContextId, inquirer?: InstanceWrapper): Promise<void>;
    private loadEnhancers;
    loadCtorMetadata(metadata: InstanceWrapper<any>[], contextId: ContextId, inquirer?: InstanceWrapper, parentInquirer?: InstanceWrapper): Promise<any[]>;
    loadPropertiesMetadata(metadata: PropertyMetadata[], contextId: ContextId, inquirer?: InstanceWrapper, parentInquirer?: InstanceWrapper): Promise<PropertyDependency[]>;
    /**
     * Whether an error of an optional dependency comes from loading one that
     * exists (e.g., its constructor threw), rather than from looking it up.
     * `@Optional()` only covers a missing provider, so such an error fails the
     * consumer, as it does when the dependencies come from recorded metadata
     * (see `loadCtorMetadata`). This is limited to the instances built for a
     * context, so that an application that starts with a failing optional
     * transient provider still starts.
     */
    private isLoadOfFoundDependency;
    /**
     * A wrapper may be detached while a dependency of it is still loading,
     * e.g., when `ModuleRef#create()` rejects on the first error of its
     * dependencies, or when a lazy module fails to load and is removed before
     * its other providers settle (see `NestContainer#removeModules`). Releases
     * what the dependencies kept for it since.
     */
    private releaseDetachedWrappers;
    /**
     * As `releaseDetachedWrappers`, once the given loads settle: when one of
     * the dependencies of a wrapper fails, the others keep loading after its
     * consumers have failed, and may be detached by then.
     */
    private releaseDetachedWrappersOnSettle;
    private addDeferredLoad;
    /**
     * In a durable context (see `ContextIdStrategy`), the dependents built with
     * the placeholder of a provider whose load is deferred are shared with the
     * next contexts mapped to it, which do not wait for that load. Until it
     * settles, the contexts that use them wait for it as well (see
     * `linkDurableDeferredLoads`); if it fails, the contexts still waiting for
     * one of them fail, and the next one that uses them builds them again (see
     * `getInstanceHost`).
     */
    private trackDurableDeferredLoad;
    /**
     * Adds the running loads that the instance of the wrapper in a durable
     * context was built with (see `trackDurableDeferredLoad`) to the loads of
     * the given context.
     */
    private linkDurableDeferredLoads;
    private forEachDurableDependent;
    /**
     * Returns the instance of the wrapper for the given context, or a new one
     * when it was built with a provider whose deferred load failed (see
     * `trackDurableDeferredLoad`), so that it is built again.
     */
    private getInstanceHost;
    private getInquirerId;
    private createResolutionContext;
    private getContextInquirerId;
    private isInContext;
    private shouldSkipProviderLoading;
    /**
     * For nested TRANSIENT dependencies (TRANSIENT -> TRANSIENT) in non-static contexts,
     * returns parentInquirer to ensure each parent TRANSIENT gets its own instance.
     * This is necessary because in REQUEST/DURABLE scopes, the same TRANSIENT wrapper
     * can be used by multiple parents, causing nested TRANSIENTs to be shared incorrectly.
     * For non-TRANSIENT -> TRANSIENT, returns inquirer (current wrapper being created).
     */
    private getEffectiveInquirer;
    private getEffectiveInquirerId;
    private getStaticTransientResolutionContext;
    private getEffectiveResolutionContext;
    private hasDenseCtorMetadata;
    private resolveScopedComponentHost;
    private isInquirerRequest;
    private isInquirer;
    protected addDependencyMetadata(keyOrIndex: symbol | string | number, hostWrapper: InstanceWrapper, instanceWrapper: InstanceWrapper): void;
    private getTokenName;
    private printResolvingDependenciesLog;
    private printLookingForProviderLog;
    private printFoundInModuleLog;
    private isDebugMode;
    private getContextId;
    /**
     * An instance kept in another context than the one being resolved (a
     * durable one, see `ContextIdStrategy`) outlives the request it is built
     * for, and is handed to the next requests mapped to that context. When the
     * strategy supplies a payload, that is its `REQUEST`, never the request
     * that the entry point (a controller that is not durable, a middleware, a
     * message handler, ...) registered as the `REQUEST` of the context.
     */
    private shouldInjectDurablePayload;
    private getNowTimestamp;
}
export {};
