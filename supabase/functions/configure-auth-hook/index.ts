import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get the project reference from the URL
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

    if (!projectRef) {
      throw new Error("Could not extract project reference from SUPABASE_URL");
    }

    // Configure the auth hook using Supabase Management API
    const managementApiUrl = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;

    // First, get current auth config
    const getCurrentConfig = await fetch(managementApiUrl, {
      headers: {
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!getCurrentConfig.ok) {
      const errorText = await getCurrentConfig.text();
      console.error("Failed to get current auth config:", errorText);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: "Could not access Supabase Management API. This might require dashboard configuration.",
          message: "Please configure the hook manually in Supabase Dashboard > Authentication > Hooks",
          instructions: [
            "1. Go to your Supabase Dashboard",
            "2. Navigate to Authentication > Hooks",
            "3. Find 'Custom Access Token' section",
            "4. Toggle it to 'Enabled'",
            "5. Select 'public.custom_access_token_hook' from dropdown",
            "6. Save the configuration"
          ]
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const currentConfig = await getCurrentConfig.json();

    // Update the config with the custom access token hook
    const updatedConfig = {
      ...currentConfig,
      hook_custom_access_token_enabled: true,
      hook_custom_access_token_uri: "pg-functions://postgres/public/custom_access_token_hook",
    };

    const updateResponse = await fetch(managementApiUrl, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedConfig),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update auth config: ${errorText}`);
    }

    const result = await updateResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Custom Access Token Hook has been enabled successfully!",
        config: {
          hook_enabled: result.hook_custom_access_token_enabled,
          hook_uri: result.hook_custom_access_token_uri,
        },
        next_steps: [
          "Sign out of your application",
          "Sign back in to generate a new JWT token with custom claims",
          "Test the hook using the 'Test Hook Status' button in Settings > Security"
        ]
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Error configuring auth hook:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        fallback_instructions: [
          "If automatic configuration failed, please configure manually:",
          "1. Go to Supabase Dashboard > Authentication > Hooks",
          "2. Enable 'Custom Access Token' hook",
          "3. Select function: public.custom_access_token_hook",
          "4. Save and sign out/in to test"
        ]
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});