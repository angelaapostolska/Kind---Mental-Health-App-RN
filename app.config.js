import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  extra: {
    apiUrl: process.env.API_URL || 'http://localhost:3000/',
    appEnv: process.env.APP_ENV || 'local',
  },
});
