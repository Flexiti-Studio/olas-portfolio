import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const banks = await prisma.bankAccount.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({ success: true, data: banks });
}

export async function POST(req: Request) {
  const { name, balance } = await req.json();
  const newBank = await prisma.bankAccount.create({ data: { name, balance } });
  return NextResponse.json({ success: true, data: newBank });
}

export async function PUT(req: Request) {
  const { id, balance } = await req.json();
  const updated = await prisma.bankAccount.update({ where: { id }, data: { balance } });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ success: false }, { status: 400 });
  await prisma.bankAccount.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
