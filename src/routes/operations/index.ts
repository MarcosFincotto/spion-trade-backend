import { Router } from 'express';

import authenticate from './authenticate';
import operation from './operate';
import trader from './account-trader';

const operations = Router();

operations.use(authenticate, operation, trader);

export default operations;
