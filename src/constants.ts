import consola from 'consola';

consola.log('process.env.DOMAIN', process.env.DOMAIN);
consola.log('process.env.host', process.env.host);
consola.log('process.env.HOST', process.env.HOST);
consola.log(
  'process.env.HEROKU_APP_DEFAULT_DOMAIN_NAME',
  process.env.HEROKU_APP_DEFAULT_DOMAIN_NAME
);

export const DOMAIN =
  process.env.HEROKU_APP_DEFAULT_DOMAIN_NAME ||
  process.env.DOMAIN ||
  (`localhost:${process.env.PORT}` as const);

consola.log('DOMAIN IS:', DOMAIN);
