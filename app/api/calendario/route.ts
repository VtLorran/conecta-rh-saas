import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { EVENT_CATEGORIES, parseUtcNoonDate, type EventCategory } from "@/lib/mural";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const admissionId = searchParams.get("admissionId");
    const upcomingOnly = searchParams.get("upcoming") === "true";

    if (admissionId) {
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
    } else {
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json(
          { success: false, message: "Não autenticado" },
          { status: 401 },
        );
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayStart = new Date(`${todayStr}T00:00:00.000Z`);

    const events = await prisma.corporateEvent.findMany({
      where: upcomingOnly ? { eventDate: { gte: todayStart } } : undefined,
      orderBy: [{ eventDate: "asc" }, { startTime: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        eventDate: true,
        startTime: true,
        category: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    console.error("Erro na rota GET /api/calendario:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno ao carregar eventos." },
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
        { success: false, message: "Apenas hosts (RH/Admin) podem registrar eventos no calendário." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : null;
    const rawDate = typeof body.eventDate === "string" ? body.eventDate : "";
    const startTime = typeof body.startTime === "string" && body.startTime.trim() ? body.startTime.trim() : null;
    const rawCategory = typeof body.category === "string" ? body.category.toUpperCase() : "EVENTO";
    const category: EventCategory = EVENT_CATEGORIES.includes(rawCategory as EventCategory)
      ? (rawCategory as EventCategory)
      : "EVENTO";

    if (!title || title.length > 120) {
      return NextResponse.json(
        { success: false, message: "Informe um título válido para o evento (até 120 caracteres)." },
        { status: 400 },
      );
    }

    const parsedDate = parseUtcNoonDate(rawDate);
    if (!parsedDate) {
      return NextResponse.json(
        { success: false, message: "Informe uma data válida no formato YYYY-MM-DD." },
        { status: 400 },
      );
    }

    if (startTime && !/^\d{2}:\d{2}$/.test(startTime)) {
      return NextResponse.json(
        { success: false, message: "Horário inválido. Use o formato HH:MM." },
        { status: 400 },
      );
    }

    const event = await prisma.corporateEvent.create({
      data: {
        title,
        description: description || null,
        eventDate: parsedDate,
        startTime,
        category,
        createdById: user.id,
      },
    });

    return NextResponse.json(
      { success: true, message: "Evento registrado no calendário!", data: event },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro na rota POST /api/calendario:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno ao registrar evento." },
      { status: 500 },
    );
  }
}
