-- Better Auth anonymous + passkey support
alter table "user" add column if not exists "isAnonymous" boolean default false;

create table if not exists "passkey" (
  "id" text primary key,
  "name" text,
  "publicKey" text not null,
  "userId" text not null references "user" ("id") on delete cascade,
  "credentialID" text not null,
  "counter" integer not null,
  "deviceType" text not null,
  "backedUp" boolean not null,
  "transports" text,
  "createdAt" timestamptz,
  "aaguid" text
);

create index if not exists "passkey_userId_idx" on "passkey" ("userId");
create unique index if not exists "passkey_credentialID_uidx" on "passkey" ("credentialID");
