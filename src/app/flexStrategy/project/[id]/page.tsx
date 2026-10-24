import React from 'react';
import { WorkspaceClient } from '@/components/flexStrategy/workspace/WorkspaceClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectWorkspacePage({ params }: PageProps) {
  const { id } = await params;

  return (
    <WorkspaceClient
      projectId={id}
      projectName={`Strategy Project #${id.slice(-4)}`}
      initialSymbol="XAUUSD"
      initialTimeframe="5m"
    />
  );
}
