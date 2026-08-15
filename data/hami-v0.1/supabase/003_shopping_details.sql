-- Extra shopping item details: notes, where to buy, and a buy-by date.
-- Run this in the HAMI Supabase project (SQL editor) after 002_shopping_list.sql.

alter table public.shopping_items add column if not exists notes text;
alter table public.shopping_items add column if not exists store text;
alter table public.shopping_items add column if not exists buy_by date;
