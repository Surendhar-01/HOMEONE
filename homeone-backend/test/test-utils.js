"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildValidationPipe = buildValidationPipe;
var common_1 = require("@nestjs/common");
/** Mirrors the pipe registered in `main.ts` so e2e tests exercise real validation. */
function buildValidationPipe() {
    return new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
        validationError: { target: false, value: false },
    });
}
