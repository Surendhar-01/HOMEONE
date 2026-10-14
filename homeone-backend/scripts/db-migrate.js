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
/**
 * Applies the SQL files in `supabase/migrations` and then `supabase/seed.sql`
 * to the project named by DATABASE_URL.
 *
 *   npm run db:migrate
 *
 * The Supabase CLI is the usual path (`supabase db push`); this script exists so
 * the schema can also be applied from a machine that only has Node installed.
 */
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var dotenv_1 = require("dotenv");
var pg_1 = require("pg");
(0, dotenv_1.config)({ path: (0, node_path_1.join)(__dirname, '..', '.env') });
var MIGRATIONS_DIR = (0, node_path_1.join)(__dirname, '..', 'supabase', 'migrations');
var SEED_FILE = (0, node_path_1.join)(__dirname, '..', 'supabase', 'seed.sql');
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var connectionString, client, files, _i, files_1, file;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    connectionString = process.env.DATABASE_URL;
                    if (!connectionString) {
                        throw new Error('DATABASE_URL is not set. Add it to .env before running migrations.');
                    }
                    client = new pg_1.Client({ connectionString: connectionString, ssl: { rejectUnauthorized: false } });
                    return [4 /*yield*/, client.connect()];
                case 1:
                    _a.sent();
                    console.log('Connected.');
                    files = (0, node_fs_1.readdirSync)(MIGRATIONS_DIR)
                        .filter(function (file) { return file.endsWith('.sql'); })
                        .sort();
                    _i = 0, files_1 = files;
                    _a.label = 2;
                case 2:
                    if (!(_i < files_1.length)) return [3 /*break*/, 5];
                    file = files_1[_i];
                    console.log("Applying ".concat(file, "..."));
                    return [4 /*yield*/, client.query((0, node_fs_1.readFileSync)((0, node_path_1.join)(MIGRATIONS_DIR, file), 'utf8'))];
                case 3:
                    _a.sent();
                    console.log("  ok ".concat(file));
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    console.log('Applying seed.sql...');
                    return [4 /*yield*/, client.query((0, node_fs_1.readFileSync)(SEED_FILE, 'utf8'))];
                case 6:
                    _a.sent();
                    console.log('  ok seed.sql');
                    return [4 /*yield*/, client.end()];
                case 7:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (error) {
    console.error('Migration failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
