import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#000', backgroundColor: '#fff' },
  header: { textAlign: 'center', marginBottom: 20 },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  title: { fontSize: 14, fontWeight: 'bold', fontStyle: 'italic', marginBottom: 4 },
  location: { marginBottom: 4 },
  contact: { marginBottom: 4 },
  links: { color: '#0d59f2', textDecoration: 'underline' },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 6, marginTop: 10 },
  text: { textAlign: 'justify', lineHeight: 1.5, marginBottom: 10 },
  skillRow: { flexDirection: 'row', marginBottom: 3 },
  skillCat: { fontWeight: 'bold', marginRight: 4 },
  skillItems: { flex: 1 },
  jobBlock: { marginBottom: 12 },
  jobCompany: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 },
  jobTitle: { fontWeight: 'bold', marginBottom: 2 },
  jobLocationDate: { fontStyle: 'italic', marginBottom: 4 },
  bullet: { flexDirection: 'row', marginBottom: 3 },
  bulletPoint: { width: 10 },
  bulletText: { flex: 1, lineHeight: 1.4 },
  hr: { borderBottomWidth: 1, borderBottomColor: '#ccc', marginVertical: 8 }
});

// A small helper to strip HTML from strings since React-PDF doesn't support HTML
const stripHtml = (html: string) => html.replace(/<[^>]*>?/gm, '');

export default function AtsCvPdfTemplate({ data }: { data: any }) {
  if (!data) return null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{data.personal_info?.name || "Emmanuel Adeleke"}</Text>
          <Text style={styles.title}>{data.personal_info?.title || "Senior Full Stack Engineer"}</Text>
          <Text style={styles.location}>{data.personal_info?.location || "Brooklyn, NY 11233"}</Text>
          <Text style={styles.contact}>
            {data.personal_info?.email || "emmanuel.success.work@gmail.com"} • {data.personal_info?.phone || "+1 (339)-399-0519"}
          </Text>
          <Text style={styles.links}>
            <Link src={data.personal_info?.github || "https://github.com/svendev888"}>{data.personal_info?.github || "https://github.com/svendev888"}</Link>
            {" • "}
            <Link src={data.personal_info?.linkedin || "https://www.linkedin.com/in/emmanuel-adeleke-success/"}>{data.personal_info?.linkedin || "https://www.linkedin.com/in/emmanuel-adeleke-success/"}</Link>
          </Text>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.text}>{stripHtml(data.summary || "")}</Text>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Technical Skills</Text>
          {data.skills?.map((cat: any, i: number) => (
            <View key={i} style={styles.skillRow}>
              <Text style={styles.skillCat}>{cat.category}:</Text>
              <Text style={styles.skillItems}>{cat.items.join(", ")}</Text>
            </View>
          ))}
        </View>

        {data.languages && data.languages.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Languages</Text>
            <Text style={styles.skillRow}>English: Native</Text>
          </View>
        )}

        <View>
          <Text style={styles.sectionTitle}>Professional Experience</Text>
          {data.experience?.map((exp: any, i: number) => (
            <View key={i} style={styles.jobBlock}>
              {i > 0 && <View style={styles.hr} />}
              <Text style={styles.jobCompany}>{exp.company}</Text>
              <Text style={styles.jobTitle}>{exp.title}</Text>
              <Text style={styles.jobLocationDate}>{exp.location} | {exp.date}</Text>
              
              {exp.project && (
                <Text style={{ marginBottom: 4 }}>
                  <Text style={{ fontWeight: 'bold' }}>Project: </Text>{exp.project}
                </Text>
              )}
              
              {exp.bullets?.map((bullet: string, j: number) => (
                <View key={j} style={styles.bullet}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.bulletText}>{stripHtml(bullet)}</Text>
                </View>
              ))}
              
              {exp.technologies && (
                <Text style={{ marginTop: 4 }}>
                  <Text style={{ fontWeight: 'bold' }}>Technologies: </Text>{exp.technologies}
                </Text>
              )}
            </View>
          ))}
        </View>

        <View>
          <View style={styles.hr} />
          <Text style={styles.sectionTitle}>Education</Text>
          {data.education?.map((edu: any, i: number) => (
            <View key={i} style={{ marginBottom: 8 }}>
              <Text style={{ fontWeight: 'bold' }}>{edu.institution}</Text>
              <Text>{edu.degree}</Text>
              <Text>{edu.location}</Text>
              <Text>{edu.date}</Text>
            </View>
          ))}
        </View>

        {data.certifications && data.certifications.length > 0 && (
          <View>
            <View style={styles.hr} />
            <Text style={styles.sectionTitle}>Certifications</Text>
            {data.certifications.map((cert: string, i: number) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.bulletText}>{cert}</Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
