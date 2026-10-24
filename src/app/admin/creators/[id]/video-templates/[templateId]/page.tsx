import React from "react";
import TemplateEditorClient from "./TemplateEditorClient";
import { prisma } from "@/lib/prisma";

export default async function VideoTemplateEditorPage({ 
  params 
}: { 
  params: any 
}) {
  const { id: creatorId, templateId } = await params;
  
  let initialData = null;

  if (templateId !== "new") {
    initialData = await prisma.videoTemplate.findUnique({
      where: { id: templateId }
    });
  }

  return (
    <TemplateEditorClient 
      creatorId={creatorId}
      templateId={templateId}
      initialData={initialData}
    />
  );
}
