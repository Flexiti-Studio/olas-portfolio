import { Html, Head, Preview, Body, Container, Heading, Text, Section } from "@react-email/components";
import React from "react";

interface SubcatGroup {
  id: string;
  name: string;
  subcategories: {
    id: string;
    name: string;
    goal: number;
    actual: number;
    remaining: number;
  }[];
  totalGoal: number;
  totalActual: number;
}

export type WeeklySlice = {
  subcategoryId: string;
  name: string;
  categoryGroup: "NEEDS" | "WANTS" | "SAVINGS";
  weekSpend: number;
  weeklyPace: number;
};

interface BudgetDigestProps {
  periodLabel: string;
  aiSummary: string;
  totalIncome: number;
  groups: {
    NEEDS: SubcatGroup;
    SAVINGS: SubcatGroup;
    WANTS: SubcatGroup;
  };
  weeklySlices: WeeklySlice[];
}

export function BudgetDigest({ periodLabel, aiSummary, totalIncome, groups, weeklySlices }: BudgetDigestProps) {
  const totalSpent = groups.NEEDS.totalActual + groups.SAVINGS.totalActual + groups.WANTS.totalActual;

  const renderGroup = (title: string, group: SubcatGroup) => {
    return (
      <Section style={{ marginBottom: "20px", borderTop: "1px solid #334155", paddingTop: "10px" }}>
        <Heading as="h3" style={{ color: "#38bdf8", marginBottom: "10px" }}>{title}</Heading>
        <Text style={{ margin: 0, fontWeight: "bold" }}>
          Goal: ₦{group.totalGoal.toLocaleString()} | Actual: ₦{group.totalActual.toLocaleString()}
        </Text>
        
        <table style={{ width: "100%", marginTop: "10px", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#94a3b8", borderBottom: "1px solid #334155" }}>
              <th style={{ paddingBottom: "5px" }}>Subcategory</th>
              <th style={{ paddingBottom: "5px" }}>Goal</th>
              <th style={{ paddingBottom: "5px" }}>Actual</th>
              <th style={{ paddingBottom: "5px" }}>Remaining</th>
            </tr>
          </thead>
          <tbody>
            {group.subcategories.map(sub => (
              <tr key={sub.id} style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: "8px 0" }}>{sub.name}</td>
                <td style={{ padding: "8px 0" }}>₦{sub.goal.toLocaleString()}</td>
                <td style={{ padding: "8px 0", color: sub.actual > sub.goal && sub.goal > 0 ? "#ef4444" : "inherit" }}>
                  ₦{sub.actual.toLocaleString()}
                </td>
                <td style={{ padding: "8px 0", color: sub.remaining < 0 ? "#ef4444" : "#22c55e" }}>
                  ₦{sub.remaining.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    );
  };

  const renderWeeklySlices = () => {
    if (weeklySlices.length === 0) return null;
    
    // Sort hottest first (highest positive difference between weekSpend and weeklyPace)
    const sorted = [...weeklySlices].sort((a, b) => (b.weekSpend - b.weeklyPace) - (a.weekSpend - a.weeklyPace));

    return (
      <Section style={{ marginBottom: "30px", backgroundColor: "#1e293b", padding: "15px", borderRadius: "8px" }}>
        <Heading as="h3" style={{ color: "#f43f5e", marginBottom: "10px", marginTop: 0 }}>This Week&apos;s Hottest Subcategories</Heading>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#94a3b8", borderBottom: "1px solid #334155" }}>
              <th style={{ paddingBottom: "5px" }}>Subcategory</th>
              <th style={{ paddingBottom: "5px" }}>Pace (Expected)</th>
              <th style={{ paddingBottom: "5px" }}>Actual (7 days)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(s => {
              const over = s.weekSpend > s.weeklyPace;
              return (
                <tr key={s.subcategoryId} style={{ borderBottom: "1px solid #334155" }}>
                  <td style={{ padding: "8px 0" }}>{s.name}</td>
                  <td style={{ padding: "8px 0" }}>₦{s.weeklyPace.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td style={{ padding: "8px 0", color: over ? "#ef4444" : "#22c55e" }}>
                    ₦{s.weekSpend.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>
    );
  };

  return (
    <Html>
      <Head />
      <Preview>Your weekly budget check-in</Preview>
      <Body style={{ backgroundColor: "#0f172a", color: "#f8fafc", fontFamily: "sans-serif", padding: "20px" }}>
        <Container style={{ backgroundColor: "#1e293b", padding: "30px", borderRadius: "8px", maxWidth: "600px", margin: "0 auto" }}>
          <Heading as="h1" style={{ color: "#fff", borderBottom: "2px solid #38bdf8", paddingBottom: "10px" }}>
            Weekly Check-in — {periodLabel}
          </Heading>
          
          <Text style={{ fontSize: "16px", lineHeight: "1.5", color: "#cbd5e1" }}>
            {aiSummary}
          </Text>

          {renderWeeklySlices()}

          <Heading as="h2" style={{ color: "#fff", marginTop: "30px", marginBottom: "15px" }}>Month-to-Date Summary</Heading>
          {renderGroup("NEEDS (50%)", groups.NEEDS)}
          {renderGroup("SAVINGS & INVESTMENTS (20%)", groups.SAVINGS)}
          {renderGroup("WANTS (30%)", groups.WANTS)}

          <Section style={{ borderTop: "2px solid #38bdf8", paddingTop: "20px", marginTop: "20px", textAlign: "center" }}>
            <Text style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>
              Total spent this period: ₦{totalSpent.toLocaleString()} of ₦{totalIncome.toLocaleString()} allocated
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
