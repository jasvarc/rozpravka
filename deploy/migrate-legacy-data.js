#!/usr/bin/env node
// Jednorazova migracia zo stareho jedno-uzivatelskeho ulozenia (data/settings.json,
// data/stories.json) na novy multi-tenant model (data/tenants/<meno>/...).
//
// Pouzitie: node deploy/migrate-legacy-data.js <meno>

const { migrateLegacyData, isValidTenantName } = require('../server/store');

const tenant = process.argv[2];

if (!tenant) {
  console.error('Pouzitie: node deploy/migrate-legacy-data.js <meno>');
  process.exit(1);
}

if (!isValidTenantName(tenant.toLowerCase())) {
  console.error('Neplatny nazov. Povolene su male pismena, cislice, pomlcka a podciarnik (2-30 znakov).');
  process.exit(1);
}

const result = migrateLegacyData(tenant.toLowerCase());

if (result.migrated) {
  console.log(`Hotovo. Stare data su teraz dostupne pod menom "${tenant.toLowerCase()}".`);
  console.log(`Otvor: http://tvoj-server/rozpravky/${tenant.toLowerCase()}/`);
} else {
  console.log(`Nic sa nemigrovalo: ${result.reason}`);
}
