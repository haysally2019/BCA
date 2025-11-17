import supabase from "../lib/supabaseService"; // ✅ Correct relative path

export async function fetchData(table: string) {
  try {
    const { data, error } = await supabase.from(table).select("*");

    if (error) {
      console.error(`[dataStore] Error fetching ${table}:`, error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("[dataStore] Unexpected error:", err);
    return null;
  }
}

export async function fetchByUserId(table: string, userId: string) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error(`[dataStore] Error fetching ${table}:`, error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("[dataStore] Unexpected error:", err);
    return null;
  }
}

export default {
  fetchData,
  fetchByUserId,
};