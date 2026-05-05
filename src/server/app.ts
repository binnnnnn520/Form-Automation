import cors from '@fastify/cors';
import Fastify from 'fastify';
import { z } from 'zod';
import { ModelConfigSchema, ProfileSchema } from '../shared/schemas';
import { QuestionnaireTask } from '../shared/types';
import { testModelConnection } from './model/modelAdapter';
import { JsonStore } from './storage/jsonStore';
import { executeQuestionnaireTask, ExecuteQuestionnaireTaskInput } from './tasks/taskRunner';

export interface BuildAppOptions {
  dataDir?: string;
  runTask?: (input: ExecuteQuestionnaireTaskInput) => Promise<QuestionnaireTask>;
}

const CreateTaskSchema = z.object({
  url: z.string().url()
});

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({ logger: false });
  const store = new JsonStore(options.dataDir);
  const runTask = options.runTask || executeQuestionnaireTask;

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
    const [profile, modelConfig] = await Promise.all([
      store.readProfile(),
      store.readModelConfig()
    ]);
    const task = await runTask({ url: input.url, profile, modelConfig });
    return reply.code(201).send(task);
  });

  return app;
}
