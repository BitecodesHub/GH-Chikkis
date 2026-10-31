import { getSessionContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { searchCustomers } from "@/lib/customers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await getSessionContext();
  if (!context) {
    return Response.json({ error: "Sign in again." }, { status: 401 });
  }
  if (
    !hasPermission(context.user, "customers.view") &&
    !hasPermission(context.user, "orders.manage")
  ) {
    return Response.json({ error: "You do not have access to customers." }, { status: 403 });
  }

  const query = new URL(request.url).searchParams.get("q") ?? "";
  if (query.trim().length < 2) {
    return Response.json({ customers: [] });
  }

  const customers = await searchCustomers(query, 8);
  return Response.json({
    customers: customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      phoneOriginal: customer.phoneOriginal,
      email: customer.email ?? "",
      company: customer.company ?? "",
      archived: customer.archived,
    })),
  });
}
