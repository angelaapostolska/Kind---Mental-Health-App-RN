import Constants from 'expo-constants';

const ENVIRONMENTS = {
  local: {
    environment: 'local',
    base_api_url: 'http://localhost:3000/',
  },
  development: {
    environment: 'development',
    base_api_url: 'https://your-dev-api.example.com/',
  },
  qa: {
    environment: 'qa',
    base_api_url: '',
  },
  production: {
    environment: 'production',
    base_api_url: '',
  },
};

function getEnv() {
  const appEnv = Constants?.expoConfig?.extra?.appEnv;

  if (__DEV__) return ENVIRONMENTS.local;

  return ENVIRONMENTS[appEnv] ?? ENVIRONMENTS.development;
}

export const env = getEnv();
