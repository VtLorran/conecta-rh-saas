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
        { success: false, message: "Apenas hosts (RH/Admin) podem excluir comunicações." },
        { status: 403 },
      );
    }

    const { id } = await params;

    await prisma.muralPost.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Comunicação removida do mural.",
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json(
        { success: false, message: "Comunicação não encontrada ou já expirada." },
        { status: 404 },
      );
    }
    console.error("Erro na rota DELETE /api/mural/[id]:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno ao excluir comunicação." },
      { status: 500 },
    );
  }
}
