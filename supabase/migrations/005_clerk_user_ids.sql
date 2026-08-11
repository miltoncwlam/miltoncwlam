-- Allow Clerk user ids (text) without Better Auth "user" table FK.
alter table decks drop constraint if exists decks_user_id_fkey;
alter table card_reviews drop constraint if exists card_reviews_user_id_fkey;
alter table study_sessions drop constraint if exists study_sessions_user_id_fkey;
