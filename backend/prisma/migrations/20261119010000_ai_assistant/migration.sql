-- CreateTable
CREATE TABLE `ai_conversations` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `busy` BOOLEAN NOT NULL DEFAULT false,
    `busy_until` DATETIME(3) NULL,
    `draft_version` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_conversations_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conversation_id` VARCHAR(36) NOT NULL,
    `role` VARCHAR(16) NOT NULL,
    `content` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_messages_conversation_id_id_idx`(`conversation_id`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_drafts` (
    `id` VARCHAR(36) NOT NULL,
    `conversation_id` VARCHAR(36) NOT NULL,
    `version` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `items` JSON NOT NULL,
    `plan_hash` VARCHAR(64) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_drafts_conversation_id_created_at_idx`(`conversation_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shopping_lists` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `draft_id` VARCHAR(36) NOT NULL,
    `date` DATE NOT NULL,
    `items` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `shopping_lists_draft_id_key`(`draft_id`),
    INDEX `shopping_lists_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_conversations` ADD CONSTRAINT `ai_conversations_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_messages` ADD CONSTRAINT `ai_messages_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_drafts` ADD CONSTRAINT `ai_drafts_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shopping_lists` ADD CONSTRAINT `shopping_lists_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shopping_lists` ADD CONSTRAINT `shopping_lists_draft_id_fkey` FOREIGN KEY (`draft_id`) REFERENCES `ai_drafts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
