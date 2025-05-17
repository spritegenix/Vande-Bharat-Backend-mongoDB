bun init

# Install TypeScript and types
bun add express mongoose @apollo/server graphql
bun add -d typescript ts-node @types/node @types/express tsconfig-paths

# Install MongoDB-related packages
bun add mongoose mongodb
bun add -d @types/mongoose

# Install REST API related packages
bun add express cors helmet compression cookie-parser express-rate-limit
bun add -d @types/cors @types/helmet @types/compression @types/cookie-parser

# Install GraphQL related packages
bun add @apollo/server graphql graphql-tag @graphql-tools/schema @graphql-tools/load-files @graphql-tools/merge

# Install Zod and related packages
bun add zod zod-express-middleware

# Install auth related packages
bun add jsonwebtoken bcrypt passport passport-jwt passport-local
bun add -d @types/jsonwebtoken @types/bcrypt @types/passport @types/passport-jwt @types/passport-local

# Install DI container
bun add inversify reflect-metadata

# Install logging and monitoring
bun add winston pino morgan
bun add -d @types/morgan

# Install testing related packages
bun add -d jest @types/jest ts-jest supertest @types/supertest


# Install developer tools
bun add -d nodemon eslint prettier eslint-config-prettier eslint-plugin-prettier
bun add -d @typescript-eslint/eslint-plugin @typescript-eslint/parser


# Install configuration related packages
bun add dotenv envalid

# Documentation
bun add swagger-ui-express swagger-jsdoc
/*
@(
  "src",
  "src/config",
  "src/core",
  "src/core/errors",
  "src/core/middlewares",
  "src/core/utils",
  "src/core/zodSchemas",
  "src/modules",
  "src/modules/user",
  "src/modules/user/controller",
  "src/modules/user/graphql",
  "src/modules/user/models",
  "src/modules/user/repositories",
  "src/modules/user/services",
  "src/modules/user/dtos",
  "src/modules/user/routes",
  "src/graphql",
  "src/rest",
  "src/types"
) | ForEach-Object { New-Item -Path $_ -ItemType Directory -Force }

New-Item -Path src/app.ts -ItemType File -Force
New-Item -Path src/server.ts -ItemType File -Force
<!-- -------------------------------------------------------------  -->
@(
  "src/config/database.ts",
  "src/config/env.ts",

  "src/core/errors/AppError.ts",
  "src/core/middlewares/errorHandler.ts",
  "src/core/middlewares/validateRequest.ts",
  "src/core/utils/logger.ts",
  "src/core/zodSchemas/user.schema.ts",

  "src/modules/user/controller/user.controller.ts",
  "src/modules/user/graphql/user.resolvers.ts",
  "src/modules/user/graphql/user.typeDefs.ts",
  "src/modules/user/models/user.model.ts",
  "src/modules/user/repositories/user.repository.ts",
  "src/modules/user/services/user.service.ts",
  "src/modules/user/dtos/user.dto.ts",
  "src/modules/user/routes/user.routes.ts",

  "src/graphql/context.ts",
  "src/graphql/server.ts",

  "src/rest/server.ts",

  "src/types/global.d.ts",

  "src/app.ts",
  "src/server.ts"
) | ForEach-Object {
  $dir = Split-Path $_
  if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force }
  New-Item -ItemType File -Path $_ -Force
}

*/

DB - 
userName : toolsspritegenix
password : mvFpkn0YmdPREvko

ngrok http 3000 --domain=fluent-similarly-shrimp.ngrok-free.app 
after bun run dev

https://fluent-similarly-shrimp.ngrok-free.app/api/v1/internal/clerk/user-created