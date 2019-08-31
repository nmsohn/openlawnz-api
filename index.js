const express = require('express');
const { postgraphile } = require('postgraphile');
const PgSimplifyInflectorPlugin = require('@graphile-contrib/pg-simplify-inflector');
const PgManyToManyPlugin = require('@graphile-contrib/pg-many-to-many');
const { Pool } = require('pg')

const app = express();
const DB_HOST = process.env.DB_HOST || 'localhost'
const DB_PORT = process.env.DB_PORT || 3000
const DB_NAME = process.env.DB_NAME || 'postgres'
const DB_USER = process.env.DB_USER || 'root'
const DB_PASS = process.env.DB_PASS
const SCHEMA = process.env.SCHEMA || 'cases'
const PORT = process.env.PORT || 5000

const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,  
  password: DB_PASS,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

app.use(
  postgraphile(
    pool,
    SCHEMA,
    {    
      appendPlugins: [
        PgSimplifyInflectorPlugin,
        PgManyToManyPlugin
      ],
      graphileBuildOptions: {
        pgOmitListSuffix: true,
      },
      enableCors: true,
      watchPg: true,
      graphiql: true,
      enhanceGraphiql: true,
      simpleCollections: 'only'
    }
  )
);

app.listen(PORT, () => {
  console.log(`
  Postgraphile API server running on port: ${PORT}
  User Graphiql interface at: https://localhost/graphql:${PORT}
  `)
});
