# GpsTracker

## 1. Project Overview
GpsTracker is a full-stack web application designed for real-time GPS and IP-based location tracking. Built with Next.js and a modern tech stack, it captures user locations (using precise GPS coordinates with an IP-based fallback), logs visitor details (device, browser, OS), and displays these locations dynamically on a live map for administrators.

## 2. Tech Stack
- **Framework**: Next.js (v16.2.10) - App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS (v4)
- **Database ORM**: Prisma (v7.8)
- **Database**: PostgreSQL (Hosted on Supabase)
- **Mapping**: Leaflet (v1.9.4) & react-leaflet (v5.0.0)
- **HTTP Client**: axios (v1.18.1)

## 3. Folder Structure
```text
my-app/
├── app/
│   ├── admin/             # Admin dashboard pages (live map view)
│   ├── api/               # Next.js API Routes (Backend logic)
│   ├── v/                 # Visitor facing pages (tracking logic)
│   ├── globals.css        # Global Tailwind CSS styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── lib/
│   └── generated/prisma/  # Custom Prisma client generation output
│   └── prisma.ts          # Prisma client instantiation (if applicable)
├── prisma/
│   ├── schema.prisma      # Database models and relations
│   └── migrations/        # Database migrations
├── public/                # Static assets
├── .env                   # Environment variables (ignored in git)
├── next.config.ts         # Next.js configuration
├── package.json           # Dependencies and scripts
└── prisma.config.ts       # Prisma configuration
```

## 4. Database Schema
The database schema consists of two main Prisma models: `Visitor` and `Location`.

### `Visitor` Model
Represents a unique user being tracked.
- `id` (String): UUID, Primary Key.
- `visitorCode` (String): Unique identifier for the visitor.
- `firstSeenAt` (DateTime): Timestamp of first visit.
- `lastSeenAt` (DateTime): Timestamp of the most recent visit.
- `locations` (Location[]): One-to-many relation to the `Location` model.
- `userAgent` (String?): Raw User-Agent string.
- `deviceType` (String?): Parsed device type (Mobile, Tablet, Desktop).
- `browser` (String?): Parsed browser name.
- `os` (String?): Parsed operating system.

### `Location` Model
Represents a specific geographic coordinate captured for a visitor.
- `id` (String): UUID, Primary Key.
- `visitorId` (String): Foreign Key linking to `Visitor`.
- `source` (String): How the location was obtained (e.g., "GPS" or "IP").
- `latitude` (Float) & `longitude` (Float): Geographic coordinates.
- `accuracy` (Float?): GPS accuracy in meters.
- `city`, `region`, `country`, `isp` (String?): IP-based geographic info.
- `ipAddress` (String?): The IP address of the request.
- `capturedAt` (DateTime): Timestamp of when the location was recorded.

## 5. Environment Variables
To run this project, you need to configure the following environment variables in your `.env` file:
- `DATABASE_URL`: The transactional connection pooler URL used by Prisma to connect to the Supabase PostgreSQL database.
- `DIRECT_URL`: The direct connection URL to the database. Required by Prisma for running schema migrations reliably without a pooler.
- `NODE_ENV`: The environment state (e.g., `development` or `production`). Used in API routes to toggle local IP mocking during development.

## 6. API Routes

### `GET /api/locations`
- **Purpose**: Fetches all visitors along with their entire location history. Used by the admin dashboard map to display users.
- **Output**: JSON array of `Visitor` objects, with a nested array of `Location` objects ordered by most recent capture time.

### `POST /api/location/save`
- **Purpose**: Saves a new GPS or IP location for a visitor. Automatically parses and updates the user's device, browser, and OS using Next.js server-side `userAgent` utility.
- **Expected Input**: JSON body containing `visitorCode`, `source`, `latitude`, `longitude`, `accuracy`, `ipAddress`, `city`, `region`, `country`, `isp`, `userAgent`.
- **Output**: JSON object of the newly created `Location`.

### `GET /api/location/ip`
- **Purpose**: Detects the user's IP address from headers and fetches their approximate location (city, lat, lon, isp) using an external service (`ip-api.com`). Includes a fallback dummy IP for localhost development.
- **Output**: JSON object containing `ipAddress`, `city`, `region`, `country`, `isp`, `latitude`, `longitude`, and `userAgent`.

### `GET /api/location/history/[visitorCode]`
- **Purpose**: Retrieves the chronological location history (path) for a specific visitor.
- **Output**: JSON array of coordinate points `{ latitude, longitude, createdAt }` mapped and sorted by time for drawing continuous paths on the admin map.

## 7. Key Features
- **GPS + IP Fallback Logic**: Attempts highly accurate browser GPS tracking first, and falls back to IP-based location if GPS permission is denied or unavailable.
- **Polling-based Dashboard**: The admin map can poll for new locations to show visitors moving in near real-time.
- **Admin Live Map View**: Utilizes `react-leaflet` to render interactive maps, plotting visitor markers and their historical movement paths.
- **Device & OS Detection**: Automatically extracts and saves the visitor's device type, browser, and OS server-side directly from the request headers using Next.js natively.

## 8. Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd GpsTracker/my-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env` file in the root directory and add `DATABASE_URL`, `DIRECT_URL`, and `NODE_ENV` configuration pointing to your PostgreSQL/Supabase database.

4. **Run Migrations**:
   Generate the Prisma client and push the schema to the database:
   ```bash
   npx prisma generate
   npx prisma db push
   # OR for applying manual migrations: npx prisma migrate dev
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```

## 9. Deployment Notes (Vercel)
When deploying this project to Vercel, pay attention to the following gotchas discovered during development:
- **Dependency placement**: Packages like `@tailwindcss/postcss` and `@types/leaflet` must be moved from `devDependencies` to `dependencies` in `package.json` to ensure they are available during Vercel's build process.
- **Prisma Client Generation**: A `"postinstall": "prisma generate"` script is required in `package.json` so Vercel automatically generates the Prisma client after installing node modules.
- **Direct Database URL**: Ensure `DIRECT_URL` is properly configured in `.env` / Vercel Environment Variables. Vercel deployments and migrations will fail if Prisma tries to run migrations over a pooled connection (`DATABASE_URL`) instead of a direct connection.

## 10. Known Issues / Lessons Learned
- **Next.js 15+ Dynamic Route Params**: In Next.js 15+, dynamic route `params` (like `[visitorCode]`) are Promises and *must* be awaited before being accessed (e.g., `const { visitorCode } = await params;` in the history route).
- **Localhost IP Testing**: Testing IP location logic on `localhost` yields `::1` or `127.0.0.1`, which public IP APIs reject. A dummy IP fallback hack was explicitly implemented for `NODE_ENV="development"` to bypass this limit and simulate a public IP.
- **Prisma Schema Generation Path**: Since the Prisma client output is customized (`output = "../lib/generated/prisma"` in `schema.prisma`), ensure all imports reference this generated path (or your `@/lib/prisma` wrapper) rather than the default `@prisma/client`.
- **User Agent Parsing**: Using Next.js `userAgent(request)` allows for elegant server-side device and OS detection without needing heavy external libraries.
