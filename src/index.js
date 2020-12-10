import 'dotenv/config';
import express from 'express';

const app = express();
const PORT = process.env.PORT

app.listen(PORT, () =>
  console.log(`NodeJS app listening on port ${PORT}!`),
);

app.get('/', (req, res) => {
  res.send('Hello World!');
});