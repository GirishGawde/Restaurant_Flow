/**
 * src/pages/admin/Reports.jsx
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Screen 19: Reports
 * - Eyebrow: "19 / REPORTS"
 * - Title: "Sales & performance"
 * - Filters: Date range (Today, Last 7 days, Last 30 days) & Section (All, Main Hall, Terrace, Bar, Private Room)
 * - "Export CSV" button (builds and downloads CSV entirely in the browser)
 * - Four stat cards: Revenue, Orders & Avg Bill, Table turnover, Avg ticket time
 * - "Sales by day" bar chart built cleanly with SVG (zero external chart libraries)
 * - "Best sellers" table (Item, Category, Sold, Revenue)
 * - "Waiter performance" table (Waiter, Orders, Avg bill, Avg time)
 */

import React, { useState, useEffect, useCallback } from "react";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { fetchReports } from "../../api/admin";
import { formatMoney } from "../../utils/format";

const SECTIONS = ["All", "Main Hall", "Terrace", "Private Room", "Bar"];
const DATE_RANGES = [
  { value: "today", label: "Today" },
  { value: "7days", label: "Last 7 days" },
  { value: "30days", label: "Last 30 days" },
];

export function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7days");
  const [section, setSection] = useState("All");

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchReports({ dateRange, section });
      setData(res);
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, section]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Export CSV generator (runs purely client-side)
  const handleExportCSV = () => {
    if (!data) return;

    const summary = data.summary || {};
    const bestSellers = data.best_sellers || [];
    const waiters = data.waiter_performance || [];
    const salesByDay = data.sales_by_day || [];

    let csvContent = "data:text/csv;charset=utf-8,";

    // Summary Section
    csvContent += "REPORT SUMMARY\n";
    csvContent += `Date Range,${dateRange}\nSection,${section}\n`;
    csvContent += `Total Revenue,$${summary.revenue || 0}\nTotal Orders,${summary.total_orders || 0}\n`;
    csvContent += `Average Bill,$${summary.avg_bill || 0}\nTable Turnover,${summary.table_turnover || 0}x\n\n`;

    // Sales by Day
    csvContent += "SALES BY DAY\nDate,Day,Sales,Orders\n";
    salesByDay.forEach((d) => {
      csvContent += `${d.date},${d.label},${d.sales},${d.orders}\n`;
    });
    csvContent += "\n";

    // Best Sellers
    csvContent += "BEST SELLERS\nItem Name,Category,Units Sold,Revenue\n";
    bestSellers.forEach((item) => {
      csvContent += `"${item.name}",${item.category},${item.sold},${item.revenue}\n`;
    });
    csvContent += "\n";

    // Waiter Performance
    csvContent += "WAITER PERFORMANCE\nWaiter Name,Username,Orders,Avg Bill,Avg Ticket Minutes\n";
    waiters.forEach((w) => {
      csvContent += `"${w.name}",${w.username},${w.orders},${w.avg_bill},${w.avg_time_min}\n`;
    });

    // Trigger browser download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `restaurant_report_${dateRange}_${section}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = data?.summary || {};
  const salesByDay = data?.sales_by_day || [];
  const bestSellers = data?.best_sellers || [];
  const waiterPerf = data?.waiter_performance || [];

  // Calculate highest daily sale for bar chart scale
  const maxSale = salesByDay.length > 0 ? Math.max(...salesByDay.map((d) => d.sales)) : 5000;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "var(--spacing-xl)",
          flexWrap: "wrap",
          gap: "var(--spacing-md)",
        }}
      >
        <div>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--color-text-muted)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            19 / REPORTS
          </span>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-text-main)", marginTop: "2px" }}>
            Sales & performance
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem", marginTop: "2px" }}>
            Analyze restaurant revenue, popular menu items, and staff operational efficiency.
          </p>
        </div>

        {/* Filters & Export */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)", flexWrap: "wrap" }}>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              backgroundColor: "#FFFFFF",
              fontSize: "0.85rem",
              color: "var(--color-text-main)",
            }}
          >
            {DATE_RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              backgroundColor: "#FFFFFF",
              fontSize: "0.85rem",
              color: "var(--color-text-main)",
            }}
          >
            {SECTIONS.map((sec) => (
              <option key={sec} value={sec}>
                {sec === "All" ? "All Sections" : sec}
              </option>
            ))}
          </select>

          <Button variant="secondary" onClick={handleExportCSV} style={{ padding: "8px 14px", fontSize: "0.85rem" }}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--spacing-md)",
          marginBottom: "var(--spacing-lg)",
        }}
      >
        <Card padding="var(--spacing-md)">
          <span style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
            Total Revenue
          </span>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-primary)", margin: "4px 0" }}>
            {formatMoney(summary.revenue || 0)}
          </div>
          <div style={{ fontSize: "0.825rem", color: "var(--color-text-muted)" }}>
            Inclusive of sales tax
          </div>
        </Card>

        <Card padding="var(--spacing-md)">
          <span style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
            Orders Settled
          </span>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-text-main)", margin: "4px 0" }}>
            {summary.total_orders || 0}
          </div>
          <div style={{ fontSize: "0.825rem", color: "var(--color-text-muted)" }}>
            Average bill: <strong>{formatMoney(summary.avg_bill || 0)}</strong>
          </div>
        </Card>

        <Card padding="var(--spacing-md)">
          <span style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
            Table Turnover
          </span>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-text-main)", margin: "4px 0" }}>
            {summary.table_turnover || 0}x
          </div>
          <div style={{ fontSize: "0.825rem", color: "var(--color-text-muted)" }}>
            Average seatings per table / day
          </div>
        </Card>

        <Card padding="var(--spacing-md)">
          <span style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
            Avg Ticket Time
          </span>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-text-main)", margin: "4px 0" }}>
            {summary.avg_ticket_minutes || 0}m
          </div>
          <div style={{ fontSize: "0.825rem", color: "var(--color-text-muted)" }}>
            Order sent to ready across stations
          </div>
        </Card>
      </div>

      {/* Sales By Day Chart (Pure SVG) */}
      <Card
        title="Sales by day"
        subtitle="Daily revenue volume over selected period"
        style={{ marginBottom: "var(--spacing-lg)" }}
      >
        <div style={{ width: "100%", height: "240px", marginTop: "var(--spacing-md)" }}>
          <svg width="100%" height="100%" viewBox="0 0 700 200" preserveAspectRatio="none">
            {/* Horizontal guide lines */}
            <line x1="0" y1="40" x2="700" y2="40" stroke="#ECEAE4" strokeDasharray="3 3" />
            <line x1="0" y1="100" x2="700" y2="100" stroke="#ECEAE4" strokeDasharray="3 3" />
            <line x1="0" y1="160" x2="700" y2="160" stroke="#DDDAD3" />

            {/* Bars */}
            {salesByDay.map((d, index) => {
              const totalBars = salesByDay.length || 7;
              const barWidth = 44;
              const slotWidth = 700 / totalBars;
              const x = index * slotWidth + (slotWidth - barWidth) / 2;
              const heightFraction = maxSale > 0 ? d.sales / maxSale : 0.5;
              const barHeight = Math.max(8, heightFraction * 130);
              const y = 160 - barHeight;

              return (
                <g key={d.date || index}>
                  {/* Bar */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx="4"
                    fill="var(--color-primary)"
                    opacity="0.9"
                  >
                    <title>{`${d.label} (${d.date}): ${formatMoney(d.sales)} (${d.orders} orders)`}</title>
                  </rect>

                  {/* Value on top of bar */}
                  <text
                    x={x + barWidth / 2}
                    y={y - 6}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="600"
                    fill="#1B1B1B"
                  >
                    ${d.sales >= 1000 ? `${(d.sales / 1000).toFixed(1)}k` : d.sales}
                  </text>

                  {/* Label below axis */}
                  <text
                    x={x + barWidth / 2}
                    y="182"
                    textAnchor="middle"
                    fontSize="12"
                    fill="#6B6860"
                  >
                    {d.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </Card>

      {/* Two Column Breakdown Tables */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "var(--spacing-lg)" }}>
        {/* Best Sellers Table */}
        <Card title="Best sellers" subtitle="Highest grossing dishes and beverages">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--color-bg-page)", borderBottom: "1px solid var(--color-border)" }}>
                  <th style={{ padding: "8px 10px", textAlign: "left", color: "var(--color-text-muted)" }}>Item</th>
                  <th style={{ padding: "8px 10px", textAlign: "left", color: "var(--color-text-muted)" }}>Category</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", color: "var(--color-text-muted)" }}>Sold</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", color: "var(--color-text-muted)" }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {bestSellers.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                    <td style={{ padding: "10px", fontWeight: 600 }}>{item.name}</td>
                    <td style={{ padding: "10px", color: "var(--color-text-muted)" }}>{item.category}</td>
                    <td style={{ padding: "10px", textAlign: "right" }}>{item.sold}</td>
                    <td style={{ padding: "10px", textAlign: "right", fontWeight: 600 }}>
                      {formatMoney(item.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Waiter Performance Table */}
        <Card title="Waiter performance" subtitle="Order turnover and service metrics by waitstaff">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--color-bg-page)", borderBottom: "1px solid var(--color-border)" }}>
                  <th style={{ padding: "8px 10px", textAlign: "left", color: "var(--color-text-muted)" }}>Waiter</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", color: "var(--color-text-muted)" }}>Orders</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", color: "var(--color-text-muted)" }}>Avg bill</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", color: "var(--color-text-muted)" }}>Avg time</th>
                </tr>
              </thead>
              <tbody>
                {waiterPerf.map((w, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                    <td style={{ padding: "10px", fontWeight: 600 }}>
                      <div>{w.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 400 }}>
                        @{w.username}
                      </div>
                    </td>
                    <td style={{ padding: "10px", textAlign: "right" }}>{w.orders}</td>
                    <td style={{ padding: "10px", textAlign: "right", fontWeight: 600 }}>
                      {formatMoney(w.avg_bill)}
                    </td>
                    <td style={{ padding: "10px", textAlign: "right", color: "var(--color-text-muted)" }}>
                      {w.avg_time_min}m
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Reports;
