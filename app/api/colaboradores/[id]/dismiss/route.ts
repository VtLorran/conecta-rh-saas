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
      name?: string;
      cpf?: string;
    };
    return decoded;
  } catch {
    return null;
  }
}

// POST: Demite um colaborador (Restrito a ADMIN/DP/RH).
// Cria um registro leve na tabela "terminations" e apaga o usuário + todos os seus dados.
export async function POST(
  request: Request,
  { params }: { params: Promise<any> },
) {
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
          message: "Apenas administradores (RH/DP) podem demitir colaboradores.",
        },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const justification: string = (body?.justification || "").trim();

    if (!justification) {
      return NextResponse.json(
        { success: false, message: "A justificativa é obrigatória." },
        { status: 400 },
      );
    }

    // Busca o colaborador alvo (com o setor para o snapshot do registro)
    const target = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        cpf: true,
        jobPosition: {
          select: { department: { select: { name: true } } },
        },
      },
    });

    if (!target) {
      return NextResponse.json(
        { success: false, message: "Colaborador não encontrado." },
        { status: 404 },
      );
    }

    if (target.id === authUser.userID) {
      return NextResponse.json(
        { success: false, message: "Você não pode demitir a si mesmo." },
        { status: 400 },
      );
    }

    const sector = target.jobPosition?.department?.name || "Não atribuído";

    // Nome de quem demitiu (snapshot). Busca o nome real do JWT se disponível.
    let dismissedByName: string | null = null;
    if (authUser.name) {
      dismissedByName = authUser.name;
    } else {
      const dismisser = await prisma.user.findUnique({
        where: { id: authUser.userID },
        select: { name: true },
      });
      dismissedByName = dismisser?.name || null;
    }

    // Transação: registro + limpeza de dados pessoais + remoção do usuário.
    await prisma.$transaction(async (tx) => {
      // 1. Registro leve da demissão (log append-only)
      await tx.termination.create({
        data: {
          employeeName: target.name,
          sector,
          justification,
          dismissedByName,
        },
      });

      // 2. Remove a admissão do CPF (contém dados pessoais e documentos em base64)
      await tx.admission.deleteMany({
        where: { candidateCpf: target.cpf },
      });

      // 3. Remove o usuário. O cascade apaga férias, folgas, escalas,
      //    ponto (+pausas), requisições de documentos e notificações.
      await tx.user.delete({ where: { id: target.id } });
    });

    return NextResponse.json({
      success: true,
      message: `Colaborador ${target.name} demitido com sucesso.`,
    });
  } catch (error: any) {
    console.error("Erro na rota POST /api/colaboradores/[id]/dismiss:", error);

    // Violação de FK (Restrict): usuário é responsável por registros admissionais/templates.
    if (error?.code === "P2003") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Este usuário é responsável por admissões ou templates vinculados. Transfira a responsabilidade antes de demiti-lo.",
        },
        { status: 409 },
      );
    }

    if (error?.code === "P2025") {
      return NextResponse.json(
        { success: false, message: "Colaborador não encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Erro interno ao processar a demissão." },
      { status: 500 },
    );
  }
}
