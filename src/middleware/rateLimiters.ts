import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 5,
	message: 'Too many login attempts from this IP, please try again after 15 minutes',
	standardHeaders: true,
	legacyHeaders: false,
});

export const tokenLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 10,
	message: 'Too many token requests from this IP, please try again after a minute',
	standardHeaders: true,
	legacyHeaders: false,
});
