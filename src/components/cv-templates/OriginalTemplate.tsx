import { Document, Page, Text, View, StyleSheet, Svg, Path } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: '#444', flexDirection: 'column' },
  headerContainer: { paddingTop: 40, paddingBottom: 20, alignItems: 'center' },
  name: { fontSize: 26, fontWeight: 'bold', letterSpacing: 5, textTransform: 'uppercase', color: '#555' },
  main: { flexDirection: 'row', flex: 1, borderTopWidth: 1, borderTopColor: '#ddd', marginHorizontal: 30 },
  leftCol: { width: '35%', backgroundColor: '#f4f5f7', padding: 20, paddingTop: 30 },
  rightCol: { width: '65%', padding: 20, paddingTop: 30, paddingLeft: 30 },
  
  sectionTitleLeft: { fontSize: 11, fontWeight: 'bold', letterSpacing: 3, marginBottom: 15, color: '#555', textTransform: 'uppercase' },
  sectionTitleRight: { fontSize: 12, fontWeight: 'bold', letterSpacing: 3, marginBottom: 15, color: '#555', textTransform: 'uppercase' },
  
  contactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  contactText: { fontSize: 9, marginLeft: 8 },
  
  divider: { borderBottomWidth: 1, borderBottomColor: '#ddd', borderStyle: 'dashed', marginVertical: 15 },
  
  skillCategory: { fontSize: 9, fontWeight: 'bold', marginBottom: 3, marginTop: 10 },
  skillText: { fontSize: 9, color: '#555', lineHeight: 1.4 },
  
  educationBlock: { marginBottom: 10 },
  eduDegree: { fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
  eduSchool: { fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  eduDate: { fontSize: 9, color: '#777', marginBottom: 4 },
  eduDesc: { fontSize: 9, lineHeight: 1.4 },
  
  langRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  langName: { fontSize: 9 },
  langBarBg: { width: 80, height: 4, backgroundColor: '#ddd', borderRadius: 2 },
  langBarFill: { height: 4, backgroundColor: '#555', borderRadius: 2 },

  profileText: { fontSize: 10, lineHeight: 1.5, textAlign: 'justify', marginBottom: 25 },
  
  jobBlock: { marginBottom: 15 },
  jobTitle: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  jobHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  jobCompany: { fontSize: 10, color: '#555' },
  jobDate: { fontSize: 10, color: '#555' },
  
  bulletRow: { flexDirection: 'row', marginBottom: 4 },
  bulletPoint: { width: 12, fontSize: 12, color: '#555' },
  bulletText: { flex: 1, fontSize: 10, lineHeight: 1.4 }
});

const PhoneIcon = () => (
  <Svg viewBox="0 0 24 24" width={12} height={12}>
    <Path d="M20 15.5c-1.2 0-2.4-.2-3.6-.6-.3-.1-.7 0-1 .2l-2.2 2.2c-2.8-1.4-5.1-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1-.4-1.2-.6-2.4-.6-3.6 0-.6-.4-1-1-1H4c-.6 0-1 .4-1 1 0 9.4 7.6 17 17 17 .6 0 1-.4 1-1v-3.5c0-.6-.4-1-1-1z" fill="#777"/>
  </Svg>
);

const EmailIcon = () => (
  <Svg viewBox="0 0 24 24" width={12} height={12}>
    <Path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="#777"/>
  </Svg>
);

const WebIcon = () => (
  <Svg viewBox="0 0 24 24" width={12} height={12}>
    <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="#777"/>
  </Svg>
);

const PinIcon = () => (
  <Svg viewBox="0 0 24 24" width={12} height={12}>
    <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#777"/>
  </Svg>
);

