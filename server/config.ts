const required = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
};

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN,
  API_SECRET_KEY: required("API_SECRET_KEY"),
  PORT: parseInt(process.env.PORT ?? "8080", 10),
  HOST: process.env.HOST ?? "0.0.0.0",
  DEFAULT_POLL_MS: parseInt(process.env.DEFAULT_POLL_MS ?? "3000", 10),
};
