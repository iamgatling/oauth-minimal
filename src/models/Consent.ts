import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface ConsentAttributes {
    id: number;
    user_id: number;
    client_id: string;
    scope: string;
}

interface ConsentCreationAttributes extends Optional<ConsentAttributes, 'id'> { }

class Consent extends Model<ConsentAttributes, ConsentCreationAttributes> implements ConsentAttributes {
    public id!: number;
    public user_id!: number;
    public client_id!: string;
    public scope!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Consent.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
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
    },
    {
        sequelize,
        tableName: 'consents',
        indexes: [
            {
                unique: true,
                fields: ['user_id', 'client_id']
            }
        ]
    }
);

export default Consent;
