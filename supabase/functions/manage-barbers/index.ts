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

    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const roles = callerRoles?.map((r: any) => r.role) || [];
    const isBarberOrAdmin = roles.includes("barber") || roles.includes("admin");

    if (!isBarberOrAdmin) {
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
      // Also include admin users who manage the shop
      const { data: barberRoles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .in("role", ["barber", "admin"]);

      const barberIds = barberRoles?.map((r: any) => r.user_id) || [];

      if (barberIds.length === 0) {
        return new Response(JSON.stringify({ barbers: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", barberIds);

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

    if (action === "stats") {
      if (!barber_user_id) {
        return new Response(JSON.stringify({ error: "barber_user_id é obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: appointments } = await supabaseAdmin
        .from("appointments")
        .select("client_id, price, status, payment_status")
        .eq("barber_id", barber_user_id);

      const completed = (appointments || []).filter((a: any) => a.status === "completed" || a.status === "scheduled");
      const totalClients = new Set(completed.map((a: any) => a.client_id)).size;
      const totalAppointments = completed.length;
      const totalRevenue = completed.filter((a: any) => a.payment_status === "paid").reduce((sum: number, a: any) => sum + Number(a.price || 0), 0);

      // Revenue per client
      const clientMap: Record<string, { count: number; revenue: number }> = {};
      for (const a of completed) {
        if (!clientMap[a.client_id]) clientMap[a.client_id] = { count: 0, revenue: 0 };
        clientMap[a.client_id].count++;
        if (a.payment_status === "paid") clientMap[a.client_id].revenue += Number(a.price || 0);
      }

      const clientIds = Object.keys(clientMap);
      let clientDetails: any[] = [];
      if (clientIds.length > 0) {
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", clientIds);
        clientDetails = clientIds.map((cid) => {
          const profile = profiles?.find((p: any) => p.user_id === cid);
          return {
            client_id: cid,
            name: profile?.full_name || "Cliente",
            appointments: clientMap[cid].count,
            revenue: clientMap[cid].revenue,
          };
        });
      }

      return new Response(JSON.stringify({ totalClients, totalAppointments, totalRevenue, clients: clientDetails }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
