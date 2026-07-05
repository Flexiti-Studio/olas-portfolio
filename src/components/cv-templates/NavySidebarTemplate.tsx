import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { flexDirection: 'row', fontFamily: 'Helvetica', fontSize: 10, color: '#333' },
  leftBg: { position: 'absolute', top: 0, left: 0, bottom: 0, width: '30%', backgroundColor: '#1e3354' },
  
  leftCol: { width: '30%', padding: 20, paddingTop: 30, color: '#ffffff' },
  rightCol: { width: '70%', padding: 20, paddingTop: 30, paddingLeft: 30 },
  
  // Left Column Styles
  leftTitle: { fontSize: 10, fontWeight: 'bold', color: '#ffffff', marginBottom: 8, marginTop: 15, textTransform: 'uppercase' },
  leftText: { fontSize: 9, color: '#e2e8f0', marginBottom: 4 },
  leftTextBold: { fontSize: 9, fontWeight: 'bold', color: '#ffffff', marginBottom: 2 },
  
  skillCategory: { fontSize: 9, fontWeight: 'bold', color: '#ffffff', marginTop: 8, marginBottom: 3 },
  skillBulletRow: { flexDirection: 'row', marginBottom: 2 },
  skillBullet: { width: 10, fontSize: 10, color: '#ffffff' },
  skillBulletText: { flex: 1, fontSize: 9, color: '#e2e8f0' },
  
  // Right Column Styles
  name: { fontSize: 28, fontWeight: 'bold', color: '#1e3354', marginBottom: 5, letterSpacing: 1 },
  jobCompany: { fontSize: 12, color: '#555', marginBottom: 15 },
  
  sectionHeaderBox: { backgroundColor: '#1e3354', paddingVertical: 6, paddingHorizontal: 10, marginBottom: 15 },
  sectionHeaderText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  
  profileText: { fontSize: 10, lineHeight: 1.5, marginBottom: 25 },
  
  jobBlock: { marginBottom: 18 },
  jobHeaderRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 },
  jobTitle: { fontSize: 11, fontWeight: 'bold', color: '#1e3354' },
  jobSeparator: { fontSize: 11, color: '#888', marginHorizontal: 6 },
  jobCompanyRight: { fontSize: 10, color: '#555' },
  jobDate: { fontSize: 9, color: '#888', fontStyle: 'italic', marginBottom: 8 },
  
  bulletRow: { flexDirection: 'row', marginBottom: 4 },
  bulletPoint: { width: 12, fontSize: 12, color: '#1e3354' },
  bulletText: { flex: 1, fontSize: 10, lineHeight: 1.4 }
});

export default function NavySidebarTemplate({ output }: { output: any }) {
  if (!output) return null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.leftBg} fixed />
        
        {/* Left Column */}
        <View style={styles.leftCol}>
          
          <Text style={[styles.leftTitle, { marginTop: 0 }]}>Contact</Text>
          {output.basicInfo?.phone && <Text style={styles.leftText}>{output.basicInfo.phone}</Text>}
          {output.basicInfo?.email && <Text style={styles.leftText}>{output.basicInfo.email}</Text>}
          {output.basicInfo?.portfolio && <Text style={styles.leftText}>{output.basicInfo.portfolio}</Text>}
          {output.basicInfo?.location && <Text style={styles.leftText}>{output.basicInfo.location}</Text>}
          
          <Text style={styles.leftTitle}>Education</Text>
          {output.education ? output.education.map((edu: any, i: number) => (
            <View key={i} style={{ marginBottom: 10 }}>
              <Text style={styles.leftTextBold}>{edu.degree}</Text>
              <Text style={styles.leftText}>{edu.institution}</Text>
              <Text style={styles.leftText}>{edu.period}</Text>
            </View>
          )) : (
            <View style={{ marginBottom: 10 }}>
              <Text style={styles.leftTextBold}>B.Sc. Building</Text>
              <Text style={styles.leftText}>University of Lagos</Text>
              <Text style={styles.leftText}>2017 - 2023</Text>
            </View>
          )}

          <Text style={styles.leftTitle}>Languages</Text>
          <View style={styles.skillBulletRow}>
            <Text style={styles.skillBullet}>•</Text>
            <Text style={styles.skillBulletText}>English</Text>
          </View>
          <View style={styles.skillBulletRow}>
            <Text style={styles.skillBullet}>•</Text>
            <Text style={styles.skillBulletText}>Yoruba</Text>
          </View>

          <Text style={styles.leftTitle}>Technical Skills</Text>
          {output.skills && typeof output.skills === 'object' && !Array.isArray(output.skills) ? (
            <View>
              {Object.entries(output.skills).map(([category, items]: [string, any]) => (
                <View key={category}>
                  <Text style={styles.skillCategory}>
                    {category === 'frontend' ? 'Frontend' : 
                     category === 'backend' ? 'Backend' : 
                     category === 'tools' ? 'Tools & Platforms' : 
                     category === 'aiAutomation' ? 'AI & Automation' : 
                     'Core Competencies'}
                  </Text>
                  {(items || []).map((item: string, idx: number) => (
                    <View key={idx} style={styles.skillBulletRow}>
                      <Text style={styles.skillBullet}>•</Text>
                      <Text style={styles.skillBulletText}>{item}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : null}

          {output.skillsHighlight && (
            <View>
              <Text style={styles.skillCategory}>Core Competencies</Text>
              {output.skillsHighlight.split(', ').map((item: string, idx: number) => (
                <View key={idx} style={styles.skillBulletRow}>
                  <Text style={styles.skillBullet}>•</Text>
                  <Text style={styles.skillBulletText}>{item}</Text>
                </View>
              ))}
            </View>
          )}
          
        </View>

        {/* Right Column */}
        <View style={styles.rightCol}>
          
          <Text style={styles.name}>{output.fullName || output.jobTitle}</Text>
          <Text style={styles.jobCompany}>
            {output.jobTitle} {output.isBaseTemplate ? '(Base Template)' : ''}
          </Text>

          {output.profile && (
            <View>
              <View style={styles.sectionHeaderBox}>
                <Text style={styles.sectionHeaderText}>Profile</Text>
              </View>
              <Text style={styles.profileText}>{output.profile}</Text>
            </View>
          )}

          {output.experience && output.experience.length > 0 && (
            <View>
              <View style={styles.sectionHeaderBox}>
                <Text style={styles.sectionHeaderText}>Work Experience</Text>
              </View>
              {output.experience.map((exp: any, i: number) => (
                <View key={i} style={styles.jobBlock}>
                  <View style={styles.jobHeaderRow}>
                    <Text style={styles.jobTitle}>{exp.title}</Text>
                    <Text style={styles.jobSeparator}>|</Text>
                    <Text style={styles.jobCompanyRight}>{exp.company}</Text>
                  </View>
                  <Text style={styles.jobDate}>{exp.period}</Text>
                  
                  {exp.bullets.map((bullet: string, j: number) => (
                    <View key={j} style={styles.bulletRow}>
                      <Text style={styles.bulletPoint}>•</Text>
                      <Text style={styles.bulletText}>{bullet}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

        </View>

      </Page>
    </Document>
  );
}
