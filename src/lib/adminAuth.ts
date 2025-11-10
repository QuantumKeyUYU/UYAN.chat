export const isAdminRequest = (request: Request): boolean => {
  const header = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!header) return false;
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return false;

  const expected = process.env.ADMIN_DASHBOARD_TOKEN;
  if (!expected) return false;

  return token === expected;
};
