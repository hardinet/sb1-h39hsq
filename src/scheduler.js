import schedule from 'node-schedule';
import { logger } from './utils/logger.js';

export function setupScheduler(jobBot) {
  // Run job search every 6 hours
  const job = schedule.scheduleJob('0 */6 * * *', async () => {
    try {
      logger.info('Starting scheduled job search');
      await jobBot.searchAndApply();
      logger.info('Scheduled job search completed');
    } catch (error) {
      logger.error('Scheduled job search failed:', error);
    }
  });

  // Add error handling for the scheduler
  job.on('error', (error) => {
    logger.error('Scheduler error:', error);
  });

  return job;
}