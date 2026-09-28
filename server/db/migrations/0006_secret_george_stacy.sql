CREATE TABLE "abstract_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"abstract_id" uuid NOT NULL,
	"kind" varchar(20) NOT NULL,
	"comment" text,
	"actor" varchar(200) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "abstracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(300) NOT NULL,
	"topic" varchar(10) NOT NULL,
	"report_type" varchar(20) NOT NULL,
	"abstract_text" text NOT NULL,
	"submitter_name" varchar(120) NOT NULL,
	"submitter_affiliation" varchar(300) NOT NULL,
	"authors" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'submitted' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "abstract_events" ADD CONSTRAINT "abstract_events_abstract_id_abstracts_id_fk" FOREIGN KEY ("abstract_id") REFERENCES "public"."abstracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abstracts" ADD CONSTRAINT "abstracts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;