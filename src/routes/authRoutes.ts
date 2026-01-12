import express from 'express';
import { register, login, showLoginPage, showRegisterPage } from '../controllers/authController';
import { authorize, handleConsent, token, revoke } from '../controllers/oauthController';
import { userinfo } from '../controllers/userController';
import { authenticateSession } from '../middleware/authMiddleware';
import { loginLimiter, tokenLimiter } from '../middleware/rateLimiters';

const router = express.Router();

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.get('/login', showLoginPage);
router.get('/register', showRegisterPage);

router.get('/authorize', authenticateSession, authorize);
router.post('/consent', authenticateSession, handleConsent);
router.post('/token', tokenLimiter, token);
router.post('/revoke', revoke);
router.get('/userinfo', userinfo);

export default router;
