ALTER TABLE `food_categories`
  ADD COLUMN `code` VARCHAR(40) NULL,
  ADD COLUMN `sort_order` INT NOT NULL DEFAULT 100,
  ADD UNIQUE INDEX `food_categories_code_key` (`code`);
ALTER TABLE `foods`
  ADD COLUMN `can_suggest` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `subgroup` VARCHAR(100) NULL,
  ADD COLUMN `aliases` JSON NULL;
