import app from './app.js';
import 'dotenv/config';

const port: number = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
