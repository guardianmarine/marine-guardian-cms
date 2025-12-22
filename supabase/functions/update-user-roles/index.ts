import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdateUserRolesRequest {
  user_id: string;
  roles: ("admin" | "inventory" | "sales" | "finance" | "viewer")[];
  reseed_permissions?: boolean; // If true, reseed permissions from primary role
  custom_permissions?: {
    module_name: string;
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  }[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify the caller is authenticated and is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if caller is admin
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    
    const isAdmin = callerRoles?.some(r => r.role === "admin");
    if (!isAdmin) {
      console.error("Caller is not admin:", caller.id);
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body: UpdateUserRolesRequest = await req.json();
    const { user_id, roles, reseed_permissions = true, custom_permissions } = body;

    if (!user_id || !roles || !Array.isArray(roles) || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Missing required fields: user_id, roles (array)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate roles
    const validRoles = ["admin", "inventory", "sales", "finance", "viewer"];
    for (const role of roles) {
      if (!validRoles.includes(role)) {
        return new Response(JSON.stringify({ error: `Invalid role: ${role}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log("Updating roles for user:", user_id, "to:", roles);

    // Check if target user exists
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("id", user_id)
      .single();
    
    if (profileError || !profile) {
      console.error("User profile not found:", user_id);
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete existing roles
    const { error: deleteRolesError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", user_id);

    if (deleteRolesError) {
      console.error("Error deleting existing roles:", deleteRolesError);
      return new Response(JSON.stringify({ error: "Failed to update roles" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert new roles
    const roleInserts = roles.map(role => ({
      user_id,
      role,
      granted_by: caller.id,
    }));

    const { error: insertRolesError } = await supabaseAdmin
      .from("user_roles")
      .insert(roleInserts);

    if (insertRolesError) {
      console.error("Error inserting new roles:", insertRolesError);
      return new Response(JSON.stringify({ error: "Failed to assign new roles" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reseed permissions based on primary role (highest privilege)
    if (reseed_permissions) {
      // Determine primary role (admin > finance > sales > inventory > viewer)
      const rolePriority = ["admin", "finance", "sales", "inventory", "viewer"];
      const primaryRole = rolePriority.find(r => roles.includes(r as any)) || roles[0];

      const { error: seedError } = await supabaseAdmin.rpc("seed_role_permissions", {
        p_user_id: user_id,
        p_role_name: primaryRole,
      });

      if (seedError) {
        console.error("Error seeding permissions:", seedError);
        // Continue anyway
      }
    }

    // Apply custom permission overrides if provided
    if (custom_permissions && custom_permissions.length > 0) {
      for (const perm of custom_permissions) {
        const { error: upsertError } = await supabaseAdmin
          .from("user_permissions")
          .upsert({
            user_id,
            module_name: perm.module_name,
            can_view: perm.can_view,
            can_create: perm.can_create,
            can_edit: perm.can_edit,
            can_delete: perm.can_delete,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,module_name" });

        if (upsertError) {
          console.error("Error upserting permission:", upsertError);
        }
      }
    }

    // Fetch updated roles and permissions
    const { data: updatedRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user_id);

    const { data: updatedPerms } = await supabaseAdmin
      .from("user_permissions")
      .select("module_name, can_view, can_create, can_edit, can_delete")
      .eq("user_id", user_id);

    console.log("Roles updated successfully for user:", user_id);

    return new Response(
      JSON.stringify({
        success: true,
        user_id,
        roles: updatedRoles?.map(r => r.role) || [],
        permissions: updatedPerms || [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
