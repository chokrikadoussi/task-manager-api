import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const authenticate = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ message: 'No token provided' });
        return;
    }

    const token = authHeader.slice(7);

    const secretKey: string = process.env.JWT_SECRET ?? 'default_secret_key';

    try {
        const decoded = jwt.verify(token, secretKey) as { userId: number };
        req.userId = decoded.userId;
        next();
    } catch (error) {
        console.error('Token verification failed:', error);
        res.status(403).json({ message: 'Invalid token' });
    }
};

export default authenticate;