# Gmail IMAP Backend - Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (version 16 or higher)
- **MySQL** (version 5.7 or higher)
- **npm** (comes with Node.js)

## Installation Steps

### 1. Clone and Navigate
```bash
# Clone the repository (if applicable)
git clone <repository-url>
cd Imap_backend

# navigate to the project directory
cd Imap_backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup

#### Create MySQL Database
```sql
-- Connect to MySQL and run:
CREATE DATABASE gmail_imap_db;
```

#### Verify Database Connection
Update the database credentials in your `.env` file:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=gmail_imap_db
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
```

### 4. Google OAuth Setup

#### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Gmail API**

#### Step 2: Configure OAuth Consent Screen
1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type
3. Fill in required information:
   - App name: "Gmail IMAP Viewer"
   - User support email: your-email@gmail.com
   - Developer contact information: your-email@gmail.com

#### Step 3: Add Scopes
Add these OAuth scopes:
- `../auth/userinfo.email`
- `../auth/userinfo.profile` 
- `../auth/gmail.readonly`

#### Step 4: Create OAuth Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Choose **Web application**
4. Add authorized redirect URIs:
   - `http://localhost:3000/api/v1/auth/google/callback`

#### Step 5: Add Test Users
1. In OAuth consent screen, add test users
2. Add your email address and any test accounts

### 5. Environment Configuration

Create/update your `.env` file with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
SERVER_URL=http://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=gmail_imap_db
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# IMAP Configuration
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_TLS=true

# Frontend URL
FRONTEND_URL=http://localhost:3001
```

### 6. Build and Run

#### Development Mode
```bash
npm run dev
```
Server will start at: `http://localhost:3000`

#### Production Build
```bash
npm run build
npm start
```

### 8. Verify Installation

#### Check Health Endpoint
```bash
curl http://localhost:3000/health
```
Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development"
}
```

#### Test Database Connection
The application will automatically:
- Create database tables on first run
- Sync models with database

## Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm start           # Start production server
npm test           # Run tests (if configured)
```

## Project Structure

```
Imap_backend/
├── src/
│   ├── api/         # API routes and endpoints
│   ├── config/      # Configuration files
│   ├── controllers/ # Request handlers
│   ├── models/      # Database models
│   ├── services/    # Business logic
│   ├── middlewares/ # Express middlewares
│   └── utils/       # Utility functions
├── dist/           # Compiled JavaScript (after build)
├── .env           # Environment variables
└── package.json   # Dependencies and scripts
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify MySQL is running
   - Check database credentials in `.env`
   - Ensure database `gmail_imap_db` exists

2. **OAuth Authentication Failed**
   - Verify Google Client ID and Secret
   - Check redirect URI matches exactly
   - Ensure test users are added


3. **Port Already in Use**
   - Change PORT in `.env` file
   - Or kill process using port 3000

### Getting Help

Check the following for error details:
- Server console logs
- Browser developer tools (for frontend issues)
- MySQL error logs

## Next Steps

After successful setup:
1. The backend API will be available at `http://localhost:3000`
2. Use the API endpoints to authenticate and sync emails
3. Integrate with the frontend application

Your backend is now ready to handle Gmail IMAP operations with OAuth2 authentication!