export default function OriginalTemplate({ output }: { output: any }) {
  if (!output) return null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.name}>{output.fullName || output.jobTitle}</Text>
        </View>

        {/* Main 2-Column Layout */}
        <View style={styles.main}>
          
          {/* Left Column */}
          <View style={styles.leftCol}>
            
            <Text style={styles.sectionTitleLeft}>Contact</Text>
            {output.basicInfo?.phone && (
              <View style={styles.contactRow}>
                <PhoneIcon /><Text style={styles.contactText}>{output.basicInfo.phone}</Text>
              </View>
            )}
            {output.basicInfo?.email && (
              <View style={styles.contactRow}>
                <EmailIcon /><Text style={styles.contactText}>{output.basicInfo.email}</Text>
              </View>
            )}
            {output.basicInfo?.portfolio && (
              <View style={styles.contactRow}>
                <WebIcon /><Text style={styles.contactText}>{output.basicInfo.portfolio}</Text>
              </View>
            )}
            {output.basicInfo?.location && (
              <View style={styles.contactRow}>
                <PinIcon /><Text style={styles.contactText}>{output.basicInfo.location}</Text>
              </View>
            )}

            <View style={styles.divider} />

            <Text style={styles.sectionTitleLeft}>Skills</Text>
            {/* If we have the categorized skills from the base template */}
            {output.skills && typeof output.skills === 'object' && !Array.isArray(output.skills) ? (
              <View>
                {Object.entries(output.skills).map(([category, items]: [string, any]) => (
                  <View key={category}>
                    <Text style={styles.skillCategory}>
                      {category === 'frontend' ? 'Programming Skills:' : 
                       category === 'backend' ? 'Backend:' : 
                       category === 'tools' ? 'Software Tools:' : 
                       category === 'aiAutomation' ? 'AI & Automation:' : 
                       'Core Competencies:'}
                    </Text>
                    <Text style={styles.skillText}>• {(items || []).join(', ')}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* If we have skillsHighlight from AI generation */}
            {output.skillsHighlight && (
              <View>
                <Text style={styles.skillCategory}>Highlighted Skills:</Text>
                <Text style={styles.skillText}>{output.skillsHighlight}</Text>
              </View>
            )}

            <View style={styles.divider} />

            <Text style={styles.sectionTitleLeft}>Education</Text>
            {output.education ? output.education.map((edu: any, i: number) => (
              <View key={i} style={styles.educationBlock}>
                <Text style={styles.eduDegree}>{edu.degree}</Text>
                <Text style={styles.eduSchool}>{edu.institution}</Text>
                <Text style={styles.eduDate}>{edu.period}</Text>
                {edu.description && <Text style={styles.eduDesc}>{edu.description}</Text>}
              </View>
            )) : (
              <View style={styles.educationBlock}>
                <Text style={styles.eduDegree}>B.sc In Building</Text>
                <Text style={styles.eduSchool}>University of Lagos</Text>
                <Text style={styles.eduDate}>2017-2023</Text>
                <Text style={styles.eduDesc}>Bachelor's in Building: Explores architectural design, construction, and management.</Text>
              </View>
            )}

            <View style={styles.divider} />

            <Text style={styles.sectionTitleLeft}>Languages</Text>
            <View style={styles.langRow}>
              <Text style={styles.langName}>English</Text>
              <View style={styles.langBarBg}><View style={[styles.langBarFill, { width: '90%' }]} /></View>
            </View>
            <View style={styles.langRow}>
              <Text style={styles.langName}>Yoruba</Text>
              <View style={styles.langBarBg}><View style={[styles.langBarFill, { width: '100%' }]} /></View>
            </View>
            
          </View>

          {/* Right Column */}
          <View style={styles.rightCol}>
            
            {output.profile && (
              <View>
                <Text style={styles.sectionTitleRight}>Profile</Text>
                <Text style={styles.profileText}>{output.profile}</Text>
              </View>
            )}

            {output.experience && output.experience.length > 0 && (
              <View>
                <Text style={styles.sectionTitleRight}>Work Experience</Text>
                {output.experience.map((exp: any, i: number) => (
                  <View key={i} style={styles.jobBlock}>
                    <Text style={styles.jobTitle}>{exp.title}</Text>
                    <View style={styles.jobHeaderRow}>
                      <Text style={styles.jobCompany}>{exp.company}</Text>
                      <Text style={styles.jobDate}>{exp.period}</Text>
                    </View>
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

        </View>
      </Page>
    </Document>
  );
}
