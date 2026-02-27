interface EnvConfig {
  apiUrl: string;
  socketUrl: string;
  googleMapsApiKey: string;
  environment: 'development' | 'staging' | 'production';
  version: string;
  sentryDsn?: string;
  analyticsId?: string;
  appName: string;
  appUrl: string;
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[`REACT_APP_${key}`] || defaultValue;
  if (!value && process.env.NODE_ENV === 'production') {
    console.warn(`Missing environment variable: REACT_APP_${key}`);
  }
  return value || '';
};

export const config: EnvConfig = {
  apiUrl: getEnvVar('API_URL', 'http://localhost:5000/api'),
  socketUrl: getEnvVar('SOCKET_URL', 'http://localhost:5000'),
  googleMapsApiKey: getEnvVar('GOOGLE_MAPS_API_KEY', ''),
  environment: (process.env.NODE_ENV as EnvConfig['environment']) || 'development',
  version: getEnvVar('VERSION', '1.0.0'),
  sentryDsn: getEnvVar('SENTRY_DSN'),
  analyticsId: getEnvVar('ANALYTICS_ID'),
  appName: 'Smart Accident Detection System',
  appUrl: getEnvVar('APP_URL', 'http://localhost:3000'),
};

export const isDevelopment = config.environment === 'development';
export const isProduction = config.environment === 'production';
export const isStaging = config.environment === 'staging';