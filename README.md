# Status Monitor Dashboard

Honestly I got tired of having to jump across status pages to view uptimes of services I use. I created a full stack app (React, Node, Express, TS, & SQLite) to house everything in one place. You can download this repo and do the same. Currently pings each service added to your list once a minute (websocket implementation coming soon) to check uptime. This is my first solo dedicated project so be nice or die.

## Pre-reqs

- Node.js -- https://nodejs.org (containerized version and msi both work so pick your flavor)

## Getting Started

### 1. Clone Repo

```
git clone
cd statusboard
```

### 2. Set up backend

In your terminal:

```
cd back
npm install
npx ts-node src/index.ts
```
this will install all backend dependencies for you, same with frontend in the next step
the backend will start on port 3001, currently hardcoded but I will add support to change ports if you'd like. (Or you could fork and do it for me bc I'm so busy and burdened)

### 3. Set up frontend

Open a separate terminal:

```
cd front
npm install
npm start
```

## Project Structure
```
statusboard/
├── back/
│   └── src/
│       ├── index.ts       # Entry point
│       ├── database.ts    # SQLite setup
│       ├── scheduler.ts   # Ping scheduler
│       └── routes.ts      # REST API endpoints
└── frontend/
    └── src/
        └── App.tsx        # React dashboard
```
