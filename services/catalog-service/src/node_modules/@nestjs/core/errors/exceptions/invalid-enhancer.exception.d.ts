import { RuntimeException } from './runtime.exception';
export declare class InvalidEnhancerException extends RuntimeException {
    constructor(kind: string, method: string, description: string);
}
