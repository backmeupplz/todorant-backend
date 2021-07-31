export const admins = process.env.ADMIN
  ? process.env.ADMIN.split(',').map((s) => parseInt(s, 10))
  : []
