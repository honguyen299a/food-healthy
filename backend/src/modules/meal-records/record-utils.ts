import { validDate } from '../../common/utils/date';
import { aggregateNutrition } from '../monitoring/monitoring-analysis';

export const day = validDate;

export const totals = (items: any[]) => aggregateNutrition(items);
