import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Query,
  Req,
} from "@nestjs/common";
import { AlertSeverity, NotificationType } from "@prisma/client";
import { IsBoolean, IsEnum, IsIn, IsOptional } from "class-validator";
import { PageDto } from "./monitoring.controller";
import { NotificationsService } from "../services/notifications.service";
class NotificationQueryDto extends PageDto {
  @IsOptional() @IsEnum(AlertSeverity) severity?: AlertSeverity;
  @IsOptional() @IsEnum(NotificationType) type?: NotificationType;
  @IsOptional() @IsIn(["ALL", "UNREAD", "READ"]) read?: string;
}
class ReadDto {
  @IsBoolean() read: boolean;
}
@Controller("notifications")
export class NotificationsController {
  constructor(private service: NotificationsService) {}
  @Get() list(@Req() req: any, @Query() q: NotificationQueryDto) {
    return this.service.list(req.user.sub, q);
  }
  @Put("read-all") all(@Req() req: any) {
    return this.service.readAll(req.user.sub);
  }
  @Put(":id/read") read(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ReadDto,
  ) {
    return this.service.read(req.user.sub, id, dto.read);
  }
  @Delete(":id") remove(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.service.remove(req.user.sub, id);
  }
}
