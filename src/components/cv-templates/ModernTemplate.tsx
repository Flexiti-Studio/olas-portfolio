import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 0, fontFamily: 'Helvetica', fontSize: 10, color: '#333' },
  header: { backgroundColor: '#1e3a8a', padding: 40, color: '#ffffff' },
  name: { fontSize: 28, fontWeight: 'bold', marginBottom: 5 },
  jobCompany: { fontSize: 12, opacity: 0.8 },
  content: { padding: 40 },
  profile: { marginBottom: 20, lineHeight: 1.5 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#1e3a8a', textTransform: 'uppercase', borderBottomWidth: 2, borderBottomColor: '#1e3a8a', paddingBottom: 5 },
  jobBlock: { marginBottom: 15 },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  jobTitle: { fontSize: 12, fontWeight: 'bold', color: '#111' },
  jobCompanyText: { fontSize: 11, fontStyle: 'italic', color: '#555' },
  bullet: { flexDirection: 'row', marginBottom: 4 },
  bulletPoint: { width: 15, fontSize: 14, color: '#1e3a8a' },
  bulletText: { flex: 1, lineHeight: 1.4 },
  skills: { marginBottom: 20, lineHeight: 1.5 }
});

export default function ModernTemplate({ output }: { output: any }) {
  if (!output) return null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{output.fullName || output.jobTitle}</Text>
          <Text style={styles.jobCompany}>
            {output.jobTitle} {output.isBaseTemplate ? '(Base Template)' : `@ ${output.company}`}
          </Text>
        </View>

        <View style={styles.content}>
          {output.profile && (
            <View style={styles.profile}>
              <Text style={styles.sectionTitle}>Professional Profile</Text>
              <Text>{output.profile}</Text>
            </View>
          )}

          {output.experience && output.experience.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>Experience</Text>
              {output.experience.map((exp: any, i: number) => (
                <View key={i} style={styles.jobBlock}>
                  <View style={styles.jobHeader}>
                    <Text style={styles.jobTitle}>{exp.title}</Text>
                    <Text style={styles.jobCompanyText}>{exp.company} | {exp.period}</Text>
                  </View>
                  {exp.bullets.map((bullet: string, j: number) => (
                    <View key={j} style={styles.bullet}>
                      <Text style={styles.bulletPoint}>•</Text>
                      <Text style={styles.bulletText}>{bullet}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

          {output.skillsHighlight && (
            <View style={styles.skills}>
              <Text style={styles.sectionTitle}>Key Skills</Text>
              <Text>{output.skillsHighlight}</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
