"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractInstanceResolver = void 0;
const common_1 = require("@nestjs/common");
const exceptions_1 = require("../errors/exceptions");
class AbstractInstanceResolver {
    find(typeOrToken, options) {
        const instanceLinkOrArray = this.instanceLinksHost.get(typeOrToken, options);
        const pluckInstance = ({ wrapperRef }) => {
            if (wrapperRef.scope === common_1.Scope.REQUEST ||
                wrapperRef.scope === common_1.Scope.TRANSIENT ||
                !wrapperRef.isDependencyTreeStatic()) {
                throw new exceptions_1.InvalidClassScopeException(typeOrToken);
            }
            return wrapperRef.instance;
        };
        if (Array.isArray(instanceLinkOrArray)) {
            return instanceLinkOrArray.map(pluckInstance);
        }
        return pluckInstance(instanceLinkOrArray);
    }
    async resolvePerContext(typeOrToken, contextModule, contextId, options) {
        const instanceLinkOrArray = options?.strict
            ? this.instanceLinksHost.get(typeOrToken, {
                moduleId: contextModule.id,
                each: options.each,
            })
            : this.instanceLinksHost.get(typeOrToken, {
                each: options?.each,
            });
        const pluckInstance = async (instanceLink) => {
            let { wrapperRef, collection } = instanceLink;
            if (wrapperRef.isAlias) {
                // An alias (`useExisting`) is default-scoped whatever the scope of
                // the provider it stands for, so that provider is resolved instead
                wrapperRef = this.injector.getAliasedWrapper(wrapperRef);
                collection = wrapperRef.host?.providers ?? collection;
            }
            if (wrapperRef.isDependencyTreeStatic() && !wrapperRef.isTransient) {
                return wrapperRef.instance;
            }
            const ctorHost = wrapperRef.instance || { constructor: typeOrToken };
            const instance = await this.injector.loadPerContext(ctorHost, wrapperRef.host, collection, contextId, wrapperRef);
            if (!instance) {
                throw new exceptions_1.UnknownElementException();
            }
            return instance;
        };
        if (Array.isArray(instanceLinkOrArray)) {
            return Promise.all(instanceLinkOrArray.map(instanceLink => pluckInstance(instanceLink)));
        }
        return pluckInstance(instanceLinkOrArray);
    }
}
exports.AbstractInstanceResolver = AbstractInstanceResolver;
