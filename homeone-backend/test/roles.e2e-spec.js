"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var testing_1 = require("@nestjs/testing");
var supertest_1 = require("supertest");
var app_module_1 = require("../src/app.module");
var supabase_token_service_1 = require("../src/auth/supabase-token.service");
var test_utils_1 = require("./test-utils");
var customer = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'customer@example.com',
    phone: '+919876543210',
    role: 'CUSTOMER',
    roles: ['CUSTOMER'],
    fullName: 'Customer One',
    isEmailVerified: true,
    isMobileVerified: true,
};
var professional = {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'provider@example.com',
    phone: '+919876543211',
    role: 'PROFESSIONAL',
    roles: ['PROFESSIONAL'],
    fullName: 'Provider One',
    isEmailVerified: true,
    isMobileVerified: false,
};
var admin = {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'admin@example.com',
    phone: null,
    role: 'ADMIN',
    roles: ['ADMIN'],
    fullName: 'Admin One',
    isEmailVerified: true,
    isMobileVerified: false,
};
describe('Role authorization (e2e)', function () {
    var app;
    var currentUser = null;
    beforeAll(function () { return __awaiter(void 0, void 0, void 0, function () {
        var moduleRef;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, testing_1.Test.createTestingModule({ imports: [app_module_1.AppModule] })
                        .overrideProvider(supabase_token_service_1.SupabaseTokenService)
                        .useValue({
                        verifyAccessToken: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ({ sub: 'stub', role: 'authenticated' })];
                        }); }); },
                        buildPrincipal: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                if (!currentUser) {
                                    throw new Error('No principal configured for this test.');
                                }
                                return [2 /*return*/, currentUser];
                            });
                        }); },
                    })
                        .compile()];
                case 1:
                    moduleRef = _a.sent();
                    app = moduleRef.createNestApplication();
                    app.setGlobalPrefix('api/v1');
                    app.useGlobalPipes((0, test_utils_1.buildValidationPipe)());
                    return [4 /*yield*/, app.init()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    afterAll(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (app === null || app === void 0 ? void 0 : app.close())];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    var asUser = function (user) {
        currentUser = user;
    };
    var server = function () { return (0, supertest_1.default)(app.getHttpServer()); };
    describe('protected routes require a token', function () {
        it.each([
            '/api/v1/users/me',
            '/api/v1/providers/me',
            '/api/v1/customer/homes',
            '/api/v1/admin/providers/pending',
            '/api/v1/notifications',
        ])('GET %s returns 401 without a Bearer token', function (path) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, server().get(path).expect(401)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('role restrictions', function () {
        it('401s when no principal can be resolved', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        asUser(null);
                        return [4 /*yield*/, server().get('/api/v1/customer/homes').set('Authorization', 'Bearer stub').expect(401)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('returns 403 when a customer hits an admin-only route', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        asUser(customer);
                        return [4 /*yield*/, server()
                                .get('/api/v1/admin/providers/pending')
                                .set('Authorization', 'Bearer stub')
                                .expect(403)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('returns 403 when a provider hits an admin-only route', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        asUser(professional);
                        return [4 /*yield*/, server()
                                .get('/api/v1/admin/providers/pending')
                                .set('Authorization', 'Bearer stub')
                                .expect(403)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('returns 403 when an admin hits a customer-only route', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        asUser(admin);
                        return [4 /*yield*/, server().get('/api/v1/customer/homes').set('Authorization', 'Bearer stub').expect(403)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('returns 403 when an admin hits a provider-only route', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        asUser(admin);
                        return [4 /*yield*/, server()
                                .get('/api/v1/providers/verification-status')
                                .set('Authorization', 'Bearer stub')
                                .expect(403)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('returns 403 when a provider hits a customer-only route', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        asUser(professional);
                        return [4 /*yield*/, server().get('/api/v1/customer/homes').set('Authorization', 'Bearer stub').expect(403)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('validation before side effects', function () {
        it('rejects a provider document upload with an unsupported document type', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        asUser(professional);
                        return [4 /*yield*/, server()
                                .post('/api/v1/providers/documents')
                                .set('Authorization', 'Bearer stub')
                                .field('documentType', 'WORK_PHOTO')
                                .expect(400)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('rejects a home address with only a latitude', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        asUser(customer);
                        return [4 /*yield*/, server()
                                .post('/api/v1/customer/homes')
                                .set('Authorization', 'Bearer stub')
                                .send({ address: '12 MG Road, Bengaluru', latitude: 12.9716 })
                                .expect(400)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('rejects working hours where the end time is not after the start time', function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        asUser(professional);
                        return [4 /*yield*/, server()
                                .put('/api/v1/providers/working-hours')
                                .set('Authorization', 'Bearer stub')
                                .send({ workingHours: [{ dayOfWeek: 1, startTime: '18:00', endTime: '09:00' }] })
                                .expect(400)];
                    case 1:
                        response = _a.sent();
                        expect(JSON.stringify(response.body)).toContain('later than start time');
                        return [2 /*return*/];
                }
            });
        }); });
        it('rejects negative years of experience', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        asUser(professional);
                        return [4 /*yield*/, server()
                                .patch('/api/v1/providers/me')
                                .set('Authorization', 'Bearer stub')
                                .send({ yearsOfExperience: -1 })
                                .expect(400)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('rejects an admin rejection without a reason', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        asUser(admin);
                        return [4 /*yield*/, server()
                                .patch('/api/v1/admin/providers/33333333-3333-4333-8333-333333333333/reject')
                                .set('Authorization', 'Bearer stub')
                                .send({})
                                .expect(400)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
