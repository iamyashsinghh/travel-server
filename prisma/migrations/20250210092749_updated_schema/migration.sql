-- AddForeignKey
ALTER TABLE `permission` ADD CONSTRAINT `permission_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
