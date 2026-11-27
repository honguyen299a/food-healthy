import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { Admin } from '../../common/decorators/access.decorators';
import { CategoriesService } from './categories.service';
import { CategoryDto } from './dto/foods.dto';
@Controller('categories')
export class CategoriesController {
  constructor(private service: CategoriesService) {}
  @Get() async list() {
    return this.service.list();
  }
  @Admin() @Post() create(@Body() dto: CategoryDto) {
    return this.service.create(dto);
  }
  @Admin() @Put(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: CategoryDto) {
    return this.service.update(id, dto);
  }
  @Admin() @Delete(':id') async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
