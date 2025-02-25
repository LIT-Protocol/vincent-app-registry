import consola from 'consola';

export const DOMAIN =
  process.env.HEROKU_APP_DEFAULT_DOMAIN_NAME ||
  process.env.DOMAIN ||
  (`localhost:${process.env.PORT}` as const);

consola.log('DOMAIN IS:', DOMAIN);
