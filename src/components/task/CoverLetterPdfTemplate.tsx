import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11, color: '#000', backgroundColor: '#fff', lineHeight: 1.6 },
  paragraph: { marginBottom: 12, textAlign: 'justify' }
});

// Helper to convert basic HTML to react-pdf components
// It splits by <br/>, <p>, and basic tags.
const parseHtmlToText = (html: string) => {
  if (!html) return [];
  // Split by paragraph or br tags
  const blocks = html.split(/<p>|<\/p>|<br\s*\/?>/i).filter(b => b.trim().length > 0);
  return blocks.map(block => block.replace(/<[^>]*>?/gm, '').trim());
};

export default function CoverLetterPdfTemplate({ content }: { content: string }) {
  if (!content) return null;
  const paragraphs = parseHtmlToText(content);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={{ marginBottom: 30 }}>
          {/* Header spacer if needed */}
        </View>
        {paragraphs.map((p, i) => (
          <Text key={i} style={styles.paragraph}>{p}</Text>
        ))}
      </Page>
    </Document>
  );
}
