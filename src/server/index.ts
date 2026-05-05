import { buildApp } from './app';

const app = buildApp({ dataDir: '.data' });
const port = Number(process.env.PORT || 8787);

app.listen({ host: '127.0.0.1', port }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
