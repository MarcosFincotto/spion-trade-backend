import express from 'express';

const app = express();

import cors from 'cors';
import bodyParser from 'body-parser';

app.use(cors(), bodyParser.json());

import operations from './routes/operations';

app.use(operations);

const PORT = process.env.PORT || 6969;
app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running on port ${PORT}.`);
});
