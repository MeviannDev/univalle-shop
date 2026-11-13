import { Type } from '@nestjs/common/interfaces';
import { ExceptionFilter } from '@nestjs/common/interfaces/exceptions/exception-filter.interface';
import { ContextCreator } from '../helpers/context-creator';
import { NestContainer } from '../injector/container';
import { InstancePerContext, InstanceWrapper } from '../injector/instance-wrapper';
export declare class BaseExceptionFilterContext extends ContextCreator {
    private readonly container;
    protected moduleContext: string;
    constructor(container: NestContainer);
    createConcreteContext<T extends any[], R extends any[]>(metadata: T, contextId?: import("../injector/instance-wrapper").ContextId, inquirerId?: string): R;
    getFilterInstance(filter: Function | ExceptionFilter, contextId?: import("../injector/instance-wrapper").ContextId, inquirerId?: string): ExceptionFilter | null;
    /**
     * A filter class that has not been instantiated in a context (or for an
     * inquirer) is represented there by an object created from its prototype,
     * e.g. a request-scoped filter of a controller that failed to resolve for
     * the request. Its "catch()" would run without its constructor having been
     * called, i.e. without its dependencies.
     */
    protected isInstantiated(instanceWrapper: InstanceWrapper, instanceHost: InstancePerContext<unknown>): boolean;
    getInstanceByMetatype(metatype: Type<unknown>): InstanceWrapper | undefined;
    reflectCatchExceptions(instance: ExceptionFilter): Type<any>[];
}
