import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// All data lives in one JSON file on the local disk (server/data/db.json by default).
const defaultFile = fileURLToPath(new URL('../data/db.json', import.meta.url));
const dataFile = () => path.resolve(process.env.DATA_FILE || defaultFile);
const empty = () => ({ products: [], bills: [] });

let cache;
let loading;
let queue = Promise.resolve();

// Returns the current data. Callers must treat it as read-only; use transaction() to change it.
export async function loadData() {
  if (cache) return cache;
  loading ??= (async () => {
    try {
      cache = { ...empty(), ...JSON.parse(await fs.readFile(dataFile(), 'utf8')) };
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error(`Could not read data file ${dataFile()}: ${error.message}`);
      cache = empty();
    }
    return cache;
  })().finally(() => { loading = undefined; });
  return loading;
}

async function save(data) {
  const file = dataFile();
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, file);
}

// Runs fn against a copy of the data, one transaction at a time. If fn throws,
// nothing is saved, so partial changes (e.g. stock already reduced) are discarded.
export function transaction(fn) {
  const run = queue.then(async () => {
    const draft = structuredClone(await loadData());
    const result = await fn(draft);
    await save(draft);
    cache = draft;
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

export const httpError = (status, message) => Object.assign(new Error(message), { status });
