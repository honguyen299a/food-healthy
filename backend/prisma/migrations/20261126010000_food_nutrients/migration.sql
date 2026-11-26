-- Optional extended nutrients per 100 g. NULL means the food has no extended data yet.
ALTER TABLE `foods` ADD COLUMN `nutrients` JSON NULL;
