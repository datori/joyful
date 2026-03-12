import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
import { Fastify } from '../types';
import { perfLog, getPerfFilePath, type PerfEvent } from '@/storage/perfLog';

export function devRoutes(app: Fastify) {

    // Combined logging endpoint (only when explicitly enabled)
    if (process.env.DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING) {
        app.post('/logs-combined-from-cli-and-mobile-for-simple-ai-debugging', {
            schema: {
                body: z.object({
                    timestamp: z.string(),
                    level: z.string(),
                    message: z.string(),
                    messageRawObject: z.any().optional(),
                    source: z.enum(['mobile', 'cli']),
                    platform: z.string().optional()
                })
            }
        }, async (request, reply) => {
            const { timestamp, level, message, source, platform } = request.body;

            // Log ONLY to separate remote logger (file only, no console)
            const logData = {
                source,
                platform,
                timestamp
            };

            // Use the file-only logger if available
            const { fileConsolidatedLogger } = await import('@/utils/log');

            if (!fileConsolidatedLogger) {
                // Should never happen since we check env var above, but be safe
                return reply.send({ success: true });
            }

            switch (level.toLowerCase()) {
                case 'error':
                    fileConsolidatedLogger.error(logData, message);
                    break;
                case 'warn':
                case 'warning':
                    fileConsolidatedLogger.warn(logData, message);
                    break;
                case 'debug':
                    fileConsolidatedLogger.debug(logData, message);
                    break;
                default:
                    fileConsolidatedLogger.info(logData, message);
            }

            return reply.send({ success: true });
        });

        // GET /dev/perf — return last 500 perf events for agent analysis
        app.get('/dev/perf', {
            schema: { querystring: z.object({ limit: z.coerce.number().min(1).max(2000).optional() }) }
        }, async (request, reply) => {
            const limit = request.query.limit ?? 500;
            const filePath = getPerfFilePath();
            if (!existsSync(filePath)) {
                return reply.send({ events: [], total: 0 });
            }
            const content = readFileSync(filePath, 'utf-8');
            const lines = content.split('\n').filter(l => l.trim().length > 0);
            const tail = lines.slice(-limit);
            const events: PerfEvent[] = [];
            for (const line of tail) {
                try {
                    events.push(JSON.parse(line) as PerfEvent);
                } catch {
                    // Skip malformed lines
                }
            }
            return reply.send({ events, total: lines.length });
        });

        // POST /dev/perf — accept batched perf events from app/CLI
        app.post('/dev/perf', {
            schema: {
                body: z.object({
                    events: z.array(z.object({
                        ts: z.number(),
                        src: z.enum(['server', 'app', 'cli']),
                        op: z.string(),
                        dur_ms: z.number().optional(),
                    }).passthrough())
                })
            }
        }, async (request, reply) => {
            for (const event of request.body.events) {
                perfLog(event as PerfEvent);
            }
            return reply.send({ success: true });
        });
    }
}