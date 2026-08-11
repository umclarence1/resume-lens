CREATE TABLE `public_evidence_profiles` (
	`token` text PRIMARY KEY NOT NULL,
	`passport_key` text NOT NULL,
	`title` text NOT NULL,
	`payload` text NOT NULL,
	`published_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `public_profiles_passport_key_idx` ON `public_evidence_profiles` (`passport_key`);