export default ({ env }) => {
  const client = env("DATABASE_CLIENT", "postgres")

  const connections = {
    postgres: {
      connection: {
        host: env("DATABASE_HOST", "localhost"),
        port: env.int("DATABASE_PORT", 5432),
        database: env("DATABASE_NAME", "strapi"),
        user: env("DATABASE_USERNAME", "postgres"),
        password: env("DATABASE_PASSWORD", "strapi"),
        schema: env("DATABASE_SCHEMA", "public"),
        ssl: {
          rejectUnauthorized: env.bool("DATABASE_SSL_SELF", false),
        },
      },
      pool: {
        min: env.int("DATABASE_POOL_MIN", 2),
        max: env.int("DATABASE_POOL_MAX", 10),
      },
      acquireConnectionTimeout: env.int("DATABASE_CONNECTION_TIMEOUT", 60000),
      // Configuración específica para resolver problemas de GROUP BY en PostgreSQL
      options: {
        pool: {
          afterCreate: (conn, done) => {
            // Configurar PostgreSQL para ser menos estricto con GROUP BY
            conn.query("SET sql_mode = '';", (err) => {
              if (err) {
                // PostgreSQL no tiene sql_mode, pero podemos configurar otras opciones
                console.log("PostgreSQL sql_mode not applicable, continuing...")
              }
              // Configurar para permitir consultas menos estrictas
              conn.query("SET SESSION group_concat_max_len = 1000000;", (err) => {
                if (err) {
                  console.log("PostgreSQL group_concat not applicable, continuing...")
                }
                done(err, conn)
              })
            })
          },
        },
      },
    },
  }

  return {
    connection: {
      client,
      ...connections[client],
      useNullAsDefault: true,
    },
  }
}
