import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { UserOnly } from '../../common/decorators/access.decorators';
import { FoodSearchDto } from './dto/food-search.dto';
import { FoodDto } from './dto/foods.dto';
import { FoodsService } from './foods.service';
@Controller('foods')
export class FoodsController {
  constructor(private service: FoodsService) {}
  @Get() list(@Req() req: any, @Query() query: FoodSearchDto) {
    return this.service.list(req, query);
  }
  @Get('catalog') catalog() {
    return this.service.catalog();
  }
  @Get(':id') get(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.get(req, id);
  }
  @Post() async create(@Req() req: any, @Body() dto: FoodDto) {
    return this.service.create(req, dto);
  }
  @UserOnly() @Post(':id/customize') async customize(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FoodDto,
  ) {
    return this.service.customize(req, id, dto);
  }
  @Put(':id') async update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FoodDto,
  ) {
    return this.service.update(req, id, dto);
  }
  @Delete(':id') async remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(req, id);
  }
}
