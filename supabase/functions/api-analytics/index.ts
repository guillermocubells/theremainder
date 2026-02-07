import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate admin authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { data: roleCheck } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const url = new URL(req.url);
    const path = url.pathname.replace("/api-analytics", "");
    const period = url.searchParams.get("period") || "30d"; // 7d, 30d, 90d, 365d

    // Calculate date range
    const days = parseInt(period.replace("d", ""));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString();

    // Use service role for analytics queries
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // GET /dashboard - Main dashboard metrics
    if (req.method === "GET" && (path === "" || path === "/" || path === "/dashboard")) {
      // Total orders and revenue
      const { data: orders } = await adminSupabase
        .from("orders")
        .select("id, total_amount, status, created_at")
        .gte("created_at", startDateStr);

      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, o) => sum + (o.status !== "cancelled" ? Number(o.total_amount) : 0), 0) || 0;
      const paidOrders = orders?.filter(o => o.status === "paid" || o.status === "shipped" || o.status === "delivered").length || 0;

      // Total users
      const { count: totalUsers } = await adminSupabase
        .from("profiles")
        .select("id", { count: "exact", head: true });

      // New users in period
      const { count: newUsers } = await adminSupabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startDateStr);

      // Total plants
      const { count: totalPlants } = await adminSupabase
        .from("plants")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);

      // Out of stock plants
      const { count: outOfStock } = await adminSupabase
        .from("plants")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .eq("stock_qty", 0);

      // Stock notifications (demand indicator)
      const { count: stockNotifications } = await adminSupabase
        .from("stock_notifications")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startDateStr);

      // Wishlist items (interest indicator)
      const { count: wishlistItems } = await adminSupabase
        .from("wishlist_items")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startDateStr);

      return new Response(JSON.stringify({
        success: true,
        period,
        data: {
          orders: {
            total: totalOrders,
            paid: paidOrders,
            conversion_rate: totalOrders > 0 ? Math.round((paidOrders / totalOrders) * 100) : 0,
          },
          revenue: {
            total: totalRevenue,
            average_order: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
          },
          users: {
            total: totalUsers || 0,
            new_in_period: newUsers || 0,
          },
          catalog: {
            total_plants: totalPlants || 0,
            out_of_stock: outOfStock || 0,
          },
          engagement: {
            stock_notifications: stockNotifications || 0,
            wishlist_additions: wishlistItems || 0,
          },
        },
      }), { headers: corsHeaders });
    }

    // GET /top-products - Best selling products
    if (req.method === "GET" && path === "/top-products") {
      const limit = parseInt(url.searchParams.get("limit") || "10");

      const { data: orderItems } = await adminSupabase
        .from("order_items")
        .select(`
          product_id, product_name, product_image, quantity, unit_price,
          orders!inner (status, created_at)
        `)
        .gte("orders.created_at", startDateStr)
        .neq("orders.status", "cancelled");

      // Aggregate by product
      const productStats: Record<string, {
        product_id: string;
        product_name: string;
        product_image: string | null;
        total_quantity: number;
        total_revenue: number;
        order_count: number;
      }> = {};

      orderItems?.forEach(item => {
        if (!productStats[item.product_id]) {
          productStats[item.product_id] = {
            product_id: item.product_id,
            product_name: item.product_name,
            product_image: item.product_image,
            total_quantity: 0,
            total_revenue: 0,
            order_count: 0,
          };
        }
        productStats[item.product_id].total_quantity += item.quantity;
        productStats[item.product_id].total_revenue += item.quantity * Number(item.unit_price);
        productStats[item.product_id].order_count += 1;
      });

      const topProducts = Object.values(productStats)
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, limit);

      return new Response(JSON.stringify({
        success: true,
        period,
        data: topProducts,
      }), { headers: corsHeaders });
    }

    // GET /orders-by-status - Orders breakdown by status
    if (req.method === "GET" && path === "/orders-by-status") {
      const { data: orders } = await adminSupabase
        .from("orders")
        .select("status")
        .gte("created_at", startDateStr);

      const statusCounts: Record<string, number> = {
        pending: 0,
        paid: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
      };

      orders?.forEach(o => {
        if (statusCounts[o.status] !== undefined) {
          statusCounts[o.status]++;
        }
      });

      return new Response(JSON.stringify({
        success: true,
        period,
        data: statusCounts,
      }), { headers: corsHeaders });
    }

    // GET /shipping-zones-stats - Orders by shipping zone
    if (req.method === "GET" && path === "/shipping-zones-stats") {
      const { data: orders } = await adminSupabase
        .from("orders")
        .select("shipping_address, total_amount")
        .gte("created_at", startDateStr)
        .neq("status", "cancelled");

      const zoneStats: Record<string, { orders: number; revenue: number }> = {};

      orders?.forEach(o => {
        const address = o.shipping_address as { country?: string };
        const country = address?.country || "Desconocido";
        if (!zoneStats[country]) {
          zoneStats[country] = { orders: 0, revenue: 0 };
        }
        zoneStats[country].orders++;
        zoneStats[country].revenue += Number(o.total_amount);
      });

      const sortedZones = Object.entries(zoneStats)
        .map(([country, stats]) => ({ country, ...stats }))
        .sort((a, b) => b.revenue - a.revenue);

      return new Response(JSON.stringify({
        success: true,
        period,
        data: sortedZones,
      }), { headers: corsHeaders });
    }

    // GET /daily-revenue - Revenue over time
    if (req.method === "GET" && path === "/daily-revenue") {
      const { data: orders } = await adminSupabase
        .from("orders")
        .select("total_amount, created_at")
        .gte("created_at", startDateStr)
        .neq("status", "cancelled")
        .order("created_at", { ascending: true });

      const dailyRevenue: Record<string, number> = {};

      orders?.forEach(o => {
        const date = new Date(o.created_at).toISOString().split("T")[0];
        if (!dailyRevenue[date]) {
          dailyRevenue[date] = 0;
        }
        dailyRevenue[date] += Number(o.total_amount);
      });

      const data = Object.entries(dailyRevenue)
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return new Response(JSON.stringify({
        success: true,
        period,
        data,
      }), { headers: corsHeaders });
    }

    // 404 for unknown routes
    return new Response(JSON.stringify({
      success: false,
      error: "Endpoint not found",
      available_endpoints: [
        "GET /dashboard - Main metrics",
        "GET /top-products - Best selling products",
        "GET /orders-by-status - Orders by status",
        "GET /shipping-zones-stats - Orders by shipping zone",
        "GET /daily-revenue - Revenue over time",
      ],
    }), { status: 404, headers: corsHeaders });

  } catch (error: unknown) {
    console.error("Analytics API Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({
      success: false,
      error: message,
    }), { status: 500, headers: corsHeaders });
  }
});
