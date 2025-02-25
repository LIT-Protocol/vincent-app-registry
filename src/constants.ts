export const DOMAIN =
  process.env.DOMAIN ||
  process.env.HEROKU_APP_DEFAULT_DOMAIN_NAME ||
  (`localhost:${process.env.PORT}` as const);
