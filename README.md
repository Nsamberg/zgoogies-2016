# ZGoogies - Football Tournament Prediction Game

A comprehensive web application for managing football tournament prediction competitions (FIFA World Cup, UEFA Euro, etc.).

## Project Structure

```
2016app/
├── backend/                    # Python Flask backend
│   ├── app/
│   │   ├── models/            # Database models
│   │   ├── routes/            # API endpoints
│   │   ├── services/          # Business logic
│   │   └── utils/             # Helper functions
│   ├── migrations/            # Database migrations
│   ├── tests/                 # Backend tests
│   ├── config.py              # Configuration
│   ├── run.py                 # Application entry point
│   └── requirements.txt       # Python dependencies
│
├── frontend/                   # React TypeScript frontend
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API services
│   │   ├── stores/            # State management (Zustand)
│   │   ├── types/             # TypeScript types
│   │   ├── hooks/             # Custom React hooks
│   │   ├── utils/             # Utility functions
│   │   ├── assets/            # Static assets
│   │   ├── styles/            # CSS styles
│   │   ├── App.tsx            # Main app component
│   │   └── main.tsx           # Entry point
│   ├── public/                # Public assets
│   ├── package.json           # Node dependencies
│   ├── tsconfig.json          # TypeScript config
│   └── vite.config.ts         # Vite config
│
├── config/                     # Configuration files
├── FUNCTIONALITY_DOCUMENTATION.md  # Detailed specifications
└── README.md                   # This file
```

## Technology Stack

### Backend
- **Framework**: Flask (Python)
- **Database**: SQLite
- **ORM**: SQLAlchemy
- **Authentication**: Flask-Login
- **Email**: Flask-Mail
- **Migrations**: Flask-Migrate

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **Routing**: React Router
- **HTTP Client**: Axios
- **Charts**: Recharts
- **PWA**: vite-plugin-pwa

## Setup Instructions

### Prerequisites
- Python 3.9+
- Node.js 18+
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
```

3. Activate virtual environment:
- Windows: `venv\Scripts\activate`
- Linux/Mac: `source venv/bin/activate`

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

Edit `.env` with your settings (email, secret key, etc.)

6. Initialize database:
```bash
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

7. Run the development server:
```bash
python run.py
```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

## Key Features

### User Management
- Self-registration with auto-generated passwords
- Role-based access (Player, Cachier, Admin)
- Payment tracking
- Timezone support

### Prediction System
- Make/edit predictions up to 2 hours before games
- Prediction history tracking
- Automatic point calculation

### Scoring System
- 7-point scoring system (1-7 per game)
- Double points for special games
- Tournament winner bonus (15 points)

### Rankings
- Overall and round-specific rankings
- Real-time updates after each game
- Historical ranking tracking with charts

### Admin Features
- Payment recording
- Score entry with automatic point calculation
- Tournament winner selection
- News publication
- Database management

### Analytics
- Game prediction statistics
- Winner prediction distribution
- Player comparison tools

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/me` - Get current user

### Games
- `GET /api/games/upcoming` - Get upcoming games
- `GET /api/games/closed` - Get closed games
- `GET /api/games/<id>` - Get game details

### Predictions
- `GET /api/predictions/` - Get user predictions
- `POST /api/predictions/` - Create/update prediction
- `GET /api/predictions/<game_id>` - Get all predictions for game

### Rankings
- `GET /api/rankings/overall` - Get overall ranking
- `GET /api/rankings/round/<id>` - Get round ranking
- `GET /api/rankings/history/<user_id>` - Get ranking history
- `GET /api/rankings/rounds` - Get competition rounds

### Players
- `GET /api/players/` - Get all players
- `GET /api/players/<id>` - Get player details
- `GET /api/players/winner-predictions` - Get winner predictions

### News
- `GET /api/news/` - Get all news
- `GET /api/news/<id>` - Get news article
- `POST /api/news/` - Create news (cachier/admin)
- `PUT /api/news/<id>` - Update news (cachier/admin)
- `DELETE /api/news/<id>` - Delete news (admin)

### Admin
- `POST /api/admin/payment/<user_id>` - Record payment
- `POST /api/admin/score/<game_id>` - Enter game score
- `POST /api/admin/tournament-winner` - Set tournament winner
- `GET /api/admin/users` - Get users with payment status

## Database Schema

### Main Tables
- **users** - User accounts and authentication
- **teams** - Tournament teams
- **locations** - Game locations/stadiums
- **games** - Match schedule and results
- **predictions** - User predictions
- **prediction_history** - Audit trail of predictions
- **rankings** - Current rankings (per round and overall)
- **ranking_history** - Historical snapshots
- **competition_rounds** - Tournament phases
- **news** - News articles
- **access_logs** - User activity tracking

## Development Guidelines

### Backend
- Follow Flask best practices
- Use blueprint pattern for routes
- Keep business logic in services
- Write database queries efficiently
- Handle errors gracefully

### Frontend
- Use TypeScript for type safety
- Follow React hooks best practices
- Keep components small and focused
- Use Zustand for global state
- Implement responsive design

## Security Features
- Password hashing (Werkzeug)
- Session-based authentication
- CORS configuration
- HTTP-only cookies
- Input validation
- SQL injection prevention (SQLAlchemy ORM)

## Testing

### Backend Tests
```bash
cd backend
python -m pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Deployment

### Production Considerations
- Set `FLASK_ENV=production` in backend
- Use a production-grade WSGI server (gunicorn)
- Configure proper database (PostgreSQL recommended)
- Set up SSL/HTTPS
- Use environment variables for secrets
- Enable session security settings
- Build frontend with `npm run build`
- Serve frontend through CDN or static hosting

## License
MIT License

## Support
For issues and feature requests, please contact the development team.
