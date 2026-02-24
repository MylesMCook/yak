-- Add memory layer columns to Chat table
ALTER TABLE `Chat` ADD COLUMN `lastActivityAt` integer;
--> statement-breakpoint
ALTER TABLE `Chat` ADD COLUMN `finalizedAt` integer;
--> statement-breakpoint
ALTER TABLE `Chat` ADD COLUMN `summarizedAt` integer;
--> statement-breakpoint
ALTER TABLE `Chat` ADD COLUMN `summaryVersion` integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `Chat` ADD COLUMN `messageCount` integer DEFAULT 0;
--> statement-breakpoint

-- Memory summary (one per user, rolling)
CREATE TABLE `memory_summary` (
	`user_id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`updated_at` integer NOT NULL,
	`version` integer DEFAULT 0,
	`locked` integer DEFAULT false
);
--> statement-breakpoint

-- Distilled memory (tiered compression)
CREATE TABLE `distilled_memory` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`tier` integer NOT NULL,
	`content` text NOT NULL,
	`source_chat_ids` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint

-- Memory summary version history
CREATE TABLE `memory_summary_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`version` integer NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint

-- Agent tasks (OpenHands sidecar)
CREATE TABLE `agent_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`openhands_task_id` text,
	`input` text NOT NULL,
	`result` text,
	`error` text,
	`linked_chat_id` text
);
