import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is a barber
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "barber")
      .maybeSingle();

    if (!callerRole) {
      return new Response(JSON.stringify({ error: "Apenas barbeiros podem gerenciar barbeiros" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { action, email, password, full_name, phone, barber_user_id } = await req.json();

    if (action === "create") {
      // Create barber user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role: "barber", phone: phone || null },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Insert role
      await supabaseAdmin.from("user_roles").insert({ user_id: newUser.user.id, role: "barber" });

      // Update profile phone if provided
      if (phone) {
        await supabaseAdmin.from("profiles").update({ phone: phone.replace(/\D/g, "") }).eq("user_id", newUser.user.id);
      }

      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete") {
      if (!barber_user_id) {
        return new Response(JSON.stringify({ error: "barber_user_id é obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Prevent self-deletion
      if (barber_user_id === caller.id) {
        return new Response(JSON.stringify({ error: "Você não pode remover a si mesmo" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      await supabaseAdmin.from("user_roles").delete().eq("user_id", barber_user_id);
      await supabaseAdmin.auth.admin.deleteUser(barber_user_id);

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "list") {
      const { data: barberRoles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "barber");

      const barberIds = barberRoles?.map((r: any) => r.user_id) || [];

      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", barberIds);

      // Get emails from auth
      const barbers = [];
      for (const id of barberIds) {
        const { data: { user: u } } = await supabaseAdmin.auth.admin.getUserById(id);
        const profile = profiles?.find((p: any) => p.user_id === id);
        barbers.push({
          user_id: id,
          full_name: profile?.full_name || "",
          phone: profile?.phone || "",
          email: u?.email || "",
        });
      }

      return new Response(JSON.stringify({ barbers }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
