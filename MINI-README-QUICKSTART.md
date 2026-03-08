# MuziMind Project Quick Start Guide

## Prerequisites
- Node.js (v18+ recommended)
- npm (comes with Node.js)
- MongoDB (local or remote instance)

## 1. Install dependencies

Open a terminal in the project root and run:

```
npm install
```

Then install server dependencies:

```
cd server
npm install
```

## 2. Environment Variables

- Copy `.env.example` to `.env` in both the root and `server/` folders if present.
- Fill in required API keys and MongoDB URI in `server/.env`.

## 3. Running the Project

### Start the backend server:

```
cd server
npm run server
```

- If you get an error about port 3000 in use, kill any process using it:
  - On Windows: `netstat -ano | findstr :3000` to find the PID, then `taskkill /PID <PID> /F`

### Start the frontend (in a new terminal):

```
cd .. # Go back to project root if in server/
npm run dev
```

- The frontend will run on http://localhost:5173 (or another port if 5173 is busy).
- The backend runs on http://localhost:3000

## 4. Troubleshooting
- If you see `EADDRINUSE`, free the port as above.
- Make sure MongoDB is running and accessible.
- For Windows, always use the correct `cd` commands as above.

---

**Happy coding!**
