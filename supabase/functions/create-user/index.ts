
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        console.log("Edge Function 'create-user' hit!");

        // Check Authorization manually just for logs
        const authHeader = req.headers.get('Authorization');
        console.log("Auth Header present:", !!authHeader);

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const body = await req.json();
        console.log("Payload received for:", body.email);
        const { email, password, id, userData } = body;

        // 1. Check if user exists
        // Note: getByEmail is not exposed in admin api directly easily without list, 
        // but createUser throws if exists.

        // Create auth user
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: userData
        });

        if (error) {
            console.error("Create User Error:", error);
            // If user exists, we might want to return 200 but say "exists"
            // or try to update? 
            // For migration, if exists, we assume we just need to link.
            // But we can't link if we don't know the ID.
            // Actually, we can fetch the user by email to get the ID.
            if (error.message.includes("already registered")) {
                console.log("User exists, fetching ID...");
                // We can't use listUsers with email filter efficiently, but expected 1.
                // Or just return error and handle in client.
                return new Response(JSON.stringify({ error: error.message, exists: true }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400
                });
            }
            throw error;
        }

        console.log("User created:", data.user.id);

        // 2. Update the 'workers' table with the new Auth ID
        // The previous implementation did not do this?! 
        // Wait, the Trigger does it?
        // In step 360, I didn't see the trigger code. 
        // Usually we want to synchronize.
        // IF the user provided 'id' (the OLD id), we might want to update the worker record that HAS that old ID
        // to have the NEW Auth ID?
        // BUT 'id' in workers is the Primary Key. Changing it breaks FKs.
        // CRITICAL: We want the Auth User ID to MATCH the Worker ID.
        // supabase.auth.admin.createUser ALLOWS specifying 'id'!

        // LET'S TRY TO FORCE THE ID!
        if (id) {
            console.log("Attempting to create user with EXISTING ID:", id);
            const { data: dataWithId, error: errorWithId } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: userData,
                id: id // FORCE ID
            });

            if (errorWithId) {
                console.error("Failed with forced ID:", errorWithId);
                throw errorWithId;
            }
            console.log("User created with forced ID:", dataWithId.user.id);

            return new Response(JSON.stringify(dataWithId), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error("Catch Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
