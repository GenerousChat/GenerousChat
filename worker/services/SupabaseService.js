const { createClient } = require("@supabase/supabase-js");
const config = require("../config");

class SupabaseService {
  constructor() {
    const { url, serviceKey, anonKey } = config.supabase;
    this.supabase = createClient(url, serviceKey || anonKey);
    this.keyType = serviceKey ? "service role" : "anon";
  }

  async fetchRecentMessages(limit = 50) {
    const { data, error } = await this.supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data.reverse();
  }

  async fetchAIAgents() {
    const { data, error } = await this.supabase
      .from("agents")
      .select("*")
      .order("name");

    if (error) throw error;
    return data;
  }

  setupRealtimeListeners(callbacks) {
    const channel = this.supabase
      .channel("db-changes")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
      }, callbacks.onMessageInsert)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "room_participants",
      }, callbacks.onParticipantJoined)
      .on("postgres_changes", {
        event: "DELETE",
        schema: "public",
        table: "room_participants",
      }, callbacks.onParticipantLeft);

    return channel;
  }
}

module.exports = new SupabaseService();