import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health';

const app = express();

app.use(cors());
app.use(express.json());

app.use('{{API_PREFIX}}', healthRouter);

export default app;
