// server/app.js
import express from 'express';
import analyzeRoute from './routes/analyze.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/analyze', analyzeRoute);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
