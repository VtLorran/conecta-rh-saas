import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Não autenticado" },
        { status: 401 },
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Apenas hosts (RH/Admin) podem excluir eventos." },
        { status: 403 },
      );
    }

    const { id } = await params;

    await prisma.corporateEvent.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Evento removido do calendário.",
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json(
        { success: false, message: "Evento não encontrado." },
        { status: 404 },
      );
    }
    console.error("Erro na rota DELETE /api/calendario/[id]:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno ao excluir evento." },
      { status: 500 },
    );
  }
}
