import { log } from "./logger";
import { supabase } from "./supabase";

export async function signUp(email: string, password: string, fullName: string) {
  log("info", "signUp called", { email });
  try {
    const res = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (res.error) {
      log("warn", "signUp rejected", { message: res.error.message });
    } else {
      log("info", "signUp success", {
        userId: res.data.user?.id ?? null,
        needsConfirmation: !res.data.session,
      });
    }
    return res;
  } catch (err) {
    log("error", "signUp failed", { message: String(err) });
    throw err;
  }
}

export async function signIn(email: string, password: string) {
  log("info", "signIn called", { email });
  try {
    const res = await supabase.auth.signInWithPassword({ email, password });
    if (res.error) {
      log("warn", "signIn rejected", { message: res.error.message });
    } else {
      log("info", "signIn success", { userId: res.data.user?.id ?? null });
    }
    return res;
  } catch (err) {
    log("error", "signIn failed", { message: String(err) });
    throw err;
  }
}

export async function signOut() {
  log("info", "signOut called");
  try {
    const res = await supabase.auth.signOut();
    if (res.error) {
      log("warn", "signOut rejected", { message: res.error.message });
    } else {
      log("info", "signOut success");
    }
    return res;
  } catch (err) {
    log("error", "signOut failed", { message: String(err) });
    throw err;
  }
}
