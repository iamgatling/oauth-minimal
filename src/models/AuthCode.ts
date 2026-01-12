import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface AuthCodeAttributes {
  id: number;
  code: string;
  user_id: number;
  client_id: string;
  redirect_uri: string;
  scope: string;
  code_challenge: string;
  expires_at: Date;
}

interface AuthCodeCreationAttributes extends Optional<AuthCodeAttributes, 'id'> {}

class AuthCode extends Model<AuthCodeAttributes, AuthCodeCreationAttributes> implements AuthCodeAttributes {
  public id!: number;
  public code!: string;
  public user_id!: number;
  public client_id!: string;
  public redirect_uri!: string;
  public scope!: string;
  public code_challenge!: string;
  public expires_at!: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AuthCode.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    client_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    redirect_uri: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    scope: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    code_challenge: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'auth_codes',
  }
);

export default AuthCode;
