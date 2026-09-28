ALTER TABLE "orders" ADD COLUMN "reference" varchar(120);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "claimed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "review_note" varchar(300);