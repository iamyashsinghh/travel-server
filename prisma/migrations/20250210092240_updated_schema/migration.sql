-- CreateTable
CREATE TABLE `otps` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER UNSIGNED NOT NULL,
    `code` VARCHAR(10) NOT NULL,
    `expires_at` DATETIME(0) NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `username` VARCHAR(25) NULL,
    `map_type` VARCHAR(191) NULL,
    `email` VARCHAR(150) NULL,
    `mobile` VARCHAR(14) NOT NULL,
    `ride_otp` INTEGER NULL,
    `gender` VARCHAR(191) NULL,
    `profile_picture` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `email_confirmed` BOOLEAN NOT NULL DEFAULT false,
    `mobile_confirmed` BOOLEAN NOT NULL DEFAULT false,
    `fcm_token` VARCHAR(191) NULL,
    `expo_token` VARCHAR(191) NULL,
    `refferal_code` VARCHAR(191) NULL,
    `referred_by` INTEGER UNSIGNED NULL,
    `current_lat` DOUBLE NULL,
    `current_lng` DOUBLE NULL,
    `rating_total` DOUBLE NOT NULL DEFAULT 0.00,
    `no_of_ratings` INTEGER NOT NULL DEFAULT 0,
    `login_by` ENUM('android', 'ios') NULL,
    `last_known_ip` VARCHAR(45) NULL,
    `last_login_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deleted_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `users_username_unique`(`username`),
    UNIQUE INDEX `users_email_unique`(`email`),
    UNIQUE INDEX `users_mobile_unique`(`mobile`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `permission` ADD CONSTRAINT `permission_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
