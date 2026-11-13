"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleRef = void 0;
const common_1 = require("@nestjs/common");
const random_string_generator_util_1 = require("@nestjs/common/utils/random-string-generator.util");
const request_scoped_create_exception_1 = require("../errors/exceptions/request-scoped-create.exception");
const get_class_scope_1 = require("../helpers/get-class-scope");
const is_durable_1 = require("../helpers/is-durable");
const abstract_instance_resolver_1 = require("./abstract-instance-resolver");
const constants_1 = require("./constants");
const injector_1 = require("./injector");
const instance_links_host_1 = require("./instance-links-host");
const instance_wrapper_1 = require("./instance-wrapper");
class ModuleRef extends abstract_instance_resolver_1.AbstractInstanceResolver {
    get instanceLinksHost() {
        if (!this._instanceLinksHost) {
            this._instanceLinksHost = new instance_links_host_1.InstanceLinksHost(this.container);
        }
        return this._instanceLinksHost;
    }
    constructor(container) {
        super();
        this.container = container;
        const contextOptions = container.contextOptions;
        this.injector = new injector_1.Injector({
            preview: contextOptions?.preview ?? false,
            snapshot: contextOptions?.snapshot,
            instanceDecorator: contextOptions?.instrument?.instanceDecorator,
        });
    }
    introspect(token) {
        const { wrapperRef: wrapper } = this.instanceLinksHost.get(token);
        // An alias (`useExisting`) has the scope of the provider it stands for
        const wrapperRef = wrapper.isAlias
            ? this.injector.getAliasedWrapper(wrapper)
            : wrapper;
        let scope = common_1.Scope.DEFAULT;
        if (!wrapperRef.isDependencyTreeStatic()) {
            scope = common_1.Scope.REQUEST;
        }
        else if (wrapperRef.isTransient) {
            scope = common_1.Scope.TRANSIENT;
        }
        return { scope };
    }
    registerRequestByContextId(request, contextId) {
        this.container.registerRequestProvider(request, contextId);
    }
    async instantiateClass(type, moduleRef, contextId) {
        const wrapper = new instance_wrapper_1.InstanceWrapper({
            name: type && type.name,
            metatype: type,
            isResolved: false,
            scope: (0, get_class_scope_1.getClassScope)(type),
            durable: (0, is_durable_1.isDurable)(type),
            host: moduleRef,
            // Thrown away once the instance is created, and never a node of the
            // serialized graph, so it takes no deterministic id (snapshot mode)
            // from a registry that would grow with every call
            [instance_wrapper_1.INSTANCE_ID_SYMBOL]: (0, random_string_generator_util_1.randomStringGenerator)(),
        });
        if (type?.prototype) {
            wrapper.setInstanceByContextId(contextId ?? constants_1.STATIC_CONTEXT, {
                instance: Object.create(type.prototype),
                isResolved: false,
                isPending: false,
            });
        }
        return new Promise((resolve, reject) => {
            let isCreated = false;
            const callback = async (instances) => {
                try {
                    const properties = await this.injector.resolveProperties(wrapper, moduleRef, undefined, {
                        contextId: contextId ?? constants_1.STATIC_CONTEXT,
                        inquirer: wrapper,
                    });
                    if (this.injector.hasDeferredLoads(contextId ?? constants_1.STATIC_CONTEXT)) {
                        await this.injector.waitForDeferredLoads(contextId ?? constants_1.STATIC_CONTEXT);
                    }
                    // In the static context, a request-scoped provider is a placeholder
                    // that is never constructed and is shared by every caller. Unlike a
                    // constructor parameter, one injected into a property (of the class
                    // or of one of its dependencies) does not skip this callback, so
                    // return without creating the instance, and create() rejects below
                    if ((contextId ?? constants_1.STATIC_CONTEXT) === constants_1.STATIC_CONTEXT &&
                        wrapper.introspectDepsAttribute(dependencies => dependencies.some(item => !item.isDependencyTreeStatic()))) {
                        return;
                    }
                    const instance = new type(...instances);
                    this.injector.applyProperties(instance, properties);
                    isCreated = true;
                    resolve(instance);
                }
                catch (err) {
                    reject(err);
                }
            };
            this.injector
                .resolveConstructorParams(wrapper, moduleRef, undefined, callback, {
                contextId: contextId ?? constants_1.STATIC_CONTEXT,
                inquirer: wrapper,
            })
                .then(() => {
                // The callback is skipped when a dependency is request-scoped
                if (!isCreated) {
                    reject(new request_scoped_create_exception_1.RequestScopedCreateException(type.name));
                }
            })
                .catch(reject);
        }).finally(() => wrapper.detachFromDependencies());
    }
}
exports.ModuleRef = ModuleRef;
