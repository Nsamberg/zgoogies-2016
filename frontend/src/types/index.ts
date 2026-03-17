// User types
export interface User {
  id: number
  username: string
  first_name: string
  surname: string
  email: string
  timezone: string
  is_admin: boolean
  is_cachier: boolean
  has_paid: boolean
  tournament_winner_id: number | null
}

// Team types
export interface Team {
  id: number
  name: string
  code: string
  flag_url?: string
  score?: number | null  // present on team objects returned by closed games endpoint
}

// Game types
export interface Game {
  id: number
  team_a: Team
  team_b: Team
  game_date: string
  location: string
  stage?: string  // Tournament Stage (Group Stage, Quarter Final, etc.)
  group?: string
  competition_round: {  // Competition Round for ZGoogies prediction competition
    id: number
    name: string
    round_number: number
  }
  team_a_score?: number | null
  team_b_score?: number | null
  is_scored: boolean
  is_double_points: boolean  // True if in last Competition Round
  is_prediction_closed: boolean
  prediction_deadline: string
}

// Prediction types
export interface Prediction {
  id: number
  game_id: number
  team_a_score: number
  team_b_score: number
  points?: number | null
}

// Ranking types
export interface Ranking {
  rank: number
  user: {
    id: number
    username: string
    first_name: string
    surname: string
  }
  total_points: number
  previous_rank?: number | null
}

export interface RankingHistory {
  rank: number
  total_points: number
  game_id: number
  created_at: string
}

// News types
export interface News {
  id: number
  title: string
  content: string
  image_url?: string | null
  author: {
    username: string
    first_name: string
    surname: string
  }
  created_at: string
  updated_at?: string
}

// Competition Round types
// Competition Rounds are admin-defined rounds for the ZGoogies prediction competition
// (e.g., Round 1, Round 2, Round 3) - distinct from Tournament Stages
export interface CompetitionRound {
  id: number
  name: string  // e.g., "Round 1", "Round 2"
  round_number: number  // 1, 2, 3, etc.
  start_date?: string | null
  end_date?: string | null
  is_current: boolean
  game_count?: number
}
