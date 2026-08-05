CREATE TABLE `agent_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`investigation_id` text NOT NULL,
	`assumption_id` text,
	`role` text NOT NULL,
	`objective` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`harness` text,
	`model` text,
	`effort` text,
	`cwd` text NOT NULL,
	`exit_code` integer,
	`error` text,
	`manifest_path` text,
	`started_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`finished_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`investigation_id`) REFERENCES `investigations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assumption_id`) REFERENCES `assumptions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `agent_runs_investigation_status_idx` ON `agent_runs` (`investigation_id`,`status`);--> statement-breakpoint
CREATE INDEX `agent_runs_assumption_idx` ON `agent_runs` (`assumption_id`);--> statement-breakpoint
CREATE TABLE `assumptions` (
	`id` text PRIMARY KEY NOT NULL,
	`investigation_id` text NOT NULL,
	`cycle` integer DEFAULT 0 NOT NULL,
	`statement` text NOT NULL,
	`rationale` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`outcome` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`investigation_id`) REFERENCES `investigations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assumptions_investigation_status_idx` ON `assumptions` (`investigation_id`,`status`);--> statement-breakpoint
CREATE TABLE `capability_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`investigation_id` text NOT NULL,
	`assumption_id` text,
	`need` text NOT NULL,
	`reason` text NOT NULL,
	`provisioning_hint` text NOT NULL,
	`self_provisioning_attempt` text,
	`blocking` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`answer` text,
	`answered_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`investigation_id`) REFERENCES `investigations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assumption_id`) REFERENCES `assumptions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `capability_requests_investigation_status_idx` ON `capability_requests` (`investigation_id`,`status`);--> statement-breakpoint
CREATE TABLE `events` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`investigation_id` text NOT NULL,
	`type` text NOT NULL,
	`payload` text NOT NULL,
	`occurred_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`investigation_id`) REFERENCES `investigations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_id_unique` ON `events` (`id`);--> statement-breakpoint
CREATE INDEX `events_investigation_sequence_idx` ON `events` (`investigation_id`,`sequence`);--> statement-breakpoint
CREATE TABLE `findings` (
	`id` text PRIMARY KEY NOT NULL,
	`investigation_id` text NOT NULL,
	`assumption_id` text NOT NULL,
	`run_id` text NOT NULL,
	`claim` text NOT NULL,
	`work` text NOT NULL,
	`artifact_paths` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'unverified' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`investigation_id`) REFERENCES `investigations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assumption_id`) REFERENCES `assumptions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`run_id`) REFERENCES `agent_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `findings_investigation_status_idx` ON `findings` (`investigation_id`,`status`);--> statement-breakpoint
CREATE TABLE `investigations` (
	`id` text PRIMARY KEY NOT NULL,
	`goal` text NOT NULL,
	`input` text NOT NULL,
	`state` text DEFAULT 'RUNNING' NOT NULL,
	`state_reason` text,
	`workspace_path` text NOT NULL,
	`started_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`hibernated_at` integer,
	`breakthrough_at` integer,
	`stopped_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `labs_state_idx` ON `investigations` (`state`);--> statement-breakpoint
CREATE TABLE `lab_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`settings` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notification_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`settings` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `runtime_checkpoints` (
	`investigation_id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`snapshot` text NOT NULL,
	`last_event_sequence` integer,
	`persisted_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`investigation_id`) REFERENCES `investigations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `runtime_checkpoints_persisted_at_idx` ON `runtime_checkpoints` (`persisted_at`);--> statement-breakpoint
CREATE TABLE `verdicts` (
	`id` text PRIMARY KEY NOT NULL,
	`investigation_id` text NOT NULL,
	`finding_id` text NOT NULL,
	`run_id` text NOT NULL,
	`confirmed` integer NOT NULL,
	`reasoning` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`investigation_id`) REFERENCES `investigations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`finding_id`) REFERENCES `findings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`run_id`) REFERENCES `agent_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `verdicts_finding_idx` ON `verdicts` (`finding_id`);