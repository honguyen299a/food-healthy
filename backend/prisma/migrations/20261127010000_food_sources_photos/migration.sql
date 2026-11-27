ALTER TABLE `foods`
  ADD COLUMN `nutrition_source` VARCHAR(150) NULL,
  ADD COLUMN `nutrition_source_url` VARCHAR(500) NULL,
  ADD COLUMN `food_description` VARCHAR(500) NULL,
  ADD COLUMN `nutrition_edited` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `image_url` VARCHAR(500) NULL,
  ADD COLUMN `image_source_url` VARCHAR(500) NULL,
  ADD COLUMN `image_credit` VARCHAR(500) NULL,
  ADD COLUMN `image_license` VARCHAR(100) NULL,
  ADD COLUMN `image_license_url` VARCHAR(500) NULL;
