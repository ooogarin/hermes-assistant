import { Hono } from 'hono';
import { appValidator } from '../../../core/http/validator';
import { requireAgent } from '../../../core/middleware/auth';
import * as writingSubmissionHandler from './writing-submission.handler';
import {
  createSubmissionSchema,
  listSubmissionsSchema,
  saveAnalysisSchema,
  submissionParamsSchema,
  updateSubmissionSchema,
} from './writing-submission.validator';
import type { AppEnv } from '../../../core/http/app-env';

export const createWritingSubmissionRoutes = () => {
  const route = new Hono<AppEnv>();

  route.post('/', appValidator('json', createSubmissionSchema), writingSubmissionHandler.createSubmission);
  route.get('/', appValidator('query', listSubmissionsSchema), writingSubmissionHandler.listSubmissions);
  route.get('/:code', appValidator('param', submissionParamsSchema), writingSubmissionHandler.getSubmission);
  route.patch(
    '/:code',
    appValidator('param', submissionParamsSchema),
    appValidator('json', updateSubmissionSchema),
    writingSubmissionHandler.updateSubmission,
  );
  route.patch(
    '/:code/analysis',
    requireAgent,
    appValidator('param', submissionParamsSchema),
    appValidator('json', saveAnalysisSchema),
    writingSubmissionHandler.saveAnalysis,
  );
  route.get(
    '/:code/corrected-text',
    appValidator('param', submissionParamsSchema),
    writingSubmissionHandler.getCorrectedText,
  );

  return route;
};
