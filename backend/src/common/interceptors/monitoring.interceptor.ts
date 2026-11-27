import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { mergeMap } from 'rxjs';
import { MonitoringJobsService } from '../../modules/monitoring/monitoring-jobs.service';
@Injectable()
export class MonitoringInterceptor implements NestInterceptor {
  private logger = new Logger(MonitoringInterceptor.name);
  constructor(private jobs: MonitoringJobsService) {}
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    if (
      !['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) ||
      !req.user?.sub ||
      !/^\/api\/(logs|weights|plans|profile|foods|ai\/conversations\/[^/]+\/drafts\/[^/]+\/confirm)(\/|$)/.test(
        req.path,
      )
    )
      return next.handle();
    return next.handle().pipe(
      mergeMap(async (result) => {
        // The primary mutation has already completed. Only a small durable job write is awaited.
        // A failed enqueue must not misreport a successful food/weight write; the periodic sweep repairs it.
        try {
          const foodId = /^\/api\/foods\/(\d+)$/.exec(req.path)?.[1];
          if (foodId) await this.jobs.enqueueFoodUsers(Number(foodId));
          else if (req.user.role !== 'ADMIN') await this.jobs.enqueue(req.user.sub);
        } catch {
          this.logger.warn('Enqueue failed; periodic monitoring sweep will recover.');
        }
        return result;
      }),
    );
  }
}
