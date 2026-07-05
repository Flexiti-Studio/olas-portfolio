import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#333' },
  header: { marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#ccc', paddingBottom: 10 },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  profile: { marginBottom: 15, lineHeight: 1.5 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#111', textTransform: 'uppercase' },
  jobBlock: { marginBottom: 12 },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  jobTitle: { fontSize: 11, fontWeight: 'bold' },
  jobCompany: { fontSize: 11, fontStyle: 'italic' },
  bullet: { flexDirection: 'row', marginBottom: 4 },
  bulletPoint: { width: 10, fontSize: 12 },
  bulletText: { flex: 1, lineHeight: 1.4 },
  skills: { marginBottom: 15, lineHeight: 1.5 }
});

export default function StandardTemplate({ output }: { output: any }) {
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
                  <Text style={styles.jobCompany}>{exp.company} | {exp.period}</Text>
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
      </Page>
    </Document>
  );
}
