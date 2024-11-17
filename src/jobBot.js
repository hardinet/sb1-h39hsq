import puppeteer from 'puppeteer';
import { parsePDF } from './utils/pdfParser.js';
import { logger } from './utils/logger.js';

export class JobBot {
  constructor() {
    this.browser = null;
    this.cv = null;
    this.jobTitle = null;
    this.credentials = null;
    this.appliedJobs = new Set();
  }

  async initialize(cvPath, jobTitle) {
    try {
      this.cv = await parsePDF(cvPath);
      this.jobTitle = jobTitle;
      this.browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      logger.info('Bot initialized successfully');
    } catch (error) {
      logger.error('Initialization failed:', error);
      throw error;
    }
  }

  setupCredentials(credentials) {
    this.credentials = credentials;
  }

  async loginToIndeed() {
    try {
      const page = await this.browser.newPage();
      await page.goto('https://secure.indeed.com/auth');
      
      await page.type('#ifl-InputFormField-3', this.credentials.indeed.email);
      await page.type('#ifl-InputFormField-7', this.credentials.indeed.password);
      await page.click('[type="submit"]');
      
      await page.waitForNavigation();
      logger.info('Successfully logged into Indeed');
    } catch (error) {
      logger.error('Indeed login failed:', error);
      throw error;
    }
  }

  async loginToLinkedIn() {
    try {
      const page = await this.browser.newPage();
      await page.goto('https://www.linkedin.com/login');
      
      await page.type('#username', this.credentials.linkedin.email);
      await page.type('#password', this.credentials.linkedin.password);
      await page.click('[type="submit"]');
      
      await page.waitForNavigation();
      logger.info('Successfully logged into LinkedIn');
    } catch (error) {
      logger.error('LinkedIn login failed:', error);
      throw error;
    }
  }

  async searchAndApply() {
    try {
      await this.loginToIndeed();
      await this.loginToLinkedIn();
      
      await Promise.all([
        this.searchIndeedJobs(),
        this.searchLinkedInJobs()
      ]);
      
      logger.info('Completed job application cycle');
    } catch (error) {
      logger.error('Error during job search:', error);
      throw error;
    }
  }

  async searchIndeedJobs() {
    const page = await this.browser.newPage();
    try {
      await page.goto(`https://www.indeed.com/jobs?q=${encodeURIComponent(this.jobTitle)}&l=`);
      
      const jobs = await page.$$('.job_seen_beacon');
      
      for (const job of jobs) {
        const jobId = await job.evaluate(el => el.dataset.jk);
        
        if (!this.appliedJobs.has(jobId)) {
          await this.applyToIndeedJob(job, page);
          this.appliedJobs.add(jobId);
        }
      }
    } catch (error) {
      logger.error('Indeed job search failed:', error);
    } finally {
      await page.close();
    }
  }

  async searchLinkedInJobs() {
    const page = await this.browser.newPage();
    try {
      await page.goto(`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(this.jobTitle)}`);
      
      const jobs = await page.$$('.jobs-search-results__list-item');
      
      for (const job of jobs) {
        const jobId = await job.evaluate(el => el.dataset.jobId);
        
        if (!this.appliedJobs.has(jobId)) {
          await this.applyToLinkedInJob(job, page);
          this.appliedJobs.add(jobId);
        }
      }
    } catch (error) {
      logger.error('LinkedIn job search failed:', error);
    } finally {
      await page.close();
    }
  }

  async applyToIndeedJob(jobElement, page) {
    try {
      await jobElement.click();
      await page.waitForSelector('.indeed-apply-button');
      await page.click('.indeed-apply-button');
      // Handle application form filling logic here
      logger.info('Applied to Indeed job successfully');
    } catch (error) {
      logger.error('Failed to apply to Indeed job:', error);
    }
  }

  async applyToLinkedInJob(jobElement, page) {
    try {
      await jobElement.click();
      await page.waitForSelector('.jobs-apply-button');
      await page.click('.jobs-apply-button');
      // Handle application form filling logic here
      logger.info('Applied to LinkedIn job successfully');
    } catch (error) {
      logger.error('Failed to apply to LinkedIn job:', error);
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Bot closed successfully');
    }
  }
}