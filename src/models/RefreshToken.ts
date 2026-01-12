import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface RefreshTokenAttributes {
  id: number;
  token_hash: string;
  user_id: number;
  client_id: string;
  scope: string;
  expires_at: Date;
  revoked_at: Date | null;
}

interface RefreshTokenCreationAttributes extends Optional<RefreshTokenAttributes, 'id'> { }

class RefreshToken extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes> implements RefreshTokenAttributes {
  public id!: number;
  public token_hash!: string;
  public user_id!: number;
  public client_id!: string;
  public scope!: string;
  public expires_at!: Date;
  public revoked_at!: Date | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

RefreshToken.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    token_hash: {
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
    scope: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    revoked_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'refresh_tokens',
  }
);

export default RefreshToken;
