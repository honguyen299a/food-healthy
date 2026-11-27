import { AlertSeverity, NotificationType } from '@prisma/client';
import { IsBoolean, IsEnum, IsIn, IsOptional } from 'class-validator';
import { PageDto } from '../../../common/dto/pagination.dto';

export class NotificationQueryDto extends PageDto {
  @IsOptional() @IsEnum(AlertSeverity) severity?: AlertSeverity;
  @IsOptional() @IsEnum(NotificationType) type?: NotificationType;
  @IsOptional() @IsIn(['ALL', 'UNREAD', 'READ']) read?: string;
}

export class ReadDto {
  @IsBoolean() read: boolean;
}
