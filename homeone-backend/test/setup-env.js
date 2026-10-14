"use strict";
var _a, _b, _c, _d, _e, _f;
var _g, _h, _j, _k;
process.env.NODE_ENV = (_a = process.env.NODE_ENV) !== null && _a !== void 0 ? _a : 'test';
process.env.PORT = (_b = process.env.PORT) !== null && _b !== void 0 ? _b : '8081';
// Placeholder credentials let the DI graph build without a real project. No test
// in this suite performs a network call against Supabase.
(_c = (_g = process.env).SUPABASE_URL) !== null && _c !== void 0 ? _c : (_g.SUPABASE_URL = 'https://placeholder-project.supabase.co');
(_d = (_h = process.env).SUPABASE_PUBLISHABLE_KEY) !== null && _d !== void 0 ? _d : (_h.SUPABASE_PUBLISHABLE_KEY = 'placeholder-publishable-key');
(_e = (_j = process.env).SUPABASE_SERVICE_ROLE_KEY) !== null && _e !== void 0 ? _e : (_j.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-role-key');
(_f = (_k = process.env).CORS_ORIGINS) !== null && _f !== void 0 ? _f : (_k.CORS_ORIGINS = 'http://localhost:8081');
