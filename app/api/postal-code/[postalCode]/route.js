import { NextResponse } from "next/server";

import { lookupPostalCode } from "@/lib/postal-code";

export const runtime = "nodejs";

export async function GET(_request, context) {
  try {
    const params = await context.params;
    const address = await lookupPostalCode(params?.postalCode);

    if (!address) {
      return NextResponse.json(
        {
          error: "postal_code_not_found",
          message: "CEP nao encontrado."
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ address });
  } catch (error) {
    return NextResponse.json(
      {
        error: error.code || "postal_code_lookup_failed",
        message: error.message || "Nao foi possivel consultar o CEP."
      },
      { status: error.status || 500 }
    );
  }
}
