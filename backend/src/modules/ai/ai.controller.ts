import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { UserOnly } from '../../common/decorators/access.decorators';
import { AiService } from './ai.service';
import { ChatDto, ConfirmDto, HistoryDto } from './dto/ai.dto';

@Controller('ai')
@UserOnly()
export class AiController {
  constructor(private service: AiService) {}
  @Get('conversations') list(@Req() req: any) {
    return this.service.list(req.user.sub);
  }
  @Post('conversations') create(@Req() req: any) {
    return this.service.create(req.user.sub);
  }
  @Get('shopping-lists') shopping(@Req() req: any) {
    return this.service.shopping(req.user.sub);
  }
  @Get('conversations/:id') history(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: HistoryDto,
  ) {
    return this.service.history(req.user.sub, id, query.before ? Number(query.before) : undefined);
  }
  @Post('conversations/:id/messages') chat(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ChatDto,
  ) {
    return this.service.chat(req.user.sub, id, input);
  }
  @Post('conversations/:id/drafts/:draftId/confirm') confirm(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @Body() input: ConfirmDto,
  ) {
    return this.service.confirm(req.user.sub, id, draftId, input.version, input.action);
  }
}
