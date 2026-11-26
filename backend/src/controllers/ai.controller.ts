import { UserOnly } from '../auth';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import {
  Equals,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { AiService } from "../services/ai.service";
class ChatDto {
  @IsString() @MinLength(1) @MaxLength(2000) message: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date: string;
  @IsIn(["ADVICE", "PROPOSAL", "ACTION"]) mode:
    "ADVICE" | "PROPOSAL" | "ACTION";
  @IsOptional() @IsIn(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]) meal?: string;
}
class ConfirmDto {
  @Equals(true, { message: "Cần xác nhận rõ ràng trước khi lưu." })
  confirmed: boolean;
  @IsInt() @Min(1) version: number;
  @IsIn(["SAVE_PLAN", "SHOPPING_LIST"]) action: "SAVE_PLAN" | "SHOPPING_LIST";
}
class HistoryDto {
  @IsOptional() @Matches(/^[1-9]\d{0,9}$/) before?: string;
}
@Controller("ai")
@UserOnly()
export class AiController {
  constructor(private service: AiService) {}
  @Get("conversations") list(@Req() req: any) {
    return this.service.list(req.user.sub);
  }
  @Post("conversations") create(@Req() req: any) {
    return this.service.create(req.user.sub);
  }
  @Get("shopping-lists") shopping(@Req() req: any) {
    return this.service.shopping(req.user.sub);
  }
  @Get("conversations/:id") history(
    @Req() req: any,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: HistoryDto,
  ) {
    return this.service.history(
      req.user.sub,
      id,
      query.before ? Number(query.before) : undefined,
    );
  }
  @Post("conversations/:id/messages") chat(
    @Req() req: any,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: ChatDto,
  ) {
    return this.service.chat(req.user.sub, id, input);
  }
  @Post("conversations/:id/drafts/:draftId/confirm") confirm(
    @Req() req: any,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("draftId", ParseUUIDPipe) draftId: string,
    @Body() input: ConfirmDto,
  ) {
    return this.service.confirm(
      req.user.sub,
      id,
      draftId,
      input.version,
      input.action,
    );
  }
}
