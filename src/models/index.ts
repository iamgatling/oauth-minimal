import sequelize from '../config/database';
import User from './User';
import AuthCode from './AuthCode';
import RefreshToken from './RefreshToken';
import Consent from './Consent';


const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    await sequelize.sync({ alter: true });
    console.log('Database synchronized.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

export { User, AuthCode, RefreshToken, Consent, syncDatabase };
