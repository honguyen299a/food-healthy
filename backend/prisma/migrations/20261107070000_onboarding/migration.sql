ALTER TABLE `users`
  ADD COLUMN `onboarding_completed` BOOLEAN NOT NULL DEFAULT false;

-- The onboarding wizard is only for registrations after this migration.
UPDATE `users` SET `onboarding_completed` = true;
