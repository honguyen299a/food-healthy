-- AlterTable
ALTER TABLE `food_logs` ADD COLUMN `completed` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `monitoring_settings` (
    `user_id` INTEGER NOT NULL,
    `fiber_min` DECIMAL(12, 4) NULL,
    `sugars_max` DECIMAL(12, 4) NULL,
    `sodium_max` DECIMAL(12, 4) NULL,
    `weight_change_percent` DECIMAL(8, 4) NULL,
    `weight_window_days` INTEGER NOT NULL DEFAULT 14,
    `target_tolerance_percent` INTEGER NOT NULL DEFAULT 10,
    `limit_source` VARCHAR(500) NULL,
    `reminders` BOOLEAN NOT NULL DEFAULT true,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monitoring_jobs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `scope` VARCHAR(32) NOT NULL DEFAULT 'CURRENT',
    `revision` INTEGER NOT NULL DEFAULT 1,
    `processed_revision` INTEGER NOT NULL DEFAULT 0,
    `run_after` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lock_token` VARCHAR(36) NULL,
    `locked_until` DATETIME(3) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `last_error` VARCHAR(300) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `monitoring_jobs_run_after_locked_until_idx`(`run_after`, `locked_until`),
    UNIQUE INDEX `monitoring_jobs_user_id_scope_key`(`user_id`, `scope`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `health_alerts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `fingerprint` VARCHAR(150) NOT NULL,
    `type` VARCHAR(60) NOT NULL,
    `source` ENUM('ACTUAL', 'PLAN', 'WEIGHT') NOT NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
    `title` VARCHAR(200) NOT NULL,
    `body` TEXT NOT NULL,
    `evidence` JSON NOT NULL,
    `admin_review` BOOLEAN NOT NULL DEFAULT false,
    `condition_active` BOOLEAN NOT NULL DEFAULT true,
    `revision` INTEGER NOT NULL DEFAULT 1,
    `detected_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_detected_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `health_alerts_user_id_status_created_at_idx`(`user_id`, `status`, `created_at`),
    INDEX `health_alerts_admin_review_severity_status_idx`(`admin_review`, `severity`, `status`),
    UNIQUE INDEX `health_alerts_user_id_fingerprint_key`(`user_id`, `fingerprint`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `health_alert_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `alert_id` INTEGER NOT NULL,
    `actor_id` INTEGER NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED') NOT NULL,
    `note` VARCHAR(1000) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `health_alert_events_alert_id_id_idx`(`alert_id`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `dedupe_key` VARCHAR(191) NOT NULL,
    `type` ENUM('HEALTH_ALERT', 'ALERT_STATUS', 'NUTRITION_INSIGHT', 'WEIGHT_REMINDER', 'LOG_REMINDER', 'GOAL_REMINDER', 'WEEKLY_REPORT') NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `body` TEXT NOT NULL,
    `target_path` VARCHAR(200) NOT NULL,
    `read_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_user_id_deleted_at_read_at_id_idx`(`user_id`, `deleted_at`, `read_at`, `id`),
    UNIQUE INDEX `notifications_user_id_dedupe_key_key`(`user_id`, `dedupe_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nutrition_insights` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `fingerprint` VARCHAR(100) NOT NULL,
    `type` VARCHAR(60) NOT NULL,
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'LOW',
    `title` VARCHAR(200) NOT NULL,
    `body` TEXT NOT NULL,
    `suggestion` TEXT NOT NULL,
    `evidence` JSON NOT NULL,
    `period_start` DATE NOT NULL,
    `period_end` DATE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `nutrition_insights_user_id_period_start_idx`(`user_id`, `period_start`),
    UNIQUE INDEX `nutrition_insights_user_id_fingerprint_key`(`user_id`, `fingerprint`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nutrition_weekly_reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `week_start` DATE NOT NULL,
    `week_end` DATE NOT NULL,
    `payload` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `nutrition_weekly_reports_user_id_week_start_idx`(`user_id`, `week_start`),
    UNIQUE INDEX `nutrition_weekly_reports_user_id_week_start_key`(`user_id`, `week_start`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monitoring_summaries` (
    `user_id` INTEGER NOT NULL,
    `payload` JSON NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `monitoring_settings` ADD CONSTRAINT `monitoring_settings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monitoring_jobs` ADD CONSTRAINT `monitoring_jobs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `health_alerts` ADD CONSTRAINT `health_alerts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `health_alert_events` ADD CONSTRAINT `health_alert_events_alert_id_fkey` FOREIGN KEY (`alert_id`) REFERENCES `health_alerts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `health_alert_events` ADD CONSTRAINT `health_alert_events_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nutrition_insights` ADD CONSTRAINT `nutrition_insights_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nutrition_weekly_reports` ADD CONSTRAINT `nutrition_weekly_reports_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monitoring_summaries` ADD CONSTRAINT `monitoring_summaries_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
