import { PrismaClient } from "@prisma/client";
import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";
import * as fs from "fs";
import * as path from "path";
import { perfLog, perfEnabled } from "./perfLog";

let pgliteInstance: PGlite | null = null;

type WebAssemblyModuleCtor = new (bytes: Buffer) => WebAssembly.Module;

function getWebAssemblyModuleCtor(): WebAssemblyModuleCtor | null {
    const moduleCtor = (globalThis as { WebAssembly?: { Module?: unknown } }).WebAssembly?.Module;
    return typeof moduleCtor === "function"
        ? (moduleCtor as WebAssemblyModuleCtor)
        : null;
}

function findPGliteWasm(): { wasmModule: WebAssembly.Module; fsBundle: Blob } | null {
    const wasmModuleCtor = getWebAssemblyModuleCtor();
    if (!wasmModuleCtor) {
        return null;
    }
    const searchPaths = [
        process.cwd(),
        path.dirname(process.execPath),
    ];
    for (const dir of searchPaths) {
        const wasmPath = path.join(dir, "pglite.wasm");
        const dataPath = path.join(dir, "pglite.data");
        if (fs.existsSync(wasmPath) && fs.existsSync(dataPath)) {
            const wasmModule = new wasmModuleCtor(fs.readFileSync(wasmPath));
            const fsBundle = new Blob([fs.readFileSync(dataPath)]);
            return { wasmModule, fsBundle };
        }
    }
    return null;
}

function createClient(): PrismaClient {
    const pgliteDir = process.env.PGLITE_DIR;
    if (pgliteDir) {
        const wasmOpts = findPGliteWasm();
        if (wasmOpts) {
            pgliteInstance = new PGlite({ dataDir: pgliteDir, ...wasmOpts });
        } else {
            pgliteInstance = new PGlite(pgliteDir);
        }
        const adapter = new PrismaPGlite(pgliteInstance);
        return new PrismaClient({ adapter } as any);
    }
    return new PrismaClient();
}

function withPerfMiddleware(client: PrismaClient): PrismaClient {
    if (!perfEnabled) {
        return client;
    }
    return client.$extends({
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    const start = Date.now();
                    const result = await query(args);
                    perfLog({
                        ts: Date.now(),
                        src: 'server',
                        op: 'db.query',
                        model,
                        action: operation,
                        dur_ms: Date.now() - start,
                    });
                    return result;
                },
            },
        },
    }) as unknown as PrismaClient;
}

export const db = withPerfMiddleware(createClient());

export function getPGlite(): PGlite | null {
    return pgliteInstance;
}
