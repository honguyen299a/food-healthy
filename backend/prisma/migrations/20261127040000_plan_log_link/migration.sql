ALTER TABLE `meal_plan_items`
  ADD COLUMN `status` ENUM('PENDING','COMPLETED','SKIPPED') NOT NULL DEFAULT 'PENDING',
  ADD COLUMN `revision` INT NOT NULL DEFAULT 0;
ALTER TABLE `food_log_items`
  ADD COLUMN `plan_item_id` INT NULL,
  ADD COLUMN `from_plan` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `food_name` VARCHAR(150) NULL,
  ADD COLUMN `calories_per_100g` DECIMAL(16,8) NULL,
  ADD COLUMN `protein_per_100g` DECIMAL(16,8) NULL,
  ADD COLUMN `carbs_per_100g` DECIMAL(16,8) NULL,
  ADD COLUMN `fat_per_100g` DECIMAL(16,8) NULL,
  ADD COLUMN `fiber_per_100g` DECIMAL(16,8) NULL,
  ADD COLUMN `sugars_per_100g` DECIMAL(16,8) NULL,
  ADD COLUMN `sodium_per_100g` DECIMAL(16,8) NULL,
  ADD UNIQUE INDEX `food_log_items_plan_item_id_key` (`plan_item_id`),
  ADD CONSTRAINT `food_log_items_plan_item_id_fkey` FOREIGN KEY (`plan_item_id`)
    REFERENCES `meal_plan_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
-- Preserve current historical totals. Legacy independent logs are not guessed
-- to belong to a plan merely because food/grams happen to match.
UPDATE `food_log_items` AS li JOIN `foods` AS f ON f.id = li.food_id
SET li.food_name = f.name, li.calories_per_100g = f.calories,
    li.protein_per_100g = f.protein, li.carbs_per_100g = f.carbs,
    li.fat_per_100g = f.fat, li.fiber_per_100g = f.fiber,
    li.sugars_per_100g = f.sugars, li.sodium_per_100g = f.sodium;
