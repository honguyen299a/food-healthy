-- Keep existing food IDs and references. Users may use the same name as the
-- shared catalog or another user, while names stay unique within each library.
ALTER TABLE `foods`
  ADD COLUMN `owner_scope` INT GENERATED ALWAYS AS (COALESCE(`owner_id`, 0)) VIRTUAL,
  ADD UNIQUE INDEX `foods_owner_scope_name_key` (`owner_scope`, `name`);
DROP INDEX `foods_name_key` ON `foods`;
