-- Add two independent usage modes without replacing existing user data.
ALTER TABLE `users`
  ADD COLUMN `usage_mode` ENUM('SELF_GUIDED', 'PERSONALIZED') NOT NULL DEFAULT 'SELF_GUIDED';

-- Existing users with a completed profile keep their personalized experience.
UPDATE `users` u
SET u.`usage_mode` = 'PERSONALIZED'
WHERE EXISTS (SELECT 1 FROM `user_profiles` p WHERE p.`user_id` = u.`id`);

ALTER TABLE `user_profiles`
  ADD COLUMN `health_conditions` JSON NULL,
  ADD COLUMN `allergies` JSON NULL,
  ADD COLUMN `dietary_preferences` JSON NULL,
  ADD COLUMN `budget_per_day` DECIMAL(10, 2) NULL,
  ADD COLUMN `meals_per_day` INTEGER NOT NULL DEFAULT 3;

CREATE TABLE `manual_nutrition_targets` (
  `user_id` INTEGER NOT NULL,
  `calories` INTEGER NOT NULL,
  `protein` INTEGER NOT NULL,
  `carbs` INTEGER NOT NULL,
  `fat` INTEGER NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `foods`
  ADD COLUMN `owner_id` INTEGER NULL,
  ADD COLUMN `estimated_cost` DECIMAL(10, 2) NULL,
  ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX `foods_owner_id_idx` ON `foods`(`owner_id`);

ALTER TABLE `manual_nutrition_targets`
  ADD CONSTRAINT `manual_nutrition_targets_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `foods`
  ADD CONSTRAINT `foods_owner_id_fkey`
  FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
