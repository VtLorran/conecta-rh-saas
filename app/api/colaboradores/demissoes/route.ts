import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";

async function getAuthUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) return null;

    const decoded = jwt.verify(token, secret) as {
      userID: string;
      role: string;
    };
    return decoded;
  } catch {
    return null;
  }
}

// GET: Lista os registros de demissões (Restrito a ADMIN/DP/RH).
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Não autenticado" },
        { status: 401 },
      );
    }

    if (authUser.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Apenas administradores (RH/DP) podem ver as demissões.",
        },
        { status: 403 },
      );
    }

    const terminations = await prisma.termination.findMany({
      orderBy: { terminatedAt: "desc" },
      select: {
        id: true,
        employeeName: true,
        sector: true,
        justification: true,
        dismissedByName: true,
        terminatedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: terminations });
  } catch (error) {
    console.error("Erro na rota GET /api/colaboradores/demissoes:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno ao listar demissões." },
      { status: 500 },
    );
  }
}
