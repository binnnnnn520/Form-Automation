import cors from '@fastify/cors';
import Fastify from 'fastify';
import { z } from 'zod';
import { ModelConfigSchema, ProfileSchema } from '../shared/schemas';
import { testModelConnection } from './model/modelAdapter';
import { JsonStore } from './storage/jsonStore';
import { createQuestionnaireTask } from './tasks/taskRunner';

export interface BuildAppOptions {
  dataDir?: string;
}

const CreateTaskSchema = z.object({
  url: z.string().url()
});

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({ logger: false });
  const store = new JsonStore(options.dataDir);

  app.register(cors, { origin: true });

  app.get('/api/health', async () => ({ ok: true }));

  app.get('/api/profile', async () => store.readProfile());

  app.put('/api/profile', async (request, reply) => {
    const profile = ProfileSchema.parse(request.body);
    const saved = await store.writeProfile(profile);
    return reply.send(saved);
  });

  app.get('/api/model-config', async () => store.readModelConfig());

  app.put('/api/model-config', async (request, reply) => {
    const config = ModelConfigSchema.parse(request.body);
    const saved = await store.writeModelConfig(config);
    return reply.send(saved);
  });

  app.post('/api/model-config/test', async (request) => {
    const config = ModelConfigSchema.parse(request.body);
    return testModelConnection(config);
  });

  app.post('/api/tasks', async (request, reply) => {
    const input = CreateTaskSchema.parse(request.body);
    const task = createQuestionnaireTask(input.url);
    return reply.code(201).send(task);
  });

  return app;
}
