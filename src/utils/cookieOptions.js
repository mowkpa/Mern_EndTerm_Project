const isProd = process.env.NODE_ENV === 'production';

export const cookieOptions = {
  httpOnly: true,
  sameSite: isProd ? 'none' : 'lax',
  secure: isProd,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const clearCookieOptions = {
  httpOnly: true,
  sameSite: isProd ? 'none' : 'lax',
  secure: isProd,
  path: '/',
};
