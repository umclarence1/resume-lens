CREATE TABLE `evidence_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`passport_key` text NOT NULL,
	`title` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
