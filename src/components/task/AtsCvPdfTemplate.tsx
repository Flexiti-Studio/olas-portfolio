import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';

const BLUE = '#1a4fa0';
const DARK_BLUE = '#1a3f7a';

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 10, color: '#000', backgroundColor: '#fff' },
  // Header
  header: { textAlign: 'center', marginBottom: 8 },
  name: { fontSize: 22, fontWeight: 'bold', marginBottom: 2, letterSpacing: 0.5 },
  title: { fontSize: 12, fontWeight: 'bold', fontStyle: 'italic', marginBottom: 3 },
  contactRow: { flexDirection: 'row', justifyContent: 'center', fontSize: 9, marginBottom: 2, gap: 12 },
  linkRow: { flexDirection: 'row', justifyContent: 'center', fontSize: 9, marginBottom: 2, gap: 6 },
  link: { color: BLUE, textDecoration: 'underline' },
  // Section
  sectionDividerTop: { borderTopWidth: 2, borderTopColor: DARK_BLUE, marginBottom: 1 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', textAlign: 'center', color: BLUE, textTransform: 'uppercase', letterSpacing: 2, paddingVertical: 2 },
  sectionDividerBottom: { borderBottomWidth: 2, borderBottomColor: DARK_BLUE, marginTop: 1, marginBottom: 6 },
  // Experience
  expHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 },
  expTitleCompany: { flexDirection: 'row', flex: 1 },
  expTitle: { fontWeight: 'bold', fontStyle: 'italic', fontSize: 10 },
  expCompany: { color: BLUE, fontStyle: 'italic', fontSize: 10 },
  expDate: { fontSize: 9, color: '#555', textAlign: 'right' },
  // Bullets
  bullet: { flexDirection: 'row', marginBottom: 2, paddingLeft: 10 },
  bulletPoint: { width: 8, fontSize: 10 },
  bulletText: { flex: 1, lineHeight: 1.4, fontSize: 9.5 },
  // Skills
  skillRow: { flexDirection: 'row', marginBottom: 2 },
  skillCat: { fontWeight: 'bold', marginRight: 4, fontSize: 9.5 },
  skillItems: { flex: 1, fontSize: 9.5 },
  // Education
  eduRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 },
  eduDegree: { fontWeight: 'bold', fontSize: 10 },
  eduInstitution: { fontSize: 9, color: '#555', fontStyle: 'italic', textAlign: 'right' },
  // Generic
  text: { lineHeight: 1.4, fontSize: 9.5, marginBottom: 4 },
  bold: { fontWeight: 'bold' },
  mb: { marginBottom: 10 },
  certItem: { fontWeight: 'bold', fontSize: 9.5 },
});

const stripHtml = (html: string) => html.replace(/<[^>]*>?/gm, '');

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.mb}>
      <View style={styles.sectionDividerTop} />
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionDividerBottom} />
      {children}
    </View>
  );
}

export default function AtsCvPdfTemplate({ data }: { data: any }) {
  if (!data) return null;
  const p = data.personal_info || {};

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ── HEADER ── */}
        <View style={styles.header}>
          <Text style={styles.name}>{p.name || "James Gao"}</Text>
          <Text style={styles.title}>{p.title || "Salesforce Engineer | Cloud Solutions Specialist"}</Text>
          <View style={styles.contactRow}>
            <Text>{p.email || "Jamesgao.success.pro@proton.me"}</Text>
            <Text>{p.phone || "+1 (339) 399-0519"}</Text>
            <Text>{p.location || "San Francisco, CA"}</Text>
          </View>
          <View style={styles.linkRow}>
            <Link src={p.linkedin || "https://www.linkedin.com/in/jamessmgao/"} style={styles.link}>
              {p.linkedin || "https://www.linkedin.com/in/jamessmgao/"}
            </Link>
            <Text> | </Text>
            <Link src={p.github || "https://github.com/svendev888"} style={styles.link}>
              {p.github || "https://github.com/svendev888"}
            </Link>
          </View>
        </View>

        {/* ── PROFESSIONAL SUMMARY ── */}
        <SectionBlock title="PROFESSIONAL SUMMARY">
          {Array.isArray(data.summary_bullets) && data.summary_bullets.length > 0 ? (
            data.summary_bullets.map((b: string, i: number) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.bulletText}>{stripHtml(b)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.text}>{stripHtml(data.summary || "")}</Text>
          )}
          {data.key_outcomes && (
            <Text style={{ fontSize: 9, color: '#444', marginTop: 2 }}>
              <Text style={styles.bold}>Key Outcomes: </Text>{stripHtml(data.key_outcomes)}
            </Text>
          )}
        </SectionBlock>

        {/* ── PROFESSIONAL EXPERIENCE ── */}
        <SectionBlock title="PROFESSIONAL EXPERIENCE">
          {data.experience?.map((exp: any, i: number) => (
            <View key={i} style={{ marginBottom: 8 }}>
              <View style={styles.expHeader}>
                <View style={styles.expTitleCompany}>
                  <Text style={styles.expTitle}>{exp.title} </Text>
                  <Text>| </Text>
                  <Text style={styles.expCompany}>{exp.company}</Text>
                </View>
                <Text style={styles.expDate}>{exp.date}{exp.location ? ` | ${exp.location}` : ""}</Text>
              </View>

              {exp.bullets?.map((bullet: string, j: number) => (
                <View key={j} style={styles.bullet}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.bulletText}>{stripHtml(bullet)}</Text>
                </View>
              ))}

              {exp.technologies && (
                <Text style={{ fontSize: 9, marginTop: 2 }}>
                  <Text style={styles.bold}>Technologies: </Text>{exp.technologies}
                </Text>
              )}
            </View>
          ))}
        </SectionBlock>

        {/* ── EDUCATION ── */}
        <SectionBlock title="EDUCATION">
          {data.education?.map((edu: any, i: number) => (
            <View key={i} style={{ marginBottom: 6 }}>
              <View style={styles.eduRow}>
                <Text style={styles.eduDegree}>{edu.degree}</Text>
                <Text style={styles.eduInstitution}>{edu.institution} / {edu.date}</Text>
              </View>
              {edu.coursework && Array.isArray(edu.coursework) && edu.coursework.length > 0 && (
                <View style={{ marginTop: 2 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 9, marginBottom: 1 }}>Relevant Coursework:</Text>
                  {edu.coursework.map((c: string, ci: number) => (
                    <View key={ci} style={styles.bullet}>
                      <Text style={styles.bulletPoint}>•</Text>
                      <Text style={styles.bulletText}>{c}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </SectionBlock>

        {/* ── SKILLS & EXPERTISE ── */}
        <SectionBlock title="SKILLS & EXPERTISE">
          {data.skills?.map((cat: any, i: number) => (
            <View key={i} style={styles.skillRow}>
              <Text style={styles.skillCat}>{cat.category}:</Text>
              <Text style={styles.skillItems}>{cat.items.join(", ")}</Text>
            </View>
          ))}
        </SectionBlock>

        {/* ── CERTIFICATIONS ── */}
        {data.certifications && data.certifications.length > 0 && (
          <SectionBlock title="CERTIFICATIONS">
            {data.certifications.map((cert: string, i: number) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.certItem}>{cert}</Text>
              </View>
            ))}
          </SectionBlock>
        )}

        {/* ── WORK AUTHORIZATION ── */}
        <Text style={{ fontSize: 9, marginTop: 4 }}>
          <Text style={styles.bold}>Work Authorization: </Text>
          {data.work_authorization || "Authorized to work in the United States (no sponsorship required)"}
        </Text>

      </Page>
    </Document>
  );
}
