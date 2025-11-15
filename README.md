# StoneCalc

Full‑stack stone volume & weight calculator powered by a Vite + React frontend and an Express/MongoDB backend. The UI ships with Tailwind styling, a modern calculator workflow, and instant language switching between English, Armenian, Russian, and Georgian.

## Project Structure

```
stonecalc-repo/
├── backend/    # Express API, Mongo persistence
├── frontend/   # Vite + React single-page app
└── README.md
```

## Features

- 📐 Geometry-aware calculator for rectangular blocks and cylinders
- 🧮 Density-aware weight estimates plus save support via the API
- 🌐 Multi-language UI (EN / HY / RU / KA) with flag dropdown selector
- 🎨 Tailwind-powered glassmorphism layout
- ⚙️ REST API (`/api/calc`, `/api/history`) backed by MongoDB

## Prerequisites

- [Node.js 18+](https://nodejs.org/) and npm
- Running MongoDB instance (local `mongod` or MongoDB Atlas)

## Backend Setup (`/backend`)

```bash
cd backend
npm install
```

Create a `.env` file with at least:

```dotenv
PORT=4000
MONGODB_URI=mongodb://localhost:27017/stonecalc
```

Run the API:

```bash
npm run dev   # uses nodemon
# or
npm start     # plain node
```

### Backend Endpoints

| Method | Path         | Description                                    |
| ------ | ------------ | ---------------------------------------------- |
| POST   | `/api/calc`  | Calculate & optionally persist a stone record. |
| GET    | `/api/history` | Retrieve previous calculations.             |

## Frontend Setup (`/frontend`)

```bash
cd frontend
npm install
npm run dev       # start Vite dev server (default http://localhost:5173)
```

Additional scripts:

- `npm run build` – production bundle (outputs to `frontend/dist`)
- `npm run preview` – serve the production build locally

> The frontend issues requests to relative paths like `/api/calc`, so in development run the backend on the same origin (e.g., configure the Vite `server.proxy` option) or adjust the fetch base URL to point at your API host.

## Environment Variables

| Location | Variable      | Description                                   |
| -------- | ------------- | --------------------------------------------- |
| backend  | `PORT`        | Port for the Express server (default `4000`). |
| backend  | `MONGODB_URI` | Connection string for MongoDB.                |

## Useful Tips

- Tailwind styles live in `frontend/src/index.css`. Adjust the design tokens in `tailwind.config.js`.
- Localization strings are centralized in `frontend/src/i18n.js`. Add new languages or tweak copy there.
- Git ignores build artifacts, environment files, IDE metadata, and `node_modules` to keep commits clean (see `.gitignore`).

Happy hacking!
