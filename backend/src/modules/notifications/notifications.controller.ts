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
} from '@nestjs/common';
import { NotificationQueryDto, ReadDto } from './dto/notifications.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}
  @Get() list(@Req() req: any, @Query() q: NotificationQueryDto) {
    return this.service.list(req.user.sub, q);
  }
  @Put('read-all') all(@Req() req: any) {
    return this.service.readAll(req.user.sub);
  }
  @Put(':id/read') read(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReadDto,
  ) {
    return this.service.read(req.user.sub, id, dto.read);
  }
  @Delete(':id') remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(req.user.sub, id);
  }
}
