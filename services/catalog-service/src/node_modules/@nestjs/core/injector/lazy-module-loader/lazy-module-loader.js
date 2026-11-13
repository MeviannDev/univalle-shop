"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LazyModuleLoader = void 0;
const silent_logger_1 = require("../helpers/silent-logger");
const module_ref_1 = require("../module-ref");
class LazyModuleLoader {
    constructor(dependenciesScanner, instanceLoader, moduleCompiler, modulesContainer, moduleOverrides) {
        this.dependenciesScanner = dependenciesScanner;
        this.instanceLoader = instanceLoader;
        this.moduleCompiler = moduleCompiler;
        this.modulesContainer = modulesContainer;
        this.moduleOverrides = moduleOverrides;
        /**
         * How many load() calls are building each module, and the modules that a
         * load() has built. Overlapping loads may build a shared import at the
         * same time, and a failed one must not roll back a module that another one
         * is still building or has built.
         */
        this.modulesInBuild = new WeakMap();
        this.builtModules = new WeakSet();
    }
    async load(loaderFn, loadOpts) {
        this.registerLoggerConfiguration(loadOpts);
        const moduleClassOrDynamicDefinition = await loaderFn();
        const insertedModules = [];
        let moduleInstances;
        try {
            moduleInstances = await this.dependenciesScanner.scanForModules({
                moduleDefinition: moduleClassOrDynamicDefinition,
                overrides: this.moduleOverrides,
                lazy: true,
                insertedModules,
            });
        }
        catch (err) {
            // A concurrent load() may be building, or may have built, modules that
            // this scan registered. Only the ones nobody took over are rolled back.
            this.dependenciesScanner.removeModules(insertedModules.filter(moduleInstance => !this.modulesInBuild.has(moduleInstance) &&
                !moduleInstance.isInstantiated));
            throw err;
        }
        if (moduleInstances.length === 0) {
            // The module has been loaded already. In this case, we must
            // retrieve a module reference from the existing container.
            const { token } = await this.moduleCompiler.compile(moduleClassOrDynamicDefinition);
            const moduleInstance = this.modulesContainer.get(token);
            return moduleInstance && this.getTargetModuleRef(moduleInstance);
        }
        // The scan is asynchronous, so a module that was not built yet when the
        // scan reached it may have been built by a concurrent load() since then
        const modulesToBuild = moduleInstances.filter(moduleInstance => !moduleInstance.isInstantiated);
        if (modulesToBuild.length > 0) {
            const lazyModulesContainer = this.createLazyModulesContainer(modulesToBuild);
            await this.buildModules(lazyModulesContainer);
        }
        const [targetModule] = moduleInstances;
        return this.getTargetModuleRef(targetModule);
    }
    async buildModules(lazyModulesContainer) {
        const moduleInstances = [...lazyModulesContainer.values()];
        moduleInstances.forEach(moduleInstance => this.modulesInBuild.set(moduleInstance, (this.modulesInBuild.get(moduleInstance) ?? 0) + 1));
        try {
            await this.dependenciesScanner.scanModulesForDependencies(lazyModulesContainer);
            await this.instanceLoader.createInstancesOfDependencies(lazyModulesContainer);
            moduleInstances.forEach(moduleInstance => this.builtModules.add(moduleInstance));
        }
        catch (err) {
            // The modules that a concurrent load() builds too, or has built, are
            // left to it
            this.dependenciesScanner.removeModules(moduleInstances.filter(moduleInstance => this.modulesInBuild.get(moduleInstance) === 1 &&
                !this.builtModules.has(moduleInstance)));
            throw err;
        }
        finally {
            moduleInstances.forEach(moduleInstance => {
                const count = this.modulesInBuild.get(moduleInstance) - 1;
                if (count > 0) {
                    this.modulesInBuild.set(moduleInstance, count);
                }
                else {
                    this.modulesInBuild.delete(moduleInstance);
                }
            });
        }
    }
    registerLoggerConfiguration(loadOpts) {
        if (loadOpts?.logger === false) {
            this.instanceLoader.setLogger(new silent_logger_1.SilentLogger());
        }
    }
    createLazyModulesContainer(moduleInstances) {
        moduleInstances = Array.from(new Set(moduleInstances));
        return new Map(moduleInstances.map(ref => [ref.token, ref]));
    }
    getTargetModuleRef(moduleInstance) {
        const moduleRefInstanceWrapper = moduleInstance.getProviderByKey(module_ref_1.ModuleRef);
        return moduleRefInstanceWrapper.instance;
    }
}
exports.LazyModuleLoader = LazyModuleLoader;
