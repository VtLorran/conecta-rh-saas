import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { cleanupExpiredMuralPosts, MURAL_PRIORITIES, type MuralPriority } from "@/lib/mural";

export const dynamic = "force-dynamic";

const MAX_DURATION_MINUTES = 365 * 24 * 60; // 1 ano

export async function GET(request: NextRequest) {
  try {
    // Exclui fisicamente do banco qualquer comunicação expirada antes de listar
    await cleanupExpiredMuralPosts();

    const searchParams = request.nextUrl.searchParams;
    const isAdmissionView = searchParams.get("admission") === "true";
    const admissionId = searchParams.get("admissionId");

    if (isAdmissionView && admissionId) {
      const admission = await prisma.admission.findUnique({
        where: { id: admissionId },
        select: { id: true, status: true },
      });

      if (!admission || admission.status === "REJECTED") {
        return NextResponse.json(
          { success: false, message: "Convite de admissão inválido." },
          { status: 404 },
        );
      }

      const posts = await prisma.muralPost.findMany({
        where: { showInAdmission: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          content: true,
          priority: true,
          durationMinutes: true,
          expiresAt: true,
          authorName: true,
          createdAt: true,
        },
      });

      return NextResponse.json({ success: true, data: posts });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Não autenticado" },
        { status: 401 },
      );
    }

    const posts = await prisma.muralPost.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        priority: true,
        durationMinutes: true,
        expiresAt: true,
        showInAdmission: true,
        authorId: true,
        authorName: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: posts });
  } catch (error) {
    console.error("Erro na rota GET /api/mural:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno ao carregar mural." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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
        { success: false, message: "Apenas hosts (RH/Admin) podem criar comunicações no mural." },
        { status: 403 },
      );
    }

    await cleanupExpiredMuralPosts();

    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const durationMinutes = Number(body.durationMinutes);
    const rawPriority = typeof body.priority === "string" ? body.priority.toUpperCase() : "NORMAL";
    const priority: MuralPriority = MURAL_PRIORITIES.includes(rawPriority as MuralPriority)
      ? (rawPriority as MuralPriority)
      : "NORMAL";
    const showInAdmission = typeof body.showInAdmission === "boolean" ? body.showInAdmission : true;

    if (!title || title.length > 140) {
      return NextResponse.json(
        { success: false, message: "Informe um título válido (até 140 caracteres)." },
        { status: 400 },
      );
    }

    if (!content || content.length > 2000) {
      return NextResponse.json(
        { success: false, message: "Informe o conteúdo da comunicação (até 2000 caracteres)." },
        { status: 400 },
      );
    }

    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > MAX_DURATION_MINUTES) {
      return NextResponse.json(
        { success: false, message: "Defina um tempo ativo válido (entre 1 minuto e 365 dias)." },
        { status: 400 },
      );
    }

    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const post = await prisma.muralPost.create({
      data: {
        title,
        content,
        priority,
        durationMinutes,
        expiresAt,
        showInAdmission,
        authorId: user.id,
        authorName: user.name,
      },
    });

    return NextResponse.json(
      { success: true, message: "Comunicação publicada no mural!", data: post },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro na rota POST /api/mural:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno ao criar comunicação." },
      { status: 500 },
    );
  }
}
