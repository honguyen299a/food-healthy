-- Values are per 100g: fiber/sugars in g, sodium in mg. NULL is unknown, 0 is a known zero.
ALTER TABLE `foods`
  ADD COLUMN `fiber` DECIMAL(16,8) NULL,
  ADD COLUMN `sugars` DECIMAL(16,8) NULL,
  ADD COLUMN `sodium` DECIMAL(16,8) NULL;

-- Copy existing JSON values before removing the old storage column.
UPDATE `foods`
SET `fiber` = CASE WHEN JSON_TYPE(JSON_EXTRACT(`nutrients`, '$.fiber')) IN ('INTEGER', 'DOUBLE', 'DECIMAL') THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(`nutrients`, '$.fiber')) AS DECIMAL(16,8)) ELSE NULL END,
    `sugars` = CASE WHEN JSON_TYPE(JSON_EXTRACT(`nutrients`, '$.sugars')) IN ('INTEGER', 'DOUBLE', 'DECIMAL') THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(`nutrients`, '$.sugars')) AS DECIMAL(16,8)) ELSE NULL END,
    `sodium` = CASE WHEN JSON_TYPE(JSON_EXTRACT(`nutrients`, '$.sodium')) IN ('INTEGER', 'DOUBLE', 'DECIMAL') THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(`nutrients`, '$.sodium')) AS DECIMAL(16,8)) ELSE NULL END;

ALTER TABLE `foods` DROP COLUMN `nutrients`;
