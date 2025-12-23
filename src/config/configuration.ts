export default () => ({
  port: parseInt(process.env.PORT || '9003', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
});
