import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { FoodsController } from './foods.controller';
import { FoodsService } from './foods.service';
@Module({
  imports: [],
  controllers: [FoodsController, CategoriesController],
  providers: [FoodsService, CategoriesService],
  exports: [FoodsService],
})
export class FoodsModule {}
