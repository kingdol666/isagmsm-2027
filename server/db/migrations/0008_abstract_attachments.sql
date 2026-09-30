ALTER TABLE "abstract_events" ADD COLUMN "version" integer;
ALTER TABLE "abstract_events" ADD COLUMN "file_name" text;
ALTER TABLE "abstract_events" ADD COLUMN "file_key" text;
ALTER TABLE "abstract_events" ADD COLUMN "file_size" integer;
ALTER TABLE "abstract_events" ADD COLUMN "file_type" varchar(100);
