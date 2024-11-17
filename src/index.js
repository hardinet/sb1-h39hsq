import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { JobBot } from './jobBot.js';
import { setupScheduler } from './scheduler.js';
import { logger } from './utils/logger.js';

dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

const jobBot = new JobBot();

// Validation middleware
const validateInput = [
  body('cvPath').notEmpty().isString(),
  body('jobTitle').notEmpty().isString(),
  body('credentials').isObject(),
  body('credentials.indeed').isObject(),
  body('credentials.linkedin').isObject()
];

app.post('/start', validateInput, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { cvPath, jobTitle, credentials } = req.body;
  
  try {
    await jobBot.initialize(cvPath, jobTitle);
    await jobBot.setupCredentials(credentials);
    setupScheduler(jobBot);
    res.json({ message: 'Bot started successfully' });
  } catch (error) {
    logger.error('Failed to start bot:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/stop', async (req, res) => {
  try {
    await jobBot.close();
    res.json({ message: 'Bot stopped successfully' });
  } catch (error) {
    logger.error('Failed to stop bot:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});