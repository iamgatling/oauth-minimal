import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_jwt_key';

export const userinfo = async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Missing token' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as unknown as { sub: number, scope: string, client_id: string };

        const user = await User.findByPk(decoded.sub);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
        });

    } catch (error) {
        console.error('UserInfo error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
};
