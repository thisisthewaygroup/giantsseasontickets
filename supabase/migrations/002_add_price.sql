-- Add per-ticket price to games
alter table games add column if not exists price_per_ticket numeric(8,2);
