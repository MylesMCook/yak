CREATE TABLE `User` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text(64) NOT NULL,
	`password` text(64)
);
--> statement-breakpoint
CREATE TABLE `Chat` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`title` text NOT NULL,
	`userId` text NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
);
--> statement-breakpoint
CREATE TABLE `Message` (
	`id` text PRIMARY KEY NOT NULL,
	`chatId` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`chatId`) REFERENCES `Chat`(`id`)
);
--> statement-breakpoint
CREATE TABLE `Message_v2` (
	`id` text PRIMARY KEY NOT NULL,
	`chatId` text NOT NULL,
	`role` text NOT NULL,
	`parts` text NOT NULL,
	`attachments` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`chatId`) REFERENCES `Chat`(`id`)
);
--> statement-breakpoint
CREATE TABLE `Vote` (
	`chatId` text NOT NULL,
	`messageId` text NOT NULL,
	`isUpvoted` integer NOT NULL,
	FOREIGN KEY (`chatId`) REFERENCES `Chat`(`id`),
	FOREIGN KEY (`messageId`) REFERENCES `Message`(`id`),
	PRIMARY KEY(`chatId`, `messageId`)
);
--> statement-breakpoint
CREATE TABLE `Vote_v2` (
	`chatId` text NOT NULL,
	`messageId` text NOT NULL,
	`isUpvoted` integer NOT NULL,
	FOREIGN KEY (`chatId`) REFERENCES `Chat`(`id`),
	FOREIGN KEY (`messageId`) REFERENCES `Message_v2`(`id`),
	PRIMARY KEY(`chatId`, `messageId`)
);
--> statement-breakpoint
CREATE TABLE `Document` (
	`id` text NOT NULL,
	`createdAt` integer NOT NULL,
	`title` text NOT NULL,
	`content` text,
	`kind` text DEFAULT 'text' NOT NULL,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`),
	PRIMARY KEY(`id`, `createdAt`)
);
--> statement-breakpoint
CREATE TABLE `Suggestion` (
	`id` text PRIMARY KEY NOT NULL,
	`documentId` text NOT NULL,
	`documentCreatedAt` integer NOT NULL,
	`originalText` text NOT NULL,
	`suggestedText` text NOT NULL,
	`description` text,
	`isResolved` integer DEFAULT 0 NOT NULL,
	`userId` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
);
--> statement-breakpoint
CREATE TABLE `Stream` (
	`id` text PRIMARY KEY NOT NULL,
	`chatId` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`chatId`) REFERENCES `Chat`(`id`)
);
