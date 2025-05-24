import { serve } from "https://deno.land/std@0.131.0/http/server.ts";

// Supabase এর ডাটাবেস অ্যাক্সেস ও ইমেইল সাপোর্টের জন্য
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // ৬ ডিজিটের OTP
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Only POST requests allowed", { status: 405 });
    }
    
    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), { status: 400 });
    }

    // OTP Generate & Save in Supabase DB table 'otp_codes' (তুমি আগে টেবিল বানাতে হবে)
    const otp = generateOTP();

    // OTP Save করা হচ্ছে Supabase DB তে (table name: otp_codes)
    const { error } = await supabase
      .from("otp_codes")
      .upsert({ email, otp, created_at: new Date().toISOString() }, { onConflict: 'email' });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    // OTP ইমেইল পাঠানো (Supabase SMTP সেটআপ থাকতে হবে)
    const { error: mailError } = await supabase
      .functions
      .invoke('send-email', {
        body: JSON.stringify({
          to: email,
          subject: "Your OTP Code",
          text: `Your OTP code is: ${otp}`
        })
      });

    if (mailError) {
      return new Response(JSON.stringify({ error: mailError.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ message: "OTP sent successfully" }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
