import app from './app';
import dotenv from 'dotenv';
import { syncDatabase } from './models';

dotenv.config();

const PORT = process.env.PORT || 3000;

syncDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
