ZapTasks

## Project Overview

ZapTasks is a full-stack marketplace application designed to connect users who need help with local service providers. It's built on a modern web stack, providing a platform for posting jobs, hiring professionals, and managing payments securely.

- **Frontend**: Next.js with React and TypeScript, styled with Tailwind CSS and Radix UI components.
- **Backend**: Next.js API Routes.
- **Authentication**: User management is handled by Clerk.
- **Database**: Supabase (PostgreSQL) is used for data storage. The database schema includes tables for job requests, applications, active jobs, payments, and disputes.
- **Payments**: Stripe is integrated for handling payments. Ideally with CC or 
- **Location Services**: Google Maps API is used for address autocompletion and location-based features.

## Building and Running

### Prerequisites

- Node.js
- npm

### Setup

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Set up your environment variables. You will need to create a `.env.local` file and populate it with credentials for:
    - Supabase (URL and anon key)
    - Clerk (Publishable key and secret key)
    - Stripe (Public key, secret key, and webhook secret)
    - Google Maps (API key)

### Running the Application

- **Development**: To run the application in development mode with hot-reloading:
  ```bash
  npm run dev
  ```
  The application will be available at `http://localhost:3000`.

- **Production Build**: To create a production-ready build:
  ```bash
  npm run build
  ```

- **Start Production Server**: To run the production build:
  ```bash
  npm run start
  ```

### Testing

- **Linting**: To check the code for style and syntax errors:
  ```bash
  npm run lint
  ```
There are no automated tests (e.g., Jest, Cypress) configured in the project at the moment.

## Development Conventions

- **Code Style**: The project uses ESLint with the `eslint-config-next` preset to enforce code quality and consistency. Code is written in TypeScript.
- **Styling**: Tailwind CSS is used for utility-first styling. Custom components are built using Radix UI for accessibility.
- **API**: The backend is built with Next.js API Routes. API logic is generally located in `app/api/...`.
- **Database Interaction**: Database interactions are handled through the Supabase client library. SQL schema is defined in `database.sql`.
- **Authentication**: User authentication is managed by Clerk. The current user can be accessed on the server-side using `getAuth` from `@clerk/nextjs/server`.
- **Payment Flow**: The payment logic is a critical part of the application. The flow is as follows:
  1. A homeowner posts a `job_request`.
  2. Providers submit `job_applications`.
  3. The homeowner accepts an application, which creates a `job`.
  4. If users want, they can pay via eTransfer (separate from the app), or they can use ZapTasks (Stripe). 

  We can sort out mmonetization later...