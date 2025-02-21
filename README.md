# vincent-app-registry
Vincent App Registry REST API for backend storage


## 💻 Development

The repository is a mono-repo leveraging `pnpm` as the package manager, using `pnpm workspaces`. It requires Node v18+, it is recommended that you use `nvm` to select the correct node version via the included `.nvmrc` file.

- Clone the repository
- Enable [Corepack](https://github.com/nodejs/corepack) using `corepack enable` - this will ensure `pnpm` (and the correct version of it) is used throughout
- Install dependencies by running `pnpm install`
- Build plain JS code for node to execute by running `pnpm build`

The service requires a MongoDB instance to function, which is configured via env variables:
- Get a MongoDB instance to run the service against
- Configure MongoDB connection details in `.env` file

See [demo.txt](./demo.txt) contains example CURL commands that you can use to test the endpoints

