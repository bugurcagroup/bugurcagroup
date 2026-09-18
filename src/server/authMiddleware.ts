import type { NextFunction, Request, Response } from 'express';
import { getAdminAuth } from '../lib/firebaseAdmin';

export type FirebaseRole = 'admin' | 'bayi' | 'customer';

export const verifyFirebaseToken = (requiredRole?: FirebaseRole) => async (req: Request, res: Response, next: NextFunction) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Yetkisiz erişim: Firebase token bulunamadı.' });
    return;
  }

  try {
    const token = await getAdminAuth().verifyIdToken(authorization.slice('Bearer '.length));
    req.firebaseUser = token;

    if (requiredRole && token.role !== requiredRole) {
      res.status(403).json({ error: 'Erişim engellendi: Yetersiz yetki.' });
      return;
    }

    next();
  } catch {
    res.status(401).json({ error: 'Geçersiz veya süresi dolmuş Firebase token.' });
  }
};

export const verifyAnyFirebaseRole = (...roles: FirebaseRole[]) => async (req: Request, res: Response, next: NextFunction) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Yetkisiz erişim: Firebase token bulunamadı.' });
    return;
  }

  try {
    const token = await getAdminAuth().verifyIdToken(authorization.slice('Bearer '.length));
    req.firebaseUser = token;
    if (roles.length > 0 && !roles.includes(token.role as FirebaseRole)) {
      res.status(403).json({ error: 'Erişim engellendi: Yetersiz yetki.' });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: 'Geçersiz veya süresi dolmuş Firebase token.' });
  }
};
