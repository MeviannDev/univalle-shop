"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidEnhancerException = void 0;
const messages_1 = require("../messages");
const runtime_exception_1 = require("./runtime.exception");
class InvalidEnhancerException extends runtime_exception_1.RuntimeException {
    constructor(kind, method, description) {
        super((0, messages_1.INVALID_ENHANCER_MESSAGE)(kind, method, description));
    }
}
exports.InvalidEnhancerException = InvalidEnhancerException;
