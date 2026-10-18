// Fivefold settings. Change these if you ever move to another Supabase project.
// The anon key is designed to be public (it only works within the rules in supabase-setup.sql).
// NEVER put the service_role key in this file or anywhere in the website.
window.FIVEFOLD = {
  supabaseUrl: 'https://rkrywbtpefdtixstkaxs.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrcnl3YnRwZWZkdGl4c3RrYXhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMzc4MDEsImV4cCI6MjEwNzkxMzgwMX0.nLp7DKCfIjYdw15u1TdFxpo-fyxx3uQbuCzc2AoX2x4',

  // Players sign in with a username. Supabase needs an email behind the scenes, so the
  // username becomes <username>@<this domain>. No emails are ever sent to it.
  loginDomain: 'players.fivefold.app',

  // The rank ladder. "wins" is how many ranked online wins it takes to reach each rank.
  ranks: [
    { key: 'bastard',  name: 'Bastard',          wins: 0 },
    { key: 'civilian', name: 'Civilian',         wins: 3 },
    { key: 'knight',   name: 'Knight',           wins: 10 },
    { key: 'hand',     name: 'Hand of the King', wins: 25 },
    { key: 'king',     name: 'King',             wins: 50 }
  ]
};
