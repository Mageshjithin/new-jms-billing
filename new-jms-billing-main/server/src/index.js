import 'dotenv/config';
import app from './app.js';
import { loadData } from './db.js';

const port = process.env.PORT || 5000;
try {
  await loadData();
  app.listen(port, () => console.log(`JMS Textiles API listening on port ${port}`));
} catch (error) {
  console.error('Could not load local data:', error.message);
  process.exit(1);
}
