"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestScopedCreateException = void 0;
const messages_1 = require("../messages");
const runtime_exception_1 = require("./runtime.exception");
class RequestScopedCreateException extends runtime_exception_1.RuntimeException {
    constructor(name) {
        super((0, messages_1.REQUEST_SCOPED_CREATE_MESSAGE)(name));
    }
}
exports.RequestScopedCreateException = RequestScopedCreateException;
