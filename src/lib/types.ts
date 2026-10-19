export type SportEntry = { sport: string; level: Level; intent: 'train' | 'try' };

export type Level = 'new' | '1-3' | '3+' | 'amateur' | 'pro';

export type WeightClass =
  | 'flyweight'
  | 'bantamweight'
  | 'featherweight'
  | 'lightweight'
  | 'welterweight'
  | 'middleweight'
  | 'light_heavyweight'
  | 'heavyweight';

export type FighterCard = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_path: string | null;
  bio: string | null;
  area: string | null;
  weight_class: WeightClass | null;
  stance: string | null;
  pronouns: string | null;
  goals: string[];
  gym_name: string | null;
  gym_confirmed: boolean;
  distance_band: string | null;
  sports: SportEntry[];
  friend_status: 'friends' | 'sent' | 'received' | null;
};

export type FadeStatus = 'pending' | 'accepted' | 'on' | 'declined' | 'cancelled' | 'expired' | 'done';

export type FadeSummary = {
  id: string;
  status: FadeStatus;
  i_am: 'sender' | 'receiver';
  sport_name: string;
  intensity: string;
  chosen_time: string | null;
  time_options: string[];
  venue_name: string;
  updated_at: string;
  other: FighterCard | null;
};

export type FadeDetails = {
  id: string;
  status: FadeStatus;
  i_am: 'sender' | 'receiver';
  sport: string;
  sport_name: string;
  intent: string;
  intensity: string;
  rules: string;
  rounds: number;
  round_minutes: number;
  gear: string[];
  time_options: string[];
  chosen_time: string | null;
  note: string | null;
  note_flagged: boolean;
  venue_name: string;
  venue_city: string;
  venue_address: string | null;
  receiver_confirmed: boolean;
  sender_confirmed: boolean;
  expires_at: string;
  created_at: string;
  my_feedback: boolean;
  other: FighterCard | null;
};

export type Notification = {
  id: string;
  type: string;
  actor_id: string | null;
  fade_id: string | null;
  conversation_id: string | null;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender: string;
  body: string;
  flagged: boolean;
  read_at: string | null;
  created_at: string;
};

export type ConversationRow = {
  conversation_id: string;
  last_message_at: string;
  last_body: string | null;
  last_sender: string | null;
  unread: number;
  can_send: boolean;
  card: FighterCard | null;
};
