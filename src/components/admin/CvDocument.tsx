import StandardTemplate from '../cv-templates/StandardTemplate';
import ModernTemplate from '../cv-templates/ModernTemplate';
import OriginalTemplate from '../cv-templates/OriginalTemplate';
import NavySidebarTemplate from '../cv-templates/NavySidebarTemplate';

export default function CvDocument({ output, design = 'standard' }: { output: any, design?: string }) {
  if (design === 'navy') return <NavySidebarTemplate output={output} />;
  if (design === 'original') return <OriginalTemplate output={output} />;
  if (design === 'modern') return <ModernTemplate output={output} />;
  return <StandardTemplate output={output} />;
}
