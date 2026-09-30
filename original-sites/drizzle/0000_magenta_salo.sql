CREATE TABLE `lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seq` integer NOT NULL,
	`code` text NOT NULL,
	`quantity` real NOT NULL,
	`price` real NOT NULL,
	`delta` real NOT NULL,
	`value` real NOT NULL,
	FOREIGN KEY (`seq`) REFERENCES `operations`(`seq`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`code`) REFERENCES `products`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_lines_code` ON `lines` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lines_operation_code` ON `lines` (`seq`,`code`);--> statement-breakpoint
CREATE TABLE `members` (
	`email` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`role` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `openings` (
	`code` text PRIMARY KEY NOT NULL,
	`seq` integer NOT NULL,
	FOREIGN KEY (`code`) REFERENCES `products`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`seq`) REFERENCES `operations`(`seq`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `operations` (
	`seq` integer PRIMARY KEY NOT NULL,
	`id` text NOT NULL,
	`folio` text NOT NULL,
	`type` text NOT NULL,
	`date` text NOT NULL,
	`destination` text NOT NULL,
	`reference` text NOT NULL,
	`supplier` text NOT NULL,
	`notes` text NOT NULL,
	`actor` text NOT NULL,
	`actor_id` text NOT NULL,
	`timestamp` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `operations_id_unique` ON `operations` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `operations_folio_unique` ON `operations` (`folio`);--> statement-breakpoint
CREATE INDEX `idx_operations_date` ON `operations` (`date`);--> statement-breakpoint
CREATE INDEX `idx_operations_reference` ON `operations` (`reference`);--> statement-breakpoint
CREATE TABLE `products` (
	`code` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL
);
