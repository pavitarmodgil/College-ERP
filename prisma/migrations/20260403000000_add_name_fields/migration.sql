-- Add first and last name fields to User table
ALTER TABLE `User`
  ADD COLUMN `firstName` VARCHAR(191) NULL,
  ADD COLUMN `lastName`  VARCHAR(191) NULL;
