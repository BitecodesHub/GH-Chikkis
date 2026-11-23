import { getSessionContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { createCustomer, CustomerError } from "@/lib/customers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const context = await getSessionContext();
  if (!context) {
    return Response.json({ error: "Sign in again." }, { status: 401 });
  }
  if (
    !hasPermission(context.user, "customers.manage") &&
    !hasPermission(context.user, "orders.manage")
  ) {
    return Response.json(
      { error: "You do not have access to create customers." },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      phone?: string;
      email?: string;
    };

    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const email = String(body.email ?? "").trim();

    if (!name) {
      return Response.json({ error: "Customer name is required." }, { status: 400 });
    }
    if (!phone) {
      return Response.json({ error: "Phone number is required." }, { status: 400 });
    }

    const customer = await createCustomer(
      { name, phone, email },
      { id: context.user.id, name: context.user.name, email: context.user.email },
    );

    return Response.json({
      ok: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        phoneOriginal: customer.phoneOriginal,
        email: customer.email,
      },
    });
  } catch (error) {
    if (error instanceof CustomerError) {
      return Response.json(
        { error: error.message, existingId: error.existingId },
        { status: 400 },
      );
    }
    return Response.json({ error: "Could not create customer." }, { status: 500 });
  }
}
