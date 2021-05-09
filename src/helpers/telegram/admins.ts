export const admins = process.env.ADMIN.split(',').map((s) => parseInt(s, 10))
