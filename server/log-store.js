const MAX_ENTRIES = 500;

let nextId = 1;
const entries = [];

function addEntry(entry) {
  entries.push({ id: nextId++, timestamp: new Date().toISOString(), ...entry });
  if (entries.length > MAX_ENTRIES) entries.shift();
}

function getEntries(limit = 300) {
  return entries.slice(-limit).reverse();
}

module.exports = { addEntry, getEntries };
