import { DynamicModule, Type } from '@nestjs/common';
import { ModuleOverride } from '../../interfaces/module-override.interface';
import { DependenciesScanner } from '../../scanner';
import { ModuleCompiler } from '../compiler';
import { InstanceLoader } from '../instance-loader';
import { ModuleRef } from '../module-ref';
import { ModulesContainer } from '../modules-container';
import { LazyModuleLoaderLoadOptions } from './lazy-module-loader-options.interface';
export declare class LazyModuleLoader {
    private readonly dependenciesScanner;
    private readonly instanceLoader;
    private readonly moduleCompiler;
    private readonly modulesContainer;
    private readonly moduleOverrides?;
    /**
     * How many load() calls are building each module, and the modules that a
     * load() has built. Overlapping loads may build a shared import at the
     * same time, and a failed one must not roll back a module that another one
     * is still building or has built.
     */
    private readonly modulesInBuild;
    private readonly builtModules;
    constructor(dependenciesScanner: DependenciesScanner, instanceLoader: InstanceLoader, moduleCompiler: ModuleCompiler, modulesContainer: ModulesContainer, moduleOverrides?: ModuleOverride[] | undefined);
    load(loaderFn: () => Promise<Type<unknown> | DynamicModule> | Type<unknown> | DynamicModule, loadOpts?: LazyModuleLoaderLoadOptions): Promise<ModuleRef>;
    private buildModules;
    private registerLoggerConfiguration;
    private createLazyModulesContainer;
    private getTargetModuleRef;
}